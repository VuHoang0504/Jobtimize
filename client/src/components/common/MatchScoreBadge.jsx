import React from 'react';

export default function MatchScoreBadge({ score, size = 'md', showLabel = true }) {
  if (score === undefined || score === null) return null;

  const numericScore = typeof score === 'number' ? Math.round(score) : Math.round(parseFloat(score) || 0);

  let badgeColor = 'bg-slate-100 text-slate-600 border-gray-200';
  let dotColor = 'bg-slate-400';

  if (numericScore >= 75) {
    badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    dotColor = 'bg-emerald-500';
  } else if (numericScore >= 40) {
    badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
    dotColor = 'bg-blue-500';
  } else if (numericScore > 0) {
    badgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
    dotColor = 'bg-amber-500';
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1 font-medium',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-semibold',
    lg: 'text-xs px-3 py-1 gap-1.5 font-bold',
  };

  return (
    <div className={`inline-flex items-center rounded-full border ${badgeColor} ${sizeClasses[size]} transition-all`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span>{numericScore}%</span>
      {showLabel && <span>Phù hợp</span>}
    </div>
  );
}
