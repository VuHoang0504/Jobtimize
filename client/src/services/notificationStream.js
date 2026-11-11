import api from './api';

// Fetch-based SSE keeps the existing bearer authentication; tokens never enter URLs.
export function subscribeNotifications(onChange) {
  if (typeof window.fetch !== 'function') return () => {};
  let stopped = false, controller, timer, connecting = false, delay = 3000;
  async function connect() {
    if (stopped || connecting || document.hidden) return;
    const token = localStorage.getItem('jobtimize_token');
    if (!token) return;
    connecting = true;
    const request = new AbortController(); controller = request;
    let reader;
    try {
      const base = (api.defaults?.baseURL || '/api').replace(/\/$/, '');
      const response = await window.fetch(`${base}/notifications/stream`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream', 'ngrok-skip-browser-warning': 'true' }, signal: request.signal
      });
      if (stopped || request.signal.aborted) return;
      if (response.status === 401 || response.status === 403) {
        // A late response must not permanently stop realtime after a token change.
        if (localStorage.getItem('jobtimize_token') && localStorage.getItem('jobtimize_token') !== token) delay = 0;
        else { stopped = true; onChange(); }
        return;
      }
      if (!response.ok || !response.headers.get('content-type')?.includes('text/event-stream') || !response.body) throw new Error('Stream unavailable');
      delay = 3000;
      reader = response.body.getReader();
      const decoder = new TextDecoder(); let buffer = '';
      while (!stopped && !request.signal.aborted) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true }).replace(/\r/g, '');
        if (buffer.length > 65536) throw new Error('Invalid stream');
        let end;
        while ((end = buffer.indexOf('\n\n')) !== -1) {
          const frame = buffer.slice(0, end); buffer = buffer.slice(end + 2);
          if (frame.split('\n').some(line => /^event: (notifications-changed|connected)$/.test(line))) onChange();
        }
      }
    } catch { /* Existing inbox polling remains available during connection failures. */ }
    finally {
      reader?.releaseLock();
      if (controller === request) controller = null;
      connecting = false;
      if (!stopped && !document.hidden) {
        clearTimeout(timer); timer = setTimeout(connect, delay);
        delay = Math.min(delay * 2, 30000);
      }
    }
  }
  const resume = () => {
    clearTimeout(timer);
    if (document.hidden) controller?.abort();
    else if (!connecting) void connect();
  };
  document.addEventListener('visibilitychange', resume);
  window.addEventListener('online', resume);
  void connect();
  return () => {
    stopped = true; clearTimeout(timer); controller?.abort();
    document.removeEventListener('visibilitychange', resume); window.removeEventListener('online', resume);
  };
}
