import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import browseGroups from '../../../../shared/jobBrowseGroups.json';

export default function JobBrowseMenu({ mobile = false, onSelect }) {
  const location = useLocation();
  const activeGroup = new URLSearchParams(location.search).get('group');
  const renderLink = (group) => (
    <Link
      key={group.id}
      to={'/?group=' + group.id}
      onClick={onSelect}
      aria-current={location.pathname === '/' && activeGroup === group.id ? 'page' : undefined}
      className={`group flex items-center justify-between gap-1 rounded-lg px-2.5 py-2.5 text-sm font-medium transition-colors hover:bg-slate-50 hover:text-emerald-600 focus-visible:outline-emerald-600 ${
        location.pathname === '/' && activeGroup === group.id ? 'bg-slate-50 text-emerald-600' : 'text-slate-700'
      }`}
    >
      <span>Việc làm {group.label}</span>
      <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" />
    </Link>
  );

  return (
    <div className={mobile ? 'space-y-4' : 'grid grid-cols-3 gap-4'}>
      <div className={mobile ? '' : 'col-span-2'}>
        <h3 className="mb-2 px-2.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Việc làm theo vị trí</h3>
        <div className="grid grid-cols-2 gap-x-2">
          <div>{browseGroups.positions.slice(0, 7).map(renderLink)}</div>
          <div>{browseGroups.positions.slice(7).map(renderLink)}</div>
        </div>
      </div>
      <div className={mobile ? 'border-t border-gray-100 pt-4' : 'border-l border-gray-100 pl-4'}>
        <h3 className="mb-2 px-2.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Việc làm theo lĩnh vực</h3>
        <div>{browseGroups.industries.map(renderLink)}</div>
      </div>
    </div>
  );
}
