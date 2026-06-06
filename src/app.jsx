import React, { useState } from 'react';
import Login from './login';
import OperatorDashboard from './pages/OperatorDashboard';
import HouseholdMemberApp from './pages/household/HouseholdMemberApp';
import { useAuth, profileToUser } from './hooks/useAuth';

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

  const handleLogout = async () => {
    await auth.signOut();
    setDemoUser(null);
  };

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
    return (
      <HouseholdMemberApp
        member={{
          name: activeUser.name ?? 'User',
          householdId: activeUser.householdId ?? 'HH-01',
        }}
        barangay={{
          name: 'Barangay Mabini',
          householdCode: activeUser.house ?? 'household_code',
        }}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <OperatorDashboard
      operator={{
        initials: activeUser.initials ?? 'JU',
        name: activeUser.name ?? 'Operator',
        role: activeUser.roleLabel ?? 'Barangay Operator',
      }}
      barangayName="Barangay Mabini"
      onLogout={handleLogout}
    />
  );
}

export default App;
