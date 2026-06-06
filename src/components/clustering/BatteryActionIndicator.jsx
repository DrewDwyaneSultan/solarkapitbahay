import React from 'react';
import { actionStyle } from '../../constants/clustering';

export default function BatteryActionIndicator({
  action = 'balanced',
  label,
  description,
  size = 'md',
  showHint = true,
}) {
  const style = actionStyle(action);
  const displayLabel = label ?? style.label;
  const pad = size === 'lg' ? 'p-5' : size === 'sm' ? 'p-2.5' : 'p-4';
  const text = size === 'lg' ? 'text-lg' : 'text-sm';

  return (
    <div
      className={`rounded-2xl border-2 ${style.bgClass} ${pad}`}
      role="status"
      aria-label={`Battery action: ${displayLabel}`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex shrink-0 items-center justify-center rounded-full text-white font-bold ${style.dotClass} ${
            size === 'lg' ? 'w-12 h-12 text-xl' : 'w-9 h-9 text-base'
          }`}
          aria-hidden
        >
          {style.icon}
        </span>
        <div className="min-w-0">
          <p className={`font-bold ${text}`}>{displayLabel}</p>
          {showHint && (
            <p className="text-xs text-sk-ink-muted mt-0.5 leading-snug">
              {description ?? style.hint}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function BatteryActionChip({ action, label }) {
  const style = actionStyle(action);
  return (
    <span
      className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-bold border ${style.bgClass}`}
    >
      <span className={`w-2 h-2 rounded-full ${style.dotClass}`} aria-hidden />
      {label ?? style.label}
    </span>
  );
}
