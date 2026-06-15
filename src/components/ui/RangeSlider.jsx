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
  inputSlot = null,
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-[11px] font-bold uppercase tracking-wider text-sk-ink-muted">
          {label}
        </label>
        <div className="flex items-center gap-1.5 shrink-0">
          {inputSlot ?? (
            <span className="text-sm font-semibold text-sk-ink tabular-nums">
              {displayValue ?? value}
            </span>
          )}
          {unit && <span className="text-xs font-medium text-sk-ink-muted">{unit}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2.5 text-[10px] font-medium text-sk-ink-muted tabular-nums">
        <span className="w-6 text-right shrink-0">{min}</span>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="sk-range flex-1 min-w-0"
          style={{ '--pct': `${((value - min) / (max - min)) * 100}%` }}
        />
        <span className="w-8 shrink-0">{max}</span>
      </div>
    </div>
  );
}
