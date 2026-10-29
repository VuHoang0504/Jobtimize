import React, { useState } from 'react';

export default function AdminReportPeriod({ onApply, disabled }) {
  const [value, setValue] = useState(() => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    return { timeRange: '6m', date: today, month: today.slice(0, 7), year: today.slice(0, 4), fromDate: today, toDate: today };
  });
  const [error, setError] = useState('');
  const custom = value.timeRange === 'custom';
  const specific = ['day', 'month', 'year'].includes(value.timeRange);
  const columns = custom
    ? 'sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]'
    : specific ? 'sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] max-w-3xl'
      : 'sm:grid-cols-[minmax(0,1fr)_auto] max-w-md';
  const update = (key, next) => { setError(''); setValue(old => ({ ...old, [key]: next })); };
  const input = (key, type, label) => <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-gray-700">
    <span>{label}</span>
    <input aria-label={label} className="h-10 w-full min-w-0 max-w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" type={type} value={value[key]} required
      min={key === 'year' ? 2000 : key === 'month' ? '2000-01' : key === 'toDate' ? value.fromDate : '2000-01-01'}
      max={key === 'year' ? 2100 : key === 'month' ? '2100-12' : '2100-12-31'}
      aria-invalid={custom && !!error} aria-describedby={custom && error ? 'admin-period-error' : undefined}
      onChange={event => update(key, event.target.value)} />
  </label>;
  const submit = event => {
    event.preventDefault();
    if (disabled) return;
    if (custom && value.fromDate > value.toDate) { setError('Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.'); return; }
    const keys = { day: ['date'], month: ['month'], year: ['year'], custom: ['fromDate', 'toDate'] }[value.timeRange] || [];
    onApply({ timeRange: value.timeRange, ...Object.fromEntries(keys.map(key => [key, value[key]])) });
  };
  return <form aria-label="Bộ lọc thời gian báo cáo" className={`grid w-full min-w-0 items-end gap-3 text-xs ${columns}`} onSubmit={submit}>
    <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-gray-700">
      <span>Thời gian</span>
      <select aria-label="Kiểu thời gian báo cáo" value={value.timeRange} onChange={event => update('timeRange', event.target.value)} className="h-10 w-full min-w-0 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
        {[['7d', '7 ngày'], ['30d', '30 ngày'], ['6m', '6 tháng'], ['1y', '12 tháng'], ['day', 'Ngày cụ thể'], ['month', 'Tháng cụ thể'], ['year', 'Năm cụ thể'], ['custom', 'Khoảng ngày']].map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>
    </label>
    {value.timeRange === 'day' && input('date', 'date', 'Ngày')}
    {value.timeRange === 'month' && input('month', 'month', 'Tháng')}
    {value.timeRange === 'year' && input('year', 'number', 'Năm')}
    {value.timeRange === 'custom' && <>{input('fromDate', 'date', 'Từ ngày')}{input('toDate', 'date', 'Đến hết ngày')}</>}
    <button disabled={disabled} type="submit" className="inline-flex h-10 min-w-0 items-center justify-center whitespace-nowrap rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">Áp dụng</button>
    {error && <p id="admin-period-error" role="alert" className="min-w-0 text-xs text-rose-700 sm:col-span-full">{error}</p>}
  </form>;
}
