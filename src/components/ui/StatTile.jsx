import React from 'react';

const bgMap = {
  savings: 'bg-sk-stat-savings',
  solar: 'bg-sk-stat-solar',
  battery: 'bg-sk-stat-battery',
  grid: 'bg-sk-stat-grid',
};

export default function StatTile({ label, value, bgKey }) {
  return (
    <div
      className={`aspect-square rounded-2xl border border-sk-card-border/60 p-4 flex flex-col justify-end ${bgMap[bgKey] ?? 'bg-sk-placeholder'}`}
      data-stat={bgKey}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-sk-ink/80 leading-tight">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold text-sk-ink tabular-nums">{value}</p>
    </div>
  );
}
