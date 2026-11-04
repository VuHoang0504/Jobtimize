import React, { useState } from 'react';

const DAY = 86400000;
const PRESETS = [
  ['7d', '1 tuần'],
  ['30d', '1 tháng'],
  ['3m', '3 tháng'],
  ['6m', '6 tháng'],
  ['1y', '1 năm']
];

export function getTodayVietnam() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function shiftMonthsFromDate(year, month, day, deltaMonths) {
  const targetFirst = new Date(Date.UTC(year, month - 1 + deltaMonths, 1));
  const maxDay = new Date(Date.UTC(targetFirst.getUTCFullYear(), targetFirst.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(targetFirst.getUTCFullYear(), targetFirst.getUTCMonth(), Math.min(day, maxDay)));
}

export function rangeForMode(mode, todayStr = getTodayVietnam()) {
  const [year, month, day] = todayStr.split('-').map(Number);
  const today = new Date(Date.UTC(year, month - 1, day));
  let from;
  if (mode === '7d') {
    from = new Date(today.getTime() - 7 * DAY);
  } else if (mode === '30d') {
    from = shiftMonthsFromDate(year, month, day, -1);
  } else if (mode === '3m') {
    from = shiftMonthsFromDate(year, month, day, -3);
  } else if (mode === '6m') {
    from = shiftMonthsFromDate(year, month, day, -6);
  } else if (mode === '1y') {
    from = shiftMonthsFromDate(year, month, day, -12);
  } else {
    from = today;
  }
  return { fromDate: from.toISOString().slice(0, 10), toDate: todayStr };
}

export default function AdminReportPeriod({ onApply, disabled }) {
  const [value, setValue] = useState(() => {
    const today = getTodayVietnam();
    return { timeRange: '6m', ...rangeForMode('6m', today) };
  });
  const [error, setError] = useState('');
  const handlePresetChange = nextMode => {
    setError('');
    if (nextMode !== 'custom') {
      const nextRange = rangeForMode(nextMode, getTodayVietnam());
      setValue({ timeRange: nextMode, ...nextRange });
      if (!disabled) {
        onApply({ timeRange: 'custom', fromDate: nextRange.fromDate, toDate: nextRange.toDate });
      }
    } else {
      setValue(old => ({ ...old, timeRange: 'custom' }));
    }
  };
  const updateDate = (key, next) => {
    setError('');
    setValue(old => ({ ...old, timeRange: 'custom', [key]: next }));
  };
  const input = (key, label) => <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-gray-700">
    <span>{label}</span>
    <input aria-label={label} className="h-10 w-full min-w-0 max-w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" type="date" value={value[key]} required
      min={key === 'toDate' ? value.fromDate : '2000-01-01'}
      max="2100-12-31"
      aria-invalid={!!error} aria-describedby={error ? 'admin-period-error' : undefined}
      onChange={event => updateDate(key, event.target.value)} />
  </label>;
  const submit = event => {
    event.preventDefault();
    if (disabled) return;
    if (value.fromDate > value.toDate) { setError('Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.'); return; }
    onApply({ timeRange: 'custom', fromDate: value.fromDate, toDate: value.toDate });
  };
  return <form aria-label="Bộ lọc thời gian báo cáo" className="grid w-full min-w-0 items-end gap-3 text-xs sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]" onSubmit={submit}>
    <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-gray-700">
      <span>Thời gian</span>
      <select aria-label="Kiểu thời gian báo cáo" value={value.timeRange} onChange={event => handlePresetChange(event.target.value)} className="h-10 w-full min-w-0 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
        {PRESETS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        {value.timeRange === 'custom' && <option value="custom">Tùy chỉnh khoảng ngày</option>}
      </select>
    </label>
    {input('fromDate', 'Từ ngày:')}
    {input('toDate', 'Đến ngày:')}
    <button disabled={disabled} type="submit" className="inline-flex h-10 min-w-0 items-center justify-center whitespace-nowrap rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">Áp dụng</button>
    {error && <p id="admin-period-error" role="alert" className="min-w-0 text-xs text-rose-700 sm:col-span-full">{error}</p>}
  </form>;
}
