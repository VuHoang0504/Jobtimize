import React, { useRef, useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import api from '../../services/api';
import useRecruitmentDialog from '../common/useRecruitmentDialog';

export default function DeleteKYCModal({ employer, onCancel, onDeleted }) {
  const dialog = useRecruitmentDialog();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const documentCount = employer.KycDocumentCount ?? (employer.LatestKycDocumentID ? 1 : 0);
  async function remove(event) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true); setError('');
    try {
      const response = await api.delete(`/admin/employers/${employer.EmployerID}/kyc`, {
        data: { expectedDocumentId: employer.LatestKycDocumentID || null }
      });
      if (!response.data?.success) throw new Error(response.data?.message || 'Chưa xóa được hồ sơ KYC.');
      setBusy(false);
      inFlight.current = false;
      onDeleted(response.data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Chưa xóa được hồ sơ KYC. Vui lòng thử lại.');
      setBusy(false);
      inFlight.current = false;
    }
  }
  return <dialog ref={dialog} aria-labelledby="delete-kyc-title" aria-describedby="delete-kyc-description"
    onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}
    className="m-auto w-[calc(100%_-_2rem)] max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl backdrop:bg-black/50">
    <form onSubmit={remove}>
      <div className="flex items-center gap-3">
        <AlertTriangle aria-hidden="true" className="h-6 w-6 shrink-0 text-rose-600" />
        <h2 id="delete-kyc-title" className="text-xl font-semibold text-slate-900">{documentCount ? 'Xóa hồ sơ KYC?' : 'Xóa xác minh KYC?'}</h2>
      </div>
      <div id="delete-kyc-description" className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
        {documentCount ? <p>Xóa toàn bộ {documentCount} lần nộp hồ sơ và giấy tờ KYC của <strong className="text-slate-900">{employer.CompanyName}</strong>.</p>
          : <p>Gỡ trạng thái xác minh KYC của <strong className="text-slate-900">{employer.CompanyName}</strong>. Doanh nghiệp này chưa có giấy tờ KYC được lưu.</p>}
        <p>Doanh nghiệp sẽ về trạng thái chưa xác minh và cần nộp lại hồ sơ. Không thể hoàn tác thao tác này.</p>
        <p>Tài khoản, tin tuyển dụng và gói dịch vụ vẫn được giữ.</p>
      </div>
      {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button type="button" autoFocus disabled={busy} onClick={onCancel}
          className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-500 disabled:opacity-50">Giữ hồ sơ</button>
        <button type="submit" disabled={busy}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 disabled:opacity-50">
          <Trash2 aria-hidden="true" className="h-4 w-4" />{busy ? 'Đang xóa…' : 'Xóa hồ sơ KYC'}
        </button>
      </div>
    </form>
  </dialog>;
}
