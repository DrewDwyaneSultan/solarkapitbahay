import React, { useEffect, useState } from 'react';

export default function TransferAnimationOverlay({ from, to, amount, onComplete, onClose }) {
  const [phase, setPhase] = useState('charging');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('flowing'), 800);
    const t2 = setTimeout(() => setPhase('success'), 2800);
    const t3 = setTimeout(() => onComplete(), 4000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  const isBattery = to === 'Community Battery';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-sk-ink/50 backdrop-blur-sm">
      <div
        className={`relative w-full max-w-lg mx-4 rounded-2xl bg-sk-card border-2 p-8 text-center shadow-xl ${
          phase === 'success' ? 'border-emerald-600' : 'border-sk-accent'
        }`}
      >
        <button
          type="button"
          onClick={() => (onClose ? onClose() : onComplete())}
          className="absolute top-3 right-3 w-9 h-9 rounded-full border border-sk-card-border/60 bg-white text-sk-ink-muted hover:text-sk-ink hover:bg-sk-placeholder/50 text-lg leading-none"
          aria-label="Close transfer dialog"
        >
          ×
        </button>

        {phase !== 'success' ? (
          <>
            <h3 className="font-serif text-xl font-semibold text-sk-ink">
              {phase === 'charging' ? 'Preparing Transfer…' : 'Energy Flowing!'}
            </h3>
            <p className="mt-2 text-sm text-sk-ink-muted">
              {phase === 'charging'
                ? 'Verifying surplus and relay status'
                : `Routing ${amount}W through community relay network`}
            </p>
            <div className="flex items-center justify-center gap-4 my-8">
              <TransferNode emoji="🏠" label={from} tag="Sending" tagClass="text-emerald-800" />
              <div className="flex-1 h-1 rounded bg-sk-placeholder relative overflow-hidden">
                {phase === 'flowing' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-amber-400 to-sk-accent animate-pulse" />
                )}
              </div>
              <TransferNode emoji={isBattery ? '🔋' : '🏠'} label={to} tag="Receiving" tagClass="text-amber-800" />
            </div>
            <div className="h-2 rounded-full bg-sk-placeholder overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-sk-accent transition-all duration-1000"
                style={{ width: phase === 'charging' ? '30%' : '100%' }}
              />
            </div>
            <button
              type="button"
              onClick={() => (onClose ? onClose() : onComplete())}
              className="mt-6 text-sm font-semibold text-sk-ink-muted underline hover:text-sk-ink"
            >
              Cancel transfer
            </button>
          </>
        ) : (
          <>
            <div className="w-16 h-16 mx-auto rounded-full border-2 border-emerald-600 bg-emerald-50 flex items-center justify-center text-3xl mb-4">
              ✓
            </div>
            <h3 className="font-serif text-xl font-semibold text-sk-ink">Transfer Complete!</h3>
            <p className="mt-2 text-sm text-sk-ink-muted">
              Routed <strong>{amount}W</strong> from <strong>{from}</strong> to <strong>{to}</strong>
            </p>
            <button
              type="button"
              onClick={onComplete}
              className="mt-6 h-10 px-6 rounded-xl bg-sk-run text-white text-sm font-semibold hover:bg-sk-run-hover"
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function TransferNode({ emoji, label, tag, tagClass }) {
  return (
    <div className="flex flex-col items-center gap-2 w-24">
      <div className="w-14 h-14 rounded-xl border-2 border-sk-card-border flex items-center justify-center text-2xl bg-white">
        {emoji}
      </div>
      <p className="text-xs font-bold text-sk-ink">{label}</p>
      <span className={`text-[9px] uppercase tracking-widest font-bold ${tagClass}`}>{tag}</span>
    </div>
  );
}
