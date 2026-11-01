import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import AccountPasswordForm from '../../components/common/AccountPasswordForm';

const fields = { fullName: 'FullName', phone: 'Phone', companyName: 'CompanyName', website: 'Website', companySize: 'CompanySize', address: 'Address', description: 'Description', companyLogoUrl: 'CompanyLogoUrl' };
export default function EmployerSettingsPage() {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    api.get('/employer/profile', { signal: controller.signal }).then(({ data }) => {
      if (controller.signal.aborted) return;
      setProfile(data.data); setForm(Object.fromEntries(Object.entries(fields).map(([key, column]) => [key, data.data[column] || ''])));
    }).catch(error => { if (!controller.signal.aborted) setError(error.response?.data?.message || 'Chưa tải được hồ sơ. Vui lòng thử lại.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);
  const save = async event => {
    event.preventDefault(); setSaving(true); setError(''); setSuccess('');
    try {
      const { data } = await api.put('/employer/profile', form);
      setProfile(data.data);
      setForm(Object.fromEntries(Object.entries(fields).map(([key, column]) => [key, data.data[column] || ''])));
      setUser(previous => ({ ...previous, fullName: data.data.FullName, phone: data.data.Phone, profile: data.data }));
      setSuccess('Đã lưu hồ sơ doanh nghiệp.');
    } catch (error) { setError(error.response?.data?.message || 'Chưa lưu được hồ sơ. Vui lòng thử lại.'); }
    finally { setSaving(false); }
  };
  const input = (name, label, options = {}) => <div className={options.wide ? 'sm:col-span-2' : ''}><label htmlFor={`employer-${name}`} className="text-sm font-medium text-slate-700">{label}</label><input id={`employer-${name}`} value={form[name] || ''} onChange={event => { setForm({ ...form, [name]: event.target.value }); setSuccess(''); }} disabled={saving} required={options.required} type={options.type || 'text'} maxLength={options.maxLength} autoComplete={options.autoComplete} placeholder={options.placeholder} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:outline-2 focus:outline-blue-700 focus:outline-offset-2 disabled:bg-slate-50" /></div>;
  const status = profile?.KYCStatus === 'Approved' ? 'Đã xác thực' : profile?.KYCStatus === 'Rejected' ? 'Hồ sơ xác thực bị từ chối' : profile?.HasKycDocument ? 'Hồ sơ đang chờ duyệt' : 'Chưa xác thực';
  return <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <header className="mb-7 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold tracking-tight text-slate-900">Hồ sơ & bảo mật</h1><p className="mt-2 text-sm leading-6 text-slate-600">Cập nhật thông tin liên hệ và giới thiệu doanh nghiệp với ứng viên.</p></div><Link to="/employer/dashboard" className="text-sm font-medium text-blue-700 underline underline-offset-4">Quản lý tuyển dụng</Link></header>
    {error && <div role="alert" className="mb-5 rounded-md bg-red-50 p-4 text-sm text-red-700">{error}{!profile && <button type="button" onClick={() => setRetry(value => value + 1)} className="ml-4 underline">Thử lại</button>}</div>}
    {loading ? <p role="status" className="text-sm text-slate-600">Đang tải hồ sơ...</p> : profile && <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0 space-y-6"><form onSubmit={save} className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Thông tin liên hệ</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">{input('fullName', 'Họ tên người liên hệ', { required: true, maxLength: 100, autoComplete: 'name' })}{input('phone', 'Số điện thoại', { type: 'tel', maxLength: 20, autoComplete: 'tel' })}<div className="sm:col-span-2"><label htmlFor="employer-email" className="text-sm font-medium text-slate-700">Email đăng nhập</label><input id="employer-email" value={profile.Email || user?.email || ''} readOnly className="mt-2 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500" /></div></div>
        <h2 className="mt-8 border-t border-slate-200 pt-6 text-lg font-semibold text-slate-900">Thông tin doanh nghiệp</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">{input('companyName', 'Tên doanh nghiệp', { required: true, maxLength: 200, wide: true, autoComplete: 'organization' })}{input('website', 'Website', { type: 'url', maxLength: 255, placeholder: 'https://congty.vn' })}{input('companySize', 'Quy mô nhân sự', { maxLength: 50, placeholder: 'Ví dụ: 50–100 nhân viên' })}{input('address', 'Địa chỉ', { maxLength: 2000, wide: true, autoComplete: 'street-address' })}{input('companyLogoUrl', 'Liên kết logo doanh nghiệp', { maxLength: 500, wide: true })}<div className="sm:col-span-2"><label htmlFor="employer-description" className="text-sm font-medium text-slate-700">Giới thiệu doanh nghiệp</label><textarea id="employer-description" rows={5} maxLength={10000} disabled={saving} value={form.description || ''} onChange={event => setForm({ ...form, description: event.target.value })} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm leading-6 focus:outline-2 focus:outline-blue-700 focus:outline-offset-2" /></div></div>
        {success && <p role="status" className="mt-5 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
        <div className="mt-6 flex flex-wrap items-center gap-4"><button disabled={saving} type="submit" className="rounded-md bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu hồ sơ'}</button><p className="text-xs leading-5 text-slate-500">Thông tin doanh nghiệp được hiển thị trên tin tuyển dụng.</p></div>
      </form><AccountPasswordForm /></div>
      <aside className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-base font-semibold text-slate-900">Xác thực doanh nghiệp</h2><p className={`mt-4 text-sm font-semibold ${profile.KYCStatus === 'Approved' ? 'text-emerald-700' : 'text-amber-800'}`}>{status}</p><p className="mt-3 text-sm leading-6 text-slate-600">Doanh nghiệp được xác thực sau khi hồ sơ pháp lý được quản trị viên duyệt.</p><Link to="/employer/dashboard?section=kyc" className="mt-5 inline-block text-sm font-medium text-blue-700 underline underline-offset-4">Xem hồ sơ pháp lý</Link></aside>
    </div>}
  </main>;
}
