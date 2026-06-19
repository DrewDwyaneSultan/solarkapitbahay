import React from 'react';
import { SunLogoIcon } from '../icons/NavIcons';

const bgMap = {
  savings: 'bg-sk-stat-savings',
  solar: 'bg-sk-stat-solar',
  battery: 'bg-sk-stat-battery',
  grid: 'bg-sk-stat-grid',
};

const iconMap = {
  savings: '💰',
  solar: '☀️',
  battery: '🔋',
  grid: '⚡',
  gini: '⚖️',
  time: '⏱️',
};

export default function StatTile({ label, value, bgKey, icon, hint }) {
  const glyph = icon ?? iconMap[bgKey] ?? null;

  return (
    <div
      className={`rounded-2xl border border-sk-card-border/60 p-4 flex flex-col justify-between min-h-[100px] ${bgMap[bgKey] ?? 'bg-sk-placeholder'}`}
      data-stat={bgKey}
    >
      <div className="flex items-start justify-between gap-2">
        {glyph ? (
          <span className="text-2xl leading-none" aria-hidden>
            {glyph}
          </span>
        ) : (
          <SunLogoIcon className="w-6 h-6 text-amber-600/80" />
        )}
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-sk-ink/80 leading-tight">
          {label}
        </p>
        <p className="mt-1 text-xl font-semibold text-sk-ink tabular-nums">{value}</p>
        {hint && (
          <p className="mt-1.5 text-[10px] leading-snug text-sk-ink-muted">{hint}</p>
        )}
      </div>
    </div>
  );
}
