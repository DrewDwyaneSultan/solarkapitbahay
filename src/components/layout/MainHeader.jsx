import React from 'react';

export default function MainHeader({
  barangayName = 'Barangay Mabini',
  dateLabel,
  timeLabel,
  subtitle,
}) {
  const date = dateLabel ?? formatHeaderDate(new Date());
  const time = timeLabel ?? formatHeaderTime(new Date());

  return (
    <header className="border-b border-sk-card-border/50 pb-4 mb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-wide text-sk-ink">
            {barangayName}
          </h1>
          {subtitle && (
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.25em] text-sk-ink-muted">
              {subtitle}
            </p>
          )}
        </div>
        <div className="text-right text-[11px] font-semibold uppercase tracking-widest text-sk-ink-muted">
          <p>{date}</p>
          <p className="mt-0.5">{time}</p>
        </div>
      </div>
    </header>
  );
}

function formatHeaderDate(d) {
  return d
    .toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    .toUpperCase()
    .replace(',', '');
}

function formatHeaderTime(d) {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
