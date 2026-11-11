const { EventEmitter } = require('events');

// Signals contain no notification content. Clients reload their authenticated inbox.
const events = new EventEmitter();
const listeners = new Map();
const identity = (userId, role) => `${userId}:${role}`;

function publish(userId, role) {
  for (const response of listeners.get(identity(userId, role)) || []) {
    try {
      if (!response.write('event: notifications-changed\ndata: {}\n\n')) response.end();
    } catch { try { response.end(); } catch {} }
  }
}

function stream(req, res) {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.flushHeaders();
  res.write('retry: 3000\nevent: connected\ndata: {}\n\n');
  const key = identity(req.user.userId, req.user.role);
  if (!listeners.has(key)) listeners.set(key, new Set());
  const group = listeners.get(key);
  group.add(res);
  // Bound connections per account, and periodically reauthenticate on reconnect.
  if (group.size > 5) group.values().next().value.end();
  const heartbeat = setInterval(() => { try { res.write(': heartbeat\n\n'); } catch { res.end(); } }, 15000);
  const lifetime = setTimeout(() => res.end(), 120000);
  heartbeat.unref(); lifetime.unref();
  res.on('close', () => {
    clearInterval(heartbeat); clearTimeout(lifetime);
    group.delete(res);
    if (!group.size) listeners.delete(key);
  });
}

const wakeWorker = () => events.emit('outbox');
function onOutbox(listener) {
  events.on('outbox', listener);
  return () => events.off('outbox', listener);
}

module.exports = { publish, stream, wakeWorker, onOutbox };
