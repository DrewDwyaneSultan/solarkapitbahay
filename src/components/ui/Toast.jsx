import React, { useEffect } from 'react';

export default function Toast({ message, tone = 'success', onDone }) {
  useEffect(() => {
    const id = setTimeout(() => onDone?.(), 3200);
    return () => clearTimeout(id);
  }, [onDone]);

  const styles =
    tone === 'error'
      ? 'bg-rose-700 border-rose-900'
      : tone === 'info'
        ? 'bg-sky-700 border-sky-900'
        : 'bg-emerald-700 border-emerald-900';

  return (
    <div
      className={`fixed bottom-6 right-6 z-[100] max-w-sm rounded-xl border px-4 py-3 text-white text-sm font-semibold shadow-lg animate-in ${styles}`}
      role="status"
    >
      {message}
    </div>
  );
}
