import React from 'react';
import BrandLogo from '../../components/BrandLogo';

export default function HouseholdStatusScreen({
  status,
  displayName,
  barangayName,
  rejectionReason,
  onLogout,
}) {
  const isRejected = status === 'rejected';

  return (
    <div className="min-h-screen bg-sk-canvas flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-sk-card-border/50 bg-white p-8 shadow-lg">
        <div className="flex flex-col items-center text-center">
          <BrandLogo circleBg circleBgSize={100} />
          <h2 className="font-serif text-2xl font-semibold text-sk-ink mt-5">
            {isRejected ? 'Registration not approved' : 'Pending approval'}
          </h2>
          <p className="text-sm text-sk-ink-muted mt-3 leading-relaxed">
            Hi {displayName ?? 'there'},{' '}
            {isRejected
              ? `your household registration for ${barangayName ?? 'the barangay'} was not approved.`
              : `your registration for ${barangayName ?? 'the barangay'} is waiting for operator review.`}
          </p>
          {!isRejected && (
            <>
              <p className="text-xs text-sk-ink-muted mt-4 leading-relaxed">
                You will receive an email when approved. You can sign out and check back later.
              </p>
              <div className="mt-4 w-full text-left text-xs text-sky-950 bg-sky-50 border border-sky-200 rounded-lg px-4 py-3 space-y-2">
                <p className="font-semibold">Who approves this?</p>
                <p>
                  Your <strong>barangay energy operator</strong> approves sign-ups in the operator
                  dashboard:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-sky-900">
                  <li>Sign in as <strong>Operator</strong> (not Household)</li>
                  <li>Open <strong>Households</strong> in the sidebar</li>
                  <li>Use <strong>Approve / Reject</strong> on the right panel</li>
                </ol>
                <p className="text-sky-800 pt-1">
                  If you are the operator for {barangayName ?? 'this barangay'}, sign out and sign
                  back in with the Operator role to approve your own request.
                </p>
              </div>
            </>
          )}
          {isRejected && rejectionReason && (
            <p className="text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-md px-3 py-2 mt-4 w-full text-left">
              <span className="font-semibold">Reason: </span>
              {rejectionReason}
            </p>
          )}
          {isRejected && (
            <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2 mt-4 w-full">
              Contact your barangay energy operator if you believe this was a mistake.
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
