import React from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
export default function AuthNotice() {
  const { authNotice, dismissAuthNotice } = useAuth();
  if (!authNotice) return null;
  return <div role="status" className="fixed top-20 right-4 z-[100] max-w-sm flex items-center gap-3 rounded-xl border border-emerald-200 bg-white p-4 shadow-lg text-sm text-emerald-800">
    <CheckCircle2 className="w-5 h-5 shrink-0" /><span>{authNotice}</span>
    <button type="button" aria-label="Đóng thông báo" onClick={dismissAuthNotice}><X className="w-4 h-4" /></button>
  </div>;
}
