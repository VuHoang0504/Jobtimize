import React, { useEffect, useRef, useState } from 'react';
import useJobCategories from '../../hooks/useJobCategories';
import api from '../../services/api';

export default function JobNotificationSettings({ onCancel, onSaved }) {
  const { categories, loading: loadingCategories, error: categoryError } = useJobCategories();
  const [preferences, setPreferences] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    request.current = controller;
    api.get('/notifications/job-preferences', { signal: controller.signal, timeout: 10000 })
      .then(({ data }) => {
        if (!controller.signal.aborted) setPreferences(data.data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('Chưa tải được cài đặt. Hãy mở lại mục này để thử lại.');
      });
    return () => controller.abort();
  }, []);

  function toggleCategory(id, checked) {
    setPreferences(previous => ({
      ...previous,
      categoryIds: checked ? [...previous.categoryIds, id] : previous.categoryIds.filter(value => value !== id)
    }));
  }

  async function save(event) {
    event.preventDefault();
    if (!preferences || saving || loadingCategories || categoryError) return;
    const signal = request.current.signal;
    setSaving(true);
    setError('');
    try {
      await api.put('/notifications/job-preferences', preferences, { signal, timeout: 10000 });
      if (!signal.aborted) onSaved();
    } catch (err) {
      if (!signal.aborted) setError(err.response?.data?.message || 'Chưa lưu được cài đặt. Vui lòng thử lại.');
    } finally {
      if (!signal.aborted) setSaving(false);
    }
  }

  return <form onSubmit={save} className="flex min-h-0 flex-col">
    <div className="min-h-0 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {!preferences && !error && <p role="status" className="text-sm text-slate-500">Đang tải cài đặt…</p>}
      {preferences && <>
        <label className="relative flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
          <span className="text-sm font-semibold text-slate-900">Nhận gợi ý việc làm</span>
          <input type="checkbox" role="switch" checked={preferences.enabled} disabled={saving}
            onChange={event => setPreferences({ ...preferences, enabled: event.target.checked })}
            className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-default" />
          <span aria-hidden="true" className="relative h-6 w-11 shrink-0 rounded-full bg-slate-400 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:content-[''] peer-checked:bg-blue-700 peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-600 peer-focus-visible:ring-offset-2" />
        </label>
        {categoryError && <p role="alert" className="text-sm text-red-700">{categoryError}</p>}
        {loadingCategories && <p role="status" className="text-sm text-slate-500">Đang tải danh mục ngành nghề…</p>}
        {!categoryError && !loadingCategories && <fieldset disabled={!preferences.enabled || saving} className="min-w-0 space-y-3 disabled:opacity-50">
          <legend className="text-sm font-semibold text-slate-900">Ngành nghề muốn nhận</legend>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <p className="text-slate-600">{preferences.categoryIds.length
              ? `Đã chọn ${preferences.categoryIds.length} ngành nghề` : 'Mọi ngành nghề phù hợp với CV mặc định'}</p>
            {preferences.categoryIds.length > 0 && <button type="button"
              onClick={() => setPreferences({ ...preferences, categoryIds: [] })}
              className="font-semibold text-blue-700 hover:underline">Chọn tất cả</button>}
          </div>
          <div className="grid gap-1.5">
            {categories.map(({ CategoryID, CategoryName }) => <label key={CategoryID}
              className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 has-[:checked]:border-blue-200 has-[:checked]:bg-blue-50">
              <input type="checkbox" aria-label={CategoryName} checked={preferences.categoryIds.includes(CategoryID)}
                onChange={event => toggleCategory(CategoryID, event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-blue-700" />
              <span>{CategoryName}</span>
            </label>)}
          </div>
        </fieldset>}
      </>}
    </div>
    <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:px-5">
      <button type="button" onClick={onCancel} disabled={saving} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50">Quay lại</button>
      <button type="submit" disabled={!preferences || saving || loadingCategories || Boolean(categoryError)}
        className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">
        {saving ? 'Đang lưu…' : 'Lưu cài đặt'}
      </button>
    </div>
  </form>;
}
