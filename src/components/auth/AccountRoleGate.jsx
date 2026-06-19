import React, { useState } from 'react';
import BrandLogo from '../BrandLogo';
import { switchToOperator } from '../../services/authApi';
import { clearIntendedRole, persistIntendedRole } from '../../utils/intendedRole';

export default function AccountRoleGate({
  profile,
  intendedRole,
  accessToken,
  onResolved,
  onLogout,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const savedRole = profile?.role === 'household' ? 'household' : 'operator';
  const wantsOperator = intendedRole === 'operator';
  const canSwitchToOperator =
    savedRole === 'household' &&
    wantsOperator &&
    profile?.status !== 'active';

  const continueAsSaved = () => {
    clearIntendedRole();
    onResolved?.(profile);
  };

  const handleSwitchToOperator = async () => {
    if (!accessToken) return;
    setBusy(true);
    setError('');
    try {
      const updated = await switchToOperator(accessToken);
      clearIntendedRole();
      persistIntendedRole('operator');
      onResolved?.(updated);
    } catch (err) {
      setError(err.message ?? 'Could not switch to operator.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-sk-canvas flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-sk-card-border/50 bg-white p-8 shadow-lg">
        <div className="flex flex-col items-center text-center">
          <BrandLogo circleBg circleBgSize={96} />
          <h2 className="font-serif text-2xl font-semibold text-sk-ink mt-5">Choose how to continue</h2>
          <p className="text-sm text-sk-ink-muted mt-3 leading-relaxed">
            This Google account is registered as{' '}
            <strong>{savedRole === 'operator' ? 'Barangay Operator' : 'Household Member'}</strong>
            {profile?.status === 'pending' ? ' (pending approval)' : ''}, but you signed in as{' '}
            <strong>{wantsOperator ? 'Operator' : 'Household'}</strong>.
          </p>

          {error && (
            <p className="mt-4 w-full text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <div className="mt-6 w-full space-y-3">
            {canSwitchToOperator && (
              <button
                type="button"
                disabled={busy}
                onClick={handleSwitchToOperator}
                className="w-full h-11 rounded-lg bg-sk-run text-white text-sm font-semibold disabled:opacity-50"
              >
                {busy ? 'Switching…' : 'Use Operator dashboard (recommended)'}
              </button>
            )}
            {savedRole === 'operator' && wantsOperator && (
              <button
                type="button"
                disabled={busy}
                onClick={continueAsSaved}
                className="w-full h-11 rounded-lg bg-sk-run text-white text-sm font-semibold"
              >
                Continue to Operator dashboard
              </button>
            )}
            {savedRole === 'household' && !wantsOperator && (
              <button
                type="button"
                disabled={busy}
                onClick={continueAsSaved}
                className="w-full h-11 rounded-lg bg-sk-run text-white text-sm font-semibold"
              >
                Continue as Household
              </button>
            )}
            {savedRole === 'household' && wantsOperator && canSwitchToOperator && (
              <button
                type="button"
                disabled={busy}
                onClick={continueAsSaved}
                className="w-full h-11 rounded-lg border border-sk-card-border/60 text-sm font-semibold disabled:opacity-50"
              >
                Continue waiting as Household
              </button>
            )}
            {savedRole === 'household' && wantsOperator && !canSwitchToOperator && (
              <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                This household account is already active. Use another Google account for operator
                access.
              </p>
            )}
            {savedRole === 'operator' && !wantsOperator && (
              <button
                type="button"
                disabled={busy}
                onClick={continueAsSaved}
                className="w-full h-11 rounded-lg bg-emerald-700 text-white text-sm font-semibold"
              >
                Continue to Operator dashboard
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={onLogout}
              className="w-full h-10 rounded-lg border border-sk-card-border/70 text-sm font-semibold hover:bg-sk-placeholder/30"
            >
              Sign out and try another account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
