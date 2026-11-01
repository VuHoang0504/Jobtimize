import React, { useId, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function AccountPasswordForm() {
  const { user, setUser } = useAuth();
  const id = useId();
  const hasPassword = user?.hasPassword !== false;
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const submit = async event => {
    event.preventDefault(); setFeedback(null);
    if (password !== confirmation) { setFeedback({ error: true, text: 'Mật khẩu xác nhận chưa khớp.' }); return; }
    if (password.length < 6 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) { setFeedback({ error: true, text: 'Mật khẩu cần ít nhất 6 ký tự, gồm chữ hoa và chữ số.' }); return; }
    setBusy(true);
    try {
      const { data } = await api.post('/auth/change-password', { newPassword: password, ...(hasPassword ? { currentPassword: current } : {}) });
      setUser(previous => ({ ...previous, hasPassword: true }));
      setCurrent(''); setPassword(''); setConfirmation('');
      setFeedback({ text: data.message });
    } catch (error) { setFeedback({ error: true, text: error.response?.data?.message || 'Chưa lưu được mật khẩu. Vui lòng thử lại.' }); }
    finally { setBusy(false); }
  };
  const field = 'mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-2 focus:outline-blue-700 focus:outline-offset-2 disabled:bg-slate-50';
  return <section aria-labelledby={`${id}-title`} className="rounded-xl border border-slate-200 bg-white p-6">
    <h2 id={`${id}-title`} className="text-lg font-semibold text-slate-900">{hasPassword ? 'Đổi mật khẩu' : 'Tạo mật khẩu'}</h2>
    <p className="mt-2 text-sm leading-6 text-slate-600">{hasPassword ? 'Nhập mật khẩu hiện tại để cập nhật mật khẩu đăng nhập.' : 'Tài khoản Google của bạn chưa có mật khẩu. Tạo mật khẩu để đăng nhập bằng email và mật khẩu; bạn vẫn có thể dùng Google.'}</p>
    {feedback && <p role={feedback.error ? 'alert' : 'status'} className={`mt-4 rounded-md p-3 text-sm leading-6 ${feedback.error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'}`}>{feedback.text}</p>}
    <form onSubmit={submit} className="mt-5 max-w-lg space-y-4">
      {hasPassword && <div><label htmlFor={`${id}-current`} className="text-sm font-medium text-slate-700">Mật khẩu hiện tại</label><input id={`${id}-current`} autoComplete="current-password" type={show ? 'text' : 'password'} required disabled={busy} value={current} onChange={event => setCurrent(event.target.value)} className={field} /></div>}
      <div><label htmlFor={`${id}-new`} className="text-sm font-medium text-slate-700">Mật khẩu mới</label><input id={`${id}-new`} autoComplete="new-password" type={show ? 'text' : 'password'} required minLength={6} maxLength={72} disabled={busy} value={password} onChange={event => setPassword(event.target.value)} className={field} /><p className="mt-2 text-xs leading-5 text-slate-500">Ít nhất 6 ký tự, gồm một chữ hoa và một chữ số.</p></div>
      <div><label htmlFor={`${id}-confirm`} className="text-sm font-medium text-slate-700">Xác nhận mật khẩu mới</label><input id={`${id}-confirm`} autoComplete="new-password" type={show ? 'text' : 'password'} required minLength={6} maxLength={72} disabled={busy} value={confirmation} onChange={event => setConfirmation(event.target.value)} className={field} /></div>
      <label className="flex w-fit items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={show} onChange={event => setShow(event.target.checked)} />Hiện mật khẩu</label>
      <button type="submit" disabled={busy} className="rounded-md bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-50">{busy ? 'Đang lưu...' : hasPassword ? 'Đổi mật khẩu' : 'Tạo mật khẩu'}</button>
    </form>
  </section>;
}
