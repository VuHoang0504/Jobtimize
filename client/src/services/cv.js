import api from './api';

export async function openProtectedCV(url) {
  const preview = window.open('about:blank', '_blank');
  try {
    const response = await api.get(url.replace(/^\/api/, ''), { responseType: 'blob', timeout: 60000 });
    const blob = URL.createObjectURL(response.data);
    if (preview) { preview.opener = null; preview.location.href = blob; }
    else { const a = document.createElement('a'); a.href = blob; a.download = 'CV.pdf'; a.click(); }
    setTimeout(() => URL.revokeObjectURL(blob), 120000);
  } catch {
    preview?.close();
    window.alert('Không mở được CV hoặc bạn không có quyền xem bản này.');
  }
}

export async function downloadCV(payload) {
  try {
    const response = await api.post('/candidate/cv/export', payload, { responseType: 'blob', timeout: 60000 });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${payload.title.replace(/[\\/:*?"<>|]/g, '-')}.pdf`;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch (error) {
    let message = 'Tạo PDF thất bại. Nội dung vẫn được giữ; bạn có thể thử lại.';
    try { if (error.response?.data instanceof Blob) message = JSON.parse(await error.response.data.text()).message || message; } catch { /* Keep actionable fallback. */ }
    throw new Error(message);
  }
}
