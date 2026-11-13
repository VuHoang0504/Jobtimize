import React, { useEffect, useId, useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import ReportCalendar from './ReportCalendar';

const DAY = 86400000;
const MIN_DATE = '2000-01-01';
const MAX_DATE = '2100-12-31';
const control = 'h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500';
const isSupportedDate = date => date.length === 10 && date >= MIN_DATE && date <= MAX_DATE;
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
    from = new Date(today.getTime() - 6 * DAY);
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

export default function AdminReportPeriod({ onApply }) {
  const [value, setValue] = useState(() => ({ timeRange: '6m', ...rangeForMode('6m') }));
  const [error, setError] = useState('');
  const [openCalendar, setOpenCalendar] = useState(null);
  const form = useRef(null);
  const trigger = useRef(null);
  const id = useId();
  const errorId = `${id}-error`;

  useEffect(() => {
    if (!openCalendar) return;
    function dismissOutside(event) {
      if (!form.current?.contains(event.target)) setOpenCalendar(null);
    }
    document.addEventListener('pointerdown', dismissOutside);
    return () => document.removeEventListener('pointerdown', dismissOutside);
  }, [openCalendar]);

  function closeCalendar(restoreFocus = false) {
    setOpenCalendar(null);
    if (restoreFocus) trigger.current?.focus();
  }

  const handlePresetChange = nextMode => {
    setError('');
    closeCalendar();
    const nextRange = rangeForMode(nextMode);
    setValue({ timeRange: nextMode, ...nextRange });
    onApply({ timeRange: 'custom', ...nextRange });
  };
  const updateDate = (key, next) => {
    setError('');
    setValue(old => ({ ...old, timeRange: 'custom', [key]: next }));
  };
  const input = (key, label) => {
    const isEnd = key === 'toDate';
    const min = isEnd && isSupportedDate(value.fromDate) ? value.fromDate : MIN_DATE;
    const max = !isEnd && isSupportedDate(value.toDate) ? value.toDate : MAX_DATE;
    const inputId = `${id}-${key}`;
    const calendarId = `${inputId}-calendar`;
    const expanded = openCalendar === key;
    return <div className="relative flex min-w-0 flex-col gap-1.5">
      <label htmlFor={inputId} className="font-medium text-slate-700">{label}</label>
      <div className="flex min-w-0 items-center rounded-lg border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-indigo-500">
        <input id={inputId} aria-label={label} type="date" value={value[key]} min={min} max={max} required
          className="h-[38px] min-w-0 flex-1 bg-transparent pl-2 text-xs text-slate-900 outline-none sm:pl-3 sm:text-sm [&::-webkit-calendar-picker-indicator]:hidden"
          aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined}
          onChange={event => { closeCalendar(); updateDate(key, event.target.value); }} />
        <button type="button" aria-label={`Mở lịch ${label}`} aria-expanded={expanded}
          aria-controls={expanded ? calendarId : undefined}
          onClick={event => {
            trigger.current = event?.currentTarget;
            setOpenCalendar(expanded ? null : key);
          }}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500">
          <CalendarDays aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
      {expanded && <ReportCalendar id={calendarId} label={label} value={isSupportedDate(value[key]) ? value[key] : ''} min={min} max={max}
        today={getTodayVietnam()} alignRight={isEnd} onPick={date => { updateDate(key, date); closeCalendar(true); }} />}
    </div>;
  };
  const submit = event => {
    event.preventDefault();
    closeCalendar();
    if (!value.fromDate || !value.toDate) { setError('Vui lòng chọn ngày bắt đầu và ngày kết thúc.'); return; }
    if (!isSupportedDate(value.fromDate) || !isSupportedDate(value.toDate)) { setError('Ngày phải nằm trong khoảng năm 2000 đến 2100.'); return; }
    if (value.fromDate > value.toDate) { setError('Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.'); return; }
    if ((Date.parse(value.toDate) - Date.parse(value.fromDate)) / DAY + 1 > 1830) {
      setError('Khoảng thời gian báo cáo tối đa là 5 năm.');
      return;
    }
    onApply({ timeRange: 'custom', fromDate: value.fromDate, toDate: value.toDate });
  };
  return <form ref={form} noValidate aria-label="Bộ lọc thời gian báo cáo"
    className="grid w-full min-w-0 grid-cols-2 items-end gap-3 text-xs sm:grid-cols-3 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto]"
    onSubmit={submit} onKeyDown={event => { if (event.key === 'Escape' && openCalendar) closeCalendar(true); }}>
    <label className="col-span-2 flex min-w-0 flex-col gap-1.5 font-medium text-slate-700 sm:col-span-1">
      <span>Thời gian</span>
      <select aria-label="Kiểu thời gian báo cáo" value={value.timeRange} onChange={event => handlePresetChange(event.target.value)} className={control}>
        {PRESETS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        {value.timeRange === 'custom' && <option value="custom" disabled>Tùy chỉnh khoảng ngày</option>}
      </select>
    </label>
    {input('fromDate', 'Từ ngày')}
    {input('toDate', 'Đến ngày')}
    <button type="submit" className="col-span-full h-10 justify-self-end whitespace-nowrap rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 lg:col-span-1">Áp dụng</button>
    {error && <p id={errorId} role="alert" className="col-span-full min-w-0 text-xs text-rose-700">{error}</p>}
  </form>;
}
