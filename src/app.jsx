import React, { useCallback, useEffect, useState } from 'react';
import Login from './login';
import OperatorDashboard from './pages/OperatorDashboard';
import HouseholdMemberApp from './pages/household/HouseholdMemberApp';
import HouseholdStatusScreen from './pages/household/HouseholdStatusScreen';
import BarangayOnboarding from './pages/BarangayOnboarding';
import AccountRoleGate from './components/auth/AccountRoleGate';
import {
  useAuth,
  profileToUser,
  getProfileRole,
  getProfileRoles,
  profileHasRole,
} from './hooks/useAuth';
import { fetchMyBarangay } from './services/registrationApi';
import { switchToOperator, switchActiveRole } from './services/authApi';
import {
  clearIntendedRole,
  consumeIntendedRoleFromUrl,
  persistIntendedRole,
  readIntendedRole,
} from './utils/intendedRole';
import {
  clearActiveRole,
  persistActiveRole,
  readActiveRole,
  resolveActiveRole,
} from './utils/activeRole';
import { rolesKey } from './utils/profileRoles';

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
  profileRoles,
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
        hasOperatorAccess={profileRoles?.includes('operator')}
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
  const [activeRole, setActiveRole] = useState(null);
  const [statusChecking, setStatusChecking] = useState(false);
  const [addingHousehold, setAddingHousehold] = useState(false);

  useEffect(() => {
    const fromOAuth = consumeIntendedRoleFromUrl();
    if (fromOAuth) {
      setIntendedRole(fromOAuth);
      return;
    }
    const stored = readIntendedRole();
    if (stored) setIntendedRole(stored);
  }, []);

  useEffect(() => {
    if (!auth.profile) return;
    const roles = getProfileRoles(auth.profile);
    const stored = readActiveRole();
    if (stored && roles.includes(stored)) {
      setActiveRole(stored);
      return;
    }
    const resolved = resolveActiveRole(auth.profile, intendedRole ?? readIntendedRole());
    setActiveRole(resolved);
    persistActiveRole(resolved);
  }, [auth.profile?.id, auth.profile ? rolesKey(auth.profile) : '']);

  const profileRoles = auth.profile ? getProfileRoles(auth.profile) : [];
  const effectiveIntended = intendedRole ?? readIntendedRole();
  const viewRole = activeRole ?? (auth.profile ? resolveActiveRole(auth.profile, effectiveIntended) : null);

  const handleLogout = async () => {
    await auth.signOut();
    setDemoUser(null);
    setOperatorBarangay(null);
    setBarangayCheckDone(false);
    clearIntendedRole();
    clearActiveRole();
    setIntendedRole(null);
    setActiveRole(null);
    setAddingHousehold(false);
  };

  const refreshOperatorBarangay = useCallback(async () => {
    if (!auth.session?.access_token || !profileHasRole(auth.profile, 'operator')) {
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

  const handleRoleSwitch = useCallback(
    async (newRole) => {
      if (!profileHasRole(auth.profile, newRole)) return;

      clearIntendedRole();
      setIntendedRole(null);
      persistActiveRole(newRole);
      setActiveRole(newRole);

      if (auth.session?.access_token) {
        try {
          const updated = await switchActiveRole(auth.session.access_token, newRole);
          auth.setProfileFromSave(updated);
        } catch {
          /* client-side view already switched */
        }
      }

      if (newRole === 'operator') {
        setBarangayCheckDone(false);
        await refreshOperatorBarangay();
      }
    },
    [auth.session?.access_token, auth.profile, auth.setProfileFromSave, refreshOperatorBarangay],
  );

  const handleSwitchToOperator = useCallback(async () => {
    if (!auth.session?.access_token) return;
    if (profileHasRole(auth.profile, 'operator')) {
      await handleRoleSwitch('operator');
      return;
    }
    const updated = await switchToOperator(auth.session.access_token);
    auth.setProfileFromSave(updated);
    await handleRoleSwitch('operator');
  }, [auth.session?.access_token, auth.profile, auth.setProfileFromSave, handleRoleSwitch]);

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

    const isOperator = profileHasRole(auth.profile, 'operator') && auth.supabaseEnabled && auth.session;

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

  const wantsHousehold = effectiveIntended === 'household';
  const wantsOperator = effectiveIntended === 'operator';

  const missingIntendedRole =
    auth.session &&
    auth.profile &&
    effectiveIntended &&
    ((wantsOperator && !profileHasRole(auth.profile, 'operator')) ||
      (wantsHousehold && !profileHasRole(auth.profile, 'household')));

  if (missingIntendedRole && !addingHousehold) {
    return (
      <AccountRoleGate
        profile={auth.profile}
        intendedRole={wantsHousehold ? 'household' : 'operator'}
        accessToken={auth.session.access_token}
        onAddHousehold={() => {
          setAddingHousehold(true);
          persistIntendedRole('household');
          setIntendedRole('household');
        }}
        onResolved={(saved, role) => {
          auth.setProfileFromSave(saved);
          if (role) {
            persistActiveRole(role);
            setActiveRole(role);
          }
          clearIntendedRole();
          setIntendedRole(null);
          if (role === 'operator') {
            setBarangayCheckDone(false);
            refreshOperatorBarangay();
          }
        }}
        onLogout={handleLogout}
      />
    );
  }

  const needsHouseholdSetup =
    Boolean(auth.session) &&
    (addingHousehold || wantsHousehold) &&
    (auth.needsProfile || !auth.profile || !profileHasRole(auth.profile, 'household'));

  const needsOperatorProfile =
    Boolean(auth.session) &&
    auth.needsProfile &&
    (wantsOperator || !wantsHousehold) &&
    !profileHasRole(auth.profile, 'household');

  if ((needsHouseholdSetup || needsOperatorProfile) && auth.session) {
    return (
      <Login
        needsProfile
        session={auth.session}
        supabaseEnabled={auth.supabaseEnabled}
        defaultRole={wantsHousehold || addingHousehold ? 'household' : 'operator'}
        forceHousehold={wantsHousehold || addingHousehold}
        onSwitchToOperator={() => {
          setAddingHousehold(false);
          clearIntendedRole();
          setIntendedRole('operator');
          persistIntendedRole('operator');
        }}
        onProfileComplete={(saved) => {
          auth.setProfileFromSave(saved);
          setDemoUser(null);
          setAddingHousehold(false);
          const nextRole = getProfileRole(saved, wantsHousehold ? 'household' : 'operator');
          persistActiveRole(nextRole);
          setActiveRole(nextRole);
          clearIntendedRole();
          setIntendedRole(null);
        }}
        onSignIn={() => {}}
      />
    );
  }

  if (auth.session && auth.profile && viewRole === 'household' && profileHasRole(auth.profile, 'household')) {
    return (
      <HouseholdRoutes
        householdUser={profileToUser(auth.profile, 'household')}
        accessToken={auth.session.access_token}
        profileRoles={profileRoles}
        onLogout={handleLogout}
        onCheckStatus={handleCheckApprovalStatus}
        onSwitchToOperator={handleSwitchToOperator}
        checking={statusChecking}
      />
    );
  }

  if (!auth.session && !demoUser) {
    return (
      <Login
        supabaseEnabled={auth.supabaseEnabled}
        onIntendedRoleChange={(role) => {
          setIntendedRole(role);
          persistIntendedRole(role);
        }}
        onSignIn={({ user }) => {
          if (user?.role === 'household') setDemoUser(user);
          else setDemoUser(null);
        }}
        onProfileComplete={(saved) => auth.setProfileFromSave(saved)}
      />
    );
  }

  if (auth.session && auth.authError && !auth.profile) {
    return (
      <div className="min-h-screen bg-sk-canvas flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-amber-200 bg-white p-8 shadow-lg">
          <h2 className="font-serif text-xl font-semibold text-sk-ink mb-2">Signed in, but app setup incomplete</h2>
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

  const activeUser = demoUser ?? (auth.profile ? profileToUser(auth.profile, viewRole ?? 'operator') : null);

  if (!activeUser && auth.session && !auth.profile && !auth.authError) {
    return <LoadingScreen message="Setting up your session…" />;
  }

  if (demoUser?.role === 'household') {
    return <HouseholdRoutes householdUser={demoUser} onLogout={handleLogout} />;
  }

  if (
    profileHasRole(auth.profile, 'operator') &&
    auth.supabaseEnabled &&
    auth.session &&
    !demoUser &&
    viewRole === 'operator' &&
    barangayCheckDone &&
    !operatorBarangay &&
    !auth.profile?.barangay_id &&
    !auth.profile?.operator_barangay_code
  ) {
    return (
      <BarangayOnboarding
        accessToken={auth.session.access_token}
        operatorName={activeUser?.name}
        onComplete={async () => {
          await auth.refreshProfile(auth.session.access_token);
          await refreshOperatorBarangay();
        }}
      />
    );
  }

  const barangayName =
    operatorBarangay?.name ??
    auth.profile?.operator_barangay_name ??
    auth.profile?.barangay_name ??
    'Barangay Mabini';
  const barangayCode =
    operatorBarangay?.barangay_code ??
    auth.profile?.operator_barangay_code ??
    auth.profile?.barangay_code ??
    null;

  if (
    auth.session &&
    auth.profile &&
    viewRole !== 'household' &&
    profileHasRole(auth.profile, 'operator')
  ) {
    return (
      <OperatorDashboard
        operator={{
          initials: activeUser?.initials ?? 'JU',
          name: activeUser?.name ?? 'Operator',
          role: activeUser?.roleLabel ?? 'Barangay Operator',
        }}
        barangayName={barangayName}
        barangayCode={barangayCode}
        accessToken={auth.session?.access_token ?? null}
        onLogout={handleLogout}
      />
    );
  }

  return <LoadingScreen message="Loading your dashboard…" />;
}

export default App;
