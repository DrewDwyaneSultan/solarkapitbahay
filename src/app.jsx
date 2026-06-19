import React, { useCallback, useEffect, useState } from 'react';
import Login from './login';
import OperatorDashboard from './pages/OperatorDashboard';
import HouseholdMemberApp from './pages/household/HouseholdMemberApp';
import HouseholdStatusScreen from './pages/household/HouseholdStatusScreen';
import BarangayOnboarding from './pages/BarangayOnboarding';
import AccountRoleGate from './components/auth/AccountRoleGate';
import { useAuth, profileToUser, getProfileRole } from './hooks/useAuth';
import { fetchMyBarangay } from './services/registrationApi';
import { switchToOperator } from './services/authApi';
import {
  clearIntendedRole,
  consumeIntendedRoleFromUrl,
  persistIntendedRole,
  readIntendedRole,
} from './utils/intendedRole';

function LoadingScreen({ message = 'Loading…' }) {
  return (
    <div className="min-h-screen bg-sk-canvas flex items-center justify-center">
      <p className="text-sm text-sk-ink-muted uppercase tracking-widest">{message}</p>
    </div>
  );
}

function HouseholdRoutes({
  householdUser,
  accessToken,
  onLogout,
  onCheckStatus,
  onSwitchToOperator,
  checking,
}) {
  if (householdUser.status === 'pending' || householdUser.status === 'rejected') {
    return (
      <HouseholdStatusScreen
        status={householdUser.status}
        displayName={householdUser.name}
        barangayName={householdUser.barangayName}
        rejectionReason={householdUser.rejectionReason}
        onLogout={onLogout}
        onCheckStatus={onCheckStatus}
        onSwitchToOperator={onSwitchToOperator}
        checking={checking}
      />
    );
  }

  return (
    <HouseholdMemberApp
      member={{
        name: householdUser.name ?? 'User',
        householdId: householdUser.householdId ?? 'HH-01',
      }}
      barangay={{
        name: householdUser.barangayName ?? 'Barangay',
        householdCode: householdUser.house ?? 'household_code',
      }}
      onLogout={onLogout}
    />
  );
}

