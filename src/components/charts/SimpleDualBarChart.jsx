import React from 'react';

export default function SimpleDualBarChart({ withoutData, withData, labels }) {
  const max = Math.max(...withoutData, ...withData, 1);

  return (
    <div className="space-y-3">
      {labels.map((label, i) => (
        <div key={label}>
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-sk-ink-muted mb-1">
            <span>{label}</span>
          </div>
          <div className="space-y-1">
            <BarRow label="Without" value={withoutData[i]} max={max} color="#a89888" />
            <BarRow label="With sharing" value={withData[i]} max={max} color="#5a8f5c" />
          </div>
        </div>
      ))}
    </div>
  );
}

function BarRow({ label, value, max, color }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 text-[10px] text-sk-ink-muted">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-sk-placeholder overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${(value / max) * 100}%`, background: color }} />
      </div>
      <span className="w-8 text-xs font-semibold tabular-nums text-sk-ink">{value}</span>
    </div>
  );
}
