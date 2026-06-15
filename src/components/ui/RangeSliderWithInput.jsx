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
    <div className="rounded-xl border border-sk-card-border/40 bg-white/60 px-4 py-3.5">
      <RangeSlider
        id={id}
        label={label}
        min={min}
        max={max}
        value={value}
        onChange={onChange}
        unit={unit}
        displayValue={value}
        inputSlot={
          <input
            id={`${id}-input`}
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(clamp(e.target.value))}
            aria-label={`${label} value`}
            className="w-[4.25rem] h-8 rounded-md border border-sk-card-border/60 bg-white px-2 text-sm font-semibold tabular-nums text-sk-ink text-right focus:outline-none focus:ring-2 focus:ring-sk-run/25"
          />
        }
      />
    </div>
  );
}