function App() {
  const auth = useAuth();
  const [demoUser, setDemoUser] = useState(null);
  const [operatorBarangay, setOperatorBarangay] = useState(null);
  const [barangayCheckDone, setBarangayCheckDone] = useState(false);
  const [intendedRole, setIntendedRole] = useState(null);
  const [statusChecking, setStatusChecking] = useState(false);

  useEffect(() => {
    const fromOAuth = consumeIntendedRoleFromUrl();
    if (fromOAuth) {
      setIntendedRole(fromOAuth);
      return;
    }
    const stored = readIntendedRole();
    if (stored) setIntendedRole(stored);
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    setDemoUser(null);
    setOperatorBarangay(null);
    setBarangayCheckDone(false);
    clearIntendedRole();
    setIntendedRole(null);
  };

  const refreshOperatorBarangay = useCallback(async () => {
    if (!auth.session?.access_token || getProfileRole(auth.profile) !== 'operator') {
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
  }, [auth.session?.access_token, auth.profile]);

  const handleSwitchToOperator = useCallback(async () => {
    if (!auth.session?.access_token) return;
    const updated = await switchToOperator(auth.session.access_token);
    auth.setProfileFromSave(updated);
    clearIntendedRole();
    persistIntendedRole('operator');
    setIntendedRole('operator');
    setBarangayCheckDone(false);
    await refreshOperatorBarangay();
  }, [auth.session?.access_token, auth.setProfileFromSave, refreshOperatorBarangay]);

  const handleCheckApprovalStatus = useCallback(async () => {
    if (!auth.session?.access_token) return;
    setStatusChecking(true);
    try {
      await auth.refreshProfile(auth.session.access_token);
    } finally {
      setStatusChecking(false);
    }
  }, [auth.session?.access_token, auth.refreshProfile]);

  useEffect(() => {
    if (auth.loading) return;

    const isOperator =
      getProfileRole(auth.profile) === 'operator' && auth.supabaseEnabled && auth.session;

    if (!isOperator) {
      setBarangayCheckDone(true);
      return;
    }

    if (auth.profile?.barangay_id || operatorBarangay) {
      setBarangayCheckDone(true);
      if (!operatorBarangay && auth.profile?.barangay_id) {
        refreshOperatorBarangay();
      }
      return;
    }

    setBarangayCheckDone(false);
    refreshOperatorBarangay();
  }, [
    auth.loading,
    auth.profile,
    auth.supabaseEnabled,
    auth.session,
    auth.profile?.barangay_id,
    operatorBarangay,
    refreshOperatorBarangay,
  ]);

  useEffect(() => {
    if (barangayCheckDone) return undefined;
    const timer = setTimeout(() => setBarangayCheckDone(true), 6000);
    return () => clearTimeout(timer);
  }, [barangayCheckDone]);

  if (auth.loading) {
    return <LoadingScreen />;
  }

  const profileRole = auth.profile ? getProfileRole(auth.profile) : null;
  const effectiveIntended = intendedRole ?? readIntendedRole();
  const wantsHousehold = effectiveIntended === 'household';
  const wantsOperator = effectiveIntended === 'operator';

  const roleConflict =
    auth.session &&
    auth.profile &&
    ((wantsOperator && profileRole === 'household') || (wantsHousehold && profileRole === 'operator'));

  if (roleConflict) {
    return (
      <AccountRoleGate
        profile={auth.profile}
        intendedRole={wantsHousehold ? 'household' : 'operator'}
        accessToken={auth.session.access_token}
        onResolved={(saved) => {
          auth.setProfileFromSave(saved);
          if (getProfileRole(saved) === 'operator') {
            persistIntendedRole('operator');
            setIntendedRole('operator');
            setBarangayCheckDone(false);
            refreshOperatorBarangay();
          } else {
            clearIntendedRole();
            setIntendedRole(null);
          }
        }}
        onLogout={handleLogout}
      />
    );
  }

  const needsHouseholdSetup =
    Boolean(auth.session) &&
    wantsHousehold &&
    (auth.needsProfile || !auth.profile || profileRole !== 'household');

  const needsOperatorProfile =
    Boolean(auth.session) && auth.needsProfile && (wantsOperator || !wantsHousehold);

  if ((needsHouseholdSetup || needsOperatorProfile) && auth.session) {
    return (
      <Login
        needsProfile
        session={auth.session}
        supabaseEnabled={auth.supabaseEnabled}
        defaultRole={wantsHousehold ? 'household' : 'operator'}
        forceHousehold={wantsHousehold}
        onSwitchToOperator={() => {
          clearIntendedRole();
          setIntendedRole('operator');
          persistIntendedRole('operator');
        }}
        onProfileComplete={(saved) => {
          auth.setProfileFromSave(saved);
          setDemoUser(null);
          clearIntendedRole();
          setIntendedRole(null);
        }}
        onSignIn={() => {}}
      />
    );
  }

  if (auth.session && auth.profile && profileRole === 'household') {
    return (
      <HouseholdRoutes
        householdUser={profileToUser(auth.profile)}
        accessToken={auth.session.access_token}
        onLogout={handleLogout}
        onCheckStatus={handleCheckApprovalStatus}
        onSwitchToOperator={handleSwitchToOperator}
        checking={statusChecking}
      />
    );
  }

  const activeUser = demoUser ?? auth.user;

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
            <button
              type="button"
              onClick={() => auth.refreshProfile(auth.session.access_token)}
              className="w-full h-10 rounded-md bg-sk-accent text-white text-sm font-semibold mb-2"
            >
              Retry
            </button>
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

    if (!auth.session) {
      return (
        <Login
          supabaseEnabled={auth.supabaseEnabled}
          onIntendedRoleChange={(role) => {
            setIntendedRole(role);
            persistIntendedRole(role);
          }}
          onSignIn={({ user, session }) => {
            if (user?.role === 'household') {
              setDemoUser(user);
              return;
            }
            setDemoUser(null);
            if (session && auth.profile && getProfileRole(auth.profile) === 'operator') {
              setDemoUser(profileToUser(auth.profile));
            }
          }}
          onProfileComplete={(saved) => auth.setProfileFromSave(saved)}
        />
      );
    }

    return <LoadingScreen message="Setting up your session…" />;
  }

  if (demoUser?.role === 'household') {
    return <HouseholdRoutes householdUser={demoUser} onLogout={handleLogout} />;
  }

  if (
    profileRole === 'operator' &&
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
    operatorBarangay?.name ?? auth.profile?.barangay_name ?? 'Barangay Mabini';
  const barangayCode = operatorBarangay?.barangay_code ?? auth.profile?.barangay_code ?? null;

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
