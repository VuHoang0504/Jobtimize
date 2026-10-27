import React, { useEffect, useRef, useState } from 'react';
import api from '../../services/api';

export default function CVAvatarDialog({ file, onClose, onUploaded }) {
  const [source, setSource] = useState('');
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dimensions, setDimensions] = useState({ width: 1, height: 1 });
  const [loaded, setLoaded] = useState(false);
  const image = useRef(null);
  const dialog = useRef(null);
  const drag = useRef(null);
  useEffect(() => {
    const url = URL.createObjectURL(file); setSource(url);
    const previous = document.activeElement; dialog.current.showModal();
    return () => { URL.revokeObjectURL(url); previous?.focus?.(); };
  }, [file]);
  const side = Math.min(dimensions.width, dimensions.height) / zoom;
  const rect = { side, x: (dimensions.width - side) * position.x / 100, y: (dimensions.height - side) * position.y / 100 };
  async function submit() {
    setBusy(true); setError('');
    try {
      const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 640;
      canvas.getContext('2d').drawImage(image.current, rect.x, rect.y, rect.side, rect.side, 0, 0, 640, 640);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', .9));
      if (!blob) throw new Error('Không thể đọc ảnh này.');
      const body = new FormData(); body.append('avatar', blob, 'cv-avatar.webp');
      const response = await api.post('/candidate/cv/avatar', body, { headers: { 'Content-Type': 'multipart/form-data' } });
      onUploaded(response.data.data.url); onClose();
    } catch (err) { setError(err.response?.data?.message || err.message || 'Tải ảnh thất bại. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  }
  return <dialog ref={dialog} className="cv-avatar-dialog" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} aria-labelledby="cv-avatar-heading">
    <h2 id="cv-avatar-heading">Căn chỉnh ảnh CV</h2><p>Kéo ảnh để chọn vị trí. Ảnh này chỉ sử dụng cho CV.</p>
    <div className="cv-crop" onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); drag.current = { startX: event.clientX, startY: event.clientY, ...position }; }}
      onPointerMove={event => { if (!drag.current) return; setPosition({ x: Math.max(0, Math.min(100, drag.current.x - (event.clientX - drag.current.startX) * .3)), y: Math.max(0, Math.min(100, drag.current.y - (event.clientY - drag.current.startY) * .3)) }); }}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
      <img ref={image} src={source} alt="Xem trước vùng cắt" draggable={false} onLoad={event => { setDimensions({ width: event.target.naturalWidth, height: event.target.naturalHeight }); setLoaded(true); }}
        onError={() => { setLoaded(false); setError('Không đọc được ảnh. Hãy chọn ảnh khác.'); }}
        style={{ position: 'absolute', width: dimensions.width / side * 280, height: dimensions.height / side * 280, maxWidth: 'none', left: -rect.x / side * 280, top: -rect.y / side * 280 }} />
    </div>
    <label>Phóng to <input type="range" min="1" max="3" step="0.05" value={zoom} onChange={event => setZoom(Number(event.target.value))} /></label>
    <label>Vị trí ngang <input type="range" min="0" max="100" value={position.x} onChange={event => setPosition(p => ({ ...p, x: Number(event.target.value) }))} /></label>
    <label>Vị trí dọc <input type="range" min="0" max="100" value={position.y} onChange={event => setPosition(p => ({ ...p, y: Number(event.target.value) }))} /></label>
    {error && <p role="alert" className="cv-error">{error}</p>}
    <div className="cv-dialog-actions"><button type="button" onClick={onClose} disabled={busy}>Hủy</button><button type="button" className="cv-primary" onClick={submit} disabled={busy || !loaded}>{busy ? 'Đang tải ảnh…' : 'Sử dụng ảnh'}</button></div>
  </dialog>;
}
