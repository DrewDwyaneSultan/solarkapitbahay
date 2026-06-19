import React, { useEffect, useState } from 'react';
import BrandLogo from '../../components/BrandLogo';

const STEPS = [
  { title: 'Registration submitted', detail: 'Your barangay operator receives your request.' },
  { title: 'Operator reviews', detail: 'They approve or reject in Households → Approve / Reject.' },
  { title: 'You get access', detail: 'This page updates automatically when approved.' },
];

export default function HouseholdStatusScreen({
  status,
  displayName,
  barangayName,
  rejectionReason,
  onLogout,
  onCheckStatus,
  onSwitchToOperator,
  checking = false,
}) {
  const isRejected = status === 'rejected';
  const [switchBusy, setSwitchBusy] = useState(false);

  useEffect(() => {
    if (isRejected || !onCheckStatus) return undefined;
    onCheckStatus();
    const id = setInterval(onCheckStatus, 12000);
    return () => clearInterval(id);
  }, [isRejected, onCheckStatus]);

  const handleOperatorSwitch = async () => {
    if (!onSwitchToOperator) return;
    setSwitchBusy(true);
    try {
      await onSwitchToOperator();
    } finally {
      setSwitchBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-sk-canvas flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-sk-card-border/50 bg-white p-8 shadow-lg">
        <div className="flex flex-col items-center text-center">
          <BrandLogo circleBg circleBgSize={100} />
          <h2 className="font-serif text-2xl font-semibold text-sk-ink mt-5">
            {isRejected ? 'Registration not approved' : 'Waiting for approval'}
          </h2>
          <p className="text-sm text-sk-ink-muted mt-3 leading-relaxed">
            Hi {displayName ?? 'there'},{' '}
            {isRejected
              ? `your household registration for ${barangayName ?? 'the barangay'} was not approved.`
              : `your request to join ${barangayName ?? 'the barangay'} is in the operator’s queue.`}
          </p>

          {!isRejected && (
            <>
              <div className="mt-5 w-full text-left space-y-3">
                {STEPS.map((step, i) => (
                  <div
                    key={step.title}
                    className="flex gap-3 rounded-lg border border-sk-card-border/30 bg-white/70 px-3 py-2.5"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-900">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-sk-ink">{step.title}</p>
                      <p className="text-[11px] text-sk-ink-muted leading-snug">{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-sk-ink-muted mt-4">
                {checking ? 'Checking approval status…' : 'We check every few seconds for updates.'}
              </p>

              <button
                type="button"
                disabled={checking}
                onClick={onCheckStatus}
                className="mt-3 w-full h-10 rounded-lg border border-sk-card-border/60 text-sm font-semibold hover:bg-sk-placeholder/30 disabled:opacity-50"
              >
                Check now
              </button>

              <div className="mt-4 w-full text-left text-xs text-violet-950 bg-violet-50 border border-violet-200 rounded-lg px-4 py-3 space-y-2">
                <p className="font-semibold">Are you the barangay operator?</p>
                <p>
                  If you meant to manage {barangayName ?? 'this barangay'}, you don’t need to wait
                  for approval — switch to the operator dashboard and approve households from there.
                </p>
                <button
                  type="button"
                  disabled={switchBusy}
                  onClick={handleOperatorSwitch}
                  className="w-full h-10 rounded-lg bg-violet-700 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {switchBusy ? 'Opening operator dashboard…' : 'I’m the operator — open dashboard'}
                </button>
              </div>
            </>
          )}

          {isRejected && rejectionReason && (
            <p className="text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-md px-3 py-2 mt-4 w-full text-left">
              <span className="font-semibold">Reason: </span>
              {rejectionReason}
            </p>
          )}

          <button
            type="button"
            onClick={onLogout}
            className="mt-6 w-full h-11 rounded-md border border-sk-card-border/70 text-sm font-semibold hover:bg-sk-placeholder/30"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
