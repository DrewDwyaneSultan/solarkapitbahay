import React, { useState } from 'react';
import BrandLogo from '../BrandLogo';
import { switchToOperator } from '../../services/authApi';
import { clearIntendedRole, persistIntendedRole } from '../../utils/intendedRole';
import { getProfileRoles, profileHasRole } from '../../hooks/useAuth';

import { ToastProvider, useToast } from '../../context/ToastContext';

export default function AccountRoleGate(props) {
  return (
    <ToastProvider>
      <AccountRoleGateInner {...props} />
    </ToastProvider>
  );
}

function AccountRoleGateInner({
  profile,
  intendedRole,
  accessToken,
  onResolved,
  onAddHousehold,
  onLogout,
}) {
  const { showError } = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const roles = getProfileRoles(profile);
  const wantsOperator = intendedRole === 'operator';
  const wantsHousehold = intendedRole === 'household';
  const hasOperator = profileHasRole(profile, 'operator');
  const hasHousehold = profileHasRole(profile, 'household');

  const handleAddOperator = async () => {
    if (!accessToken) return;
    setBusy(true);
    setError('');
    try {
      const updated = await switchToOperator(accessToken);
      clearIntendedRole();
      persistIntendedRole('operator');
      onResolved?.(updated, 'operator');
    } catch (err) {
      const msg = err.message ?? 'Could not add operator access.';
      setError(msg);
      showError(err, msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-sk-canvas flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-sk-card-border/50 bg-white p-8 shadow-lg">
        <div className="flex flex-col items-center text-center">
          <BrandLogo circleBg circleBgSize={96} />
          <h2 className="font-serif text-2xl font-semibold text-sk-ink mt-5">Add access to your account</h2>
          <p className="text-sm text-sk-ink-muted mt-3 leading-relaxed">
            This Google account currently has{' '}
            <strong>
              {roles.length === 2
                ? 'both roles'
                : hasOperator
                  ? 'operator access'
                  : 'household access'}
            </strong>
            . You signed in to set up{' '}
            <strong>{wantsOperator ? 'operator' : 'household'}</strong> access.
          </p>

          {error && (
            <p className="mt-4 w-full text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <div className="mt-6 w-full space-y-3">
            {wantsOperator && !hasOperator && (
              <button
                type="button"
                disabled={busy}
                onClick={handleAddOperator}
                className="w-full h-11 rounded-lg bg-sk-run text-white text-sm font-semibold disabled:opacity-50"
              >
                {busy ? 'Adding operator access…' : 'Add operator access to this account'}
              </button>
            )}
            {wantsHousehold && !hasHousehold && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onAddHousehold?.()}
                className="w-full h-11 rounded-lg bg-sk-run text-white text-sm font-semibold disabled:opacity-50"
              >
                Set up household access
              </button>
            )}
            {(hasOperator && wantsHousehold) || (hasHousehold && wantsOperator) ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  clearIntendedRole();
                  onResolved?.(profile, hasOperator && wantsOperator ? 'operator' : 'household');
                }}
                className="w-full h-11 rounded-lg border border-sk-card-border/60 text-sm font-semibold"
              >
                Continue with existing access
              </button>
            ) : null}
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
