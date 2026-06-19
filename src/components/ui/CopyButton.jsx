import React, { useState } from 'react';

export default function CopyButton({ text, label = 'Copy', className = '' }) {
  const [copied, setCopied] = useState(false);
  const disabled = !text || text === '—';

  const handleCopy = async () => {
    if (disabled) return;
    try {
      await navigator.clipboard.writeText(String(text));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={disabled}
      aria-label={copied ? 'Copied' : `Copy ${label}`}
      className={`shrink-0 h-10 px-3 rounded-md border text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        copied
          ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
          : 'border-sk-card-border/60 bg-white text-sk-ink hover:bg-sk-placeholder/40'
      } ${className}`}
    >
      {copied ? 'Copied!' : label}
    </button>
  );
}
