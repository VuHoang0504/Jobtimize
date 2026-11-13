import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const weekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const monthFormat = new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const iso = date => date.toISOString().slice(0, 10);
const monthButton = 'grid h-8 w-8 place-items-center rounded-md text-slate-600 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-30';

export default function ReportCalendar({ id, label, value, min, max, today, alignRight, onPick }) {
  const [month, setMonth] = useState(() => {
    const date = value || today;
    return (date < min ? min : date > max ? max : date).slice(0, 7);
  });
  const initialDay = useRef(null);
  const [year, monthNumber] = month.split('-').map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const dayCount = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const firstEnabledDay = value.startsWith(month) && value >= min && value <= max
    ? value : (iso(first) < min ? min : iso(first));

  useEffect(() => {
    initialDay.current?.focus();
  }, []);

  function moveMonth(delta) {
    setMonth(iso(new Date(Date.UTC(year, monthNumber - 1 + delta, 1))).slice(0, 7));
  }

  return <div id={id} role="group" aria-label={`Lịch ${label}`}
    className={`absolute top-full z-30 mt-1.5 w-[min(17rem,calc(100vw-3rem))] rounded-xl border border-slate-200 bg-white p-3 shadow-lg shadow-slate-900/15 ${alignRight ? 'right-0' : 'left-0'}`}>
    <div className="mb-1 flex items-center justify-between">
      <button type="button" aria-label="Tháng trước" disabled={month <= min.slice(0, 7)} onClick={() => moveMonth(-1)} className={monthButton}>
        <ChevronLeft aria-hidden="true" className="h-4 w-4" />
      </button>
      <span aria-live="polite" className="text-sm font-semibold text-slate-900">{monthFormat.format(first)}</span>
      <button type="button" aria-label="Tháng sau" disabled={month >= max.slice(0, 7)} onClick={() => moveMonth(1)} className={monthButton}>
        <ChevronRight aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
    <div className="grid grid-cols-7 gap-0.5 text-center">
      {weekdays.map(day => <span key={day} className="py-1.5 text-[11px] font-semibold text-slate-500">{day}</span>)}
      {Array.from({ length: offset }, (_, index) => <span key={`empty-${index}`} />)}
      {Array.from({ length: dayCount }, (_, index) => {
        const day = index + 1;
        const date = iso(new Date(Date.UTC(year, monthNumber - 1, day)));
        const selected = date === value;
        return <button key={date} type="button"
          ref={date === firstEnabledDay ? initialDay : undefined}
          aria-label={date.split('-').reverse().join('/')}
          aria-pressed={selected}
          aria-current={date === today ? 'date' : undefined}
          disabled={date < min || date > max}
          onClick={() => onPick(date)}
          className={`h-8 rounded-md text-xs tabular-nums focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-default disabled:opacity-30 ${selected ? 'bg-indigo-600 font-semibold text-white' : 'text-slate-700 enabled:hover:bg-indigo-50'}`}>
          {day}
        </button>;
      })}
    </div>
  </div>;
}
