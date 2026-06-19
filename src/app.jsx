import React, { useCallback, useEffect, useState } from 'react';
import Login from './login';
import OperatorDashboard from './pages/OperatorDashboard';
import HouseholdMemberApp from './pages/household/HouseholdMemberApp';
import HouseholdStatusScreen from './pages/household/HouseholdStatusScreen';
import BarangayOnboarding from './pages/BarangayOnboarding';
import { useAuth, profileToUser } from './hooks/useAuth';
import { fetchMyBarangay } from './services/registrationApi';

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-sk-canvas flex items-center justify-center">
      <p className="text-sm text-sk-ink-muted uppercase tracking-widest">Loading…</p>
    </div>
  );
}

function App() {
  const auth = useAuth();
  const [demoUser, setDemoUser] = useState(null);
  const [operatorBarangay, setOperatorBarangay] = useState(null);
  const [barangayCheckDone, setBarangayCheckDone] = useState(false);

  const handleLogout = async () => {
    await auth.signOut();
    setDemoUser(null);
    setOperatorBarangay(null);
    setBarangayCheckDone(false);
  };

  const refreshOperatorBarangay = useCallback(async () => {
    if (!auth.session?.access_token || auth.user?.role !== 'operator') {
      setBarangayCheckDone(true);
      return;
    }
    try {
      const bg = await fetchMyBarangay(auth.session.access_token);
      setOperatorBarangay(bg);
    } catch {
      setOperatorBarangay(null);
    } finally {
      setBarangayCheckDone(true);
    }
  }, [auth.session?.access_token, auth.user?.role]);

  useEffect(() => {
    if (auth.loading) return;
    if (auth.user?.role === 'operator' && auth.supabaseEnabled && auth.session) {
      if (operatorBarangay || auth.profile?.barangay_id) {
        setBarangayCheckDone(true);
        return;
      }
      setBarangayCheckDone(false);
      refreshOperatorBarangay();
    } else {
      setBarangayCheckDone(true);
    }
  }, [auth.loading, auth.user?.role, auth.supabaseEnabled, auth.session, auth.profile?.barangay_id, operatorBarangay, refreshOperatorBarangay]);

  if (auth.loading) {
    return <LoadingScreen />;
  }

  const activeUser = demoUser ?? auth.user;

  if (auth.needsProfile && auth.session) {
    return (
      <Login
        needsProfile
        session={auth.session}
        supabaseEnabled={auth.supabaseEnabled}
        onProfileComplete={(saved) => auth.setProfileFromSave(saved)}
        onSignIn={() => {}}
      />
    );
  }

  if (!activeUser) {
    if (auth.session && auth.authError) {
      return (
        <div className="min-h-screen bg-sk-canvas flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl border border-amber-200 bg-white p-8 shadow-lg">
            <h2 className="font-serif text-xl font-semibold text-sk-ink mb-2">Signed in, but app setup incomplete</h2>
            <p className="text-sm text-sk-ink-muted mb-4">
              Google login worked (your account is in Supabase), but the backend could not verify your session.
            </p>
            <p className="text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-md px-3 py-2 mb-4">
              {auth.authError}
            </p>
            <p className="text-xs text-sk-ink-muted mb-4">
              On Vercel, set <code className="text-xs">SUPABASE_URL</code> (same value as{' '}
              <code className="text-xs">VITE_SUPABASE_URL</code>) and{' '}
              <code className="text-xs">SUPABASE_JWT_SECRET</code> (legacy JWT secret), then redeploy.
              Locally, add both to <code className="text-xs">.env</code> and restart{' '}
              <code className="text-xs">npm run dev:backend</code>. New Supabase projects use ES256
              tokens — the URL is required for verification.
            </p>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full h-10 rounded-md border border-sk-card-border/70 text-sm font-semibold"
            >
              Sign out
            </button>
          </div>
        </div>
      );
    }

    return (
      <Login
        supabaseEnabled={auth.supabaseEnabled}
        onSignIn={({ user, session }) => {
          if (user) {
            setDemoUser(user);
          } else if (session && auth.profile) {
            setDemoUser(profileToUser(auth.profile));
          }
        }}
        onProfileComplete={(saved) => auth.setProfileFromSave(saved)}
      />
    );
  }

  if (activeUser.role === 'household') {
    if (activeUser.status === 'pending' || activeUser.status === 'rejected') {
      return (
        <HouseholdStatusScreen
          status={activeUser.status}
          displayName={activeUser.name}
          barangayName={activeUser.barangayName}
          rejectionReason={activeUser.rejectionReason}
          onLogout={handleLogout}
        />
      );
    }

    return (
      <HouseholdMemberApp
        member={{
          name: activeUser.name ?? 'User',
          householdId: activeUser.householdId ?? 'HH-01',
        }}
        barangay={{
          name: activeUser.barangayName ?? 'Barangay',
          householdCode: activeUser.house ?? 'household_code',
        }}
        onLogout={handleLogout}
      />
    );
  }

  if (
    auth.supabaseEnabled &&
    auth.session &&
    !demoUser &&
    !barangayCheckDone
  ) {
    return <LoadingScreen />;
  }

  if (
    auth.supabaseEnabled &&
    auth.session &&
    !demoUser &&
    barangayCheckDone &&
    !operatorBarangay &&
    !auth.profile?.barangay_id
  ) {
    return (
      <BarangayOnboarding
        accessToken={auth.session.access_token}
        operatorName={activeUser.name}
        onComplete={async () => {
          await auth.refreshProfile(auth.session.access_token);
          await refreshOperatorBarangay();
        }}
      />
    );
  }

  const barangayName =
    operatorBarangay?.name ??
    auth.profile?.barangay_name ??
    'Barangay Mabini';
  const barangayCode =
    operatorBarangay?.barangay_code ?? auth.profile?.barangay_code ?? null;

  return (
    <OperatorDashboard
      operator={{
        initials: activeUser.initials ?? 'JU',
        name: activeUser.name ?? 'Operator',
        role: activeUser.roleLabel ?? 'Barangay Operator',
      }}
      barangayName={barangayName}
      barangayCode={barangayCode}
      accessToken={auth.session?.access_token ?? null}
      onLogout={handleLogout}
    />
  );
}

export default App;
