import React from 'react';

/** Empty slot for charts, algorithm pickers, constraint tags, etc. */
export default function PlaceholderSlot({
  variant = 'box',
  className = '',
  label,
  children,
}) {
  const base = 'bg-sk-placeholder border border-sk-card-border/40';

  if (variant === 'pill') {
    return (
      <div
        className={`h-9 rounded-full ${base} ${className}`}
        aria-label={label}
        role={children ? undefined : 'presentation'}
      >
        {children}
      </div>
    );
  }

  if (variant === 'chart') {
    return (
      <div
        className={`min-h-[200px] rounded-xl ${base} ${className}`}
        aria-label={label}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={`min-h-[72px] rounded-xl ${base} ${className}`}
      aria-label={label}
    >
      {children}
    </div>
  );
}
