import React, { useState } from 'react';
import Login from './login';
import OperatorDashboard from './pages/OperatorDashboard';
import HouseholdMemberApp from './pages/household/HouseholdMemberApp';

function App() {
  const [auth, setAuth] = useState({ isAuthenticated: false, user: null });

  if (!auth.isAuthenticated) {
    return (
      <Login
        onSignIn={(payload) => {
          setAuth({ isAuthenticated: true, user: payload });
        }}
      />
    );
  }

  const user = auth.user;

  if (user.role === 'household') {
    return (
      <HouseholdMemberApp
        member={{ name: user.name ?? 'User' }}
        barangay={{ name: 'Barangay Mabini', householdCode: user.house ?? 'household_code' }}
      />
    );
  }

  return (
    <OperatorDashboard
      operator={{
        initials: user.initials ?? 'JU',
        name: user.name ?? 'Juan Ulbenario',
        role: 'Barangay Operator',
      }}
      barangayName="Barangay Mabini"
    />
  );
}

export default App;
