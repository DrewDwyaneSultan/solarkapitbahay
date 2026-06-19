import React, { useEffect } from 'react';

export default function Toast({ title, message, tone = 'success', hint, onDone }) {
  const duration = tone === 'error' ? 7000 : tone === 'info' ? 5000 : 3200;

  useEffect(() => {
    const id = setTimeout(() => onDone?.(), duration);
    return () => clearTimeout(id);
  }, [onDone, duration, message, title]);

  const styles =
    tone === 'error'
      ? 'bg-rose-800 border-rose-950'
      : tone === 'info'
        ? 'bg-sky-800 border-sky-950'
        : 'bg-emerald-800 border-emerald-950';

  return (
    <div
      className={`fixed bottom-6 right-6 z-[200] max-w-md rounded-xl border px-4 py-3 text-white shadow-xl ${styles}`}
      role="alert"
      aria-live="assertive"
    >
      {title && <p className="text-sm font-bold leading-snug">{title}</p>}
      <p className={`text-sm leading-relaxed ${title ? 'mt-1 font-medium' : 'font-semibold'}`}>
        {message}
      </p>
      {hint && <p className="mt-2 text-xs leading-relaxed text-white/90">{hint}</p>}
    </div>
  );
}
