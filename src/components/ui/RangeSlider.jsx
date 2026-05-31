import React from 'react';

export default function RangeSlider({
  id,
  label,
  min,
  max,
  value,
  onChange,
  displayValue,
  unit = '',
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-sk-ink-muted">
          {label}
        </label>
        <span className="text-sm font-semibold text-sk-ink tabular-nums">
          {displayValue ?? value}
          {unit && <span className="ml-0.5 font-medium text-sk-ink-muted">{unit}</span>}
        </span>
      </div>
      <div className="flex items-center gap-3 text-[10px] font-medium text-sk-ink-muted">
        <span>{min}</span>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="sk-range flex-1"
          style={{ '--pct': `${((value - min) / (max - min)) * 100}%` }}
        />
        <span>{max}</span>
      </div>
    </div>
  );
}
