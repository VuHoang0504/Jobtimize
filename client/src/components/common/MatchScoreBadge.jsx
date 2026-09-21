import React from 'react';
import { Sparkles } from 'lucide-react';

export default function MatchScoreBadge({ score, size = 'md', showLabel = true }) {
  if (score === undefined || score === null) return null;

  const numericScore = typeof score === 'number' ? score : parseFloat(score);

  let badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  let iconColor = 'text-emerald-600';
  let glowStyle = 'shadow-sm shadow-emerald-500/10';

  if (numericScore >= 80) {
    badgeColor = 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-transparent shadow-md shadow-emerald-500/20';
    iconColor = 'text-white';
  } else if (numericScore >= 60) {
    badgeColor = 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-md shadow-blue-500/20';
    iconColor = 'text-white';
  } else {
    badgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
    iconColor = 'text-amber-600';
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-3 py-1 gap-1.5 font-bold',
    lg: 'text-sm px-4 py-1.5 gap-2 font-extrabold',
  };

  return (
    <div className={`inline-flex items-center rounded-full border ${badgeColor} ${sizeClasses[size]} ${glowStyle} transition-all`}>
      <Sparkles className={`w-3.5 h-3.5 ${iconColor} animate-pulse`} />
      <span>{numericScore}%</span>
      {showLabel && <span className="opacity-90 font-medium">Match</span>}
    </div>
  );
}
