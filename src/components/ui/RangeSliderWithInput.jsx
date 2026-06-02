import React from 'react';
import RangeSlider from './RangeSlider';

export default function RangeSliderWithInput({
  id,
  label,
  min,
  max,
  value,
  onChange,
  unit = '',
  step = 1,
}) {
  const clamp = (n) => Math.min(max, Math.max(min, Number(n) || min));

  return (
    <div className="space-y-2">
      <RangeSlider
        id={id}
        label={label}
        min={min}
        max={max}
        value={value}
        onChange={onChange}
        unit={unit}
        displayValue={value}
      />
      <div className="flex items-center gap-2">
        <label htmlFor={`${id}-input`} className="text-[10px] font-bold uppercase tracking-widest text-sk-ink-muted shrink-0">
          Type value
        </label>
        <input
          id={`${id}-input`}
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(clamp(e.target.value))}
          className="w-24 h-9 rounded-md border border-sk-card-border/60 bg-white px-2 text-sm font-semibold tabular-nums text-sk-ink focus:outline-none focus:ring-2 focus:ring-sk-run/25"
        />
        {unit && <span className="text-xs text-sk-ink-muted">{unit}</span>}
      </div>
    </div>
  );
}
