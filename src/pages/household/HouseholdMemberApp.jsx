import React, { useState } from 'react';
import HouseholdLayout from './HouseholdLayout';
import HouseholdDashboardPage from './HouseholdDashboardPage';
import ViewBatterySharingPage from './ViewBatterySharingPage';
import HouseholdSettingsPage from './HouseholdSettingsPage';

const pages = {
  memberDashboard: HouseholdDashboardPage,
  memberBattery: ViewBatterySharingPage,
  memberSettings: HouseholdSettingsPage,
};

export default function HouseholdMemberApp({ member, barangay }) {
  const [activePage, setActivePage] = useState('memberDashboard');
  const Page = pages[activePage] ?? HouseholdDashboardPage;

  return (
    <HouseholdLayout
      activePage={activePage}
      onNavigate={setActivePage}
      barangayName={barangay?.name ?? 'Barangay Name'}
      householdCode={barangay?.householdCode ?? 'household_code'}
      memberName={member?.name ?? 'User'}
    >
      <Page memberName={member?.name ?? 'User'} />
    </HouseholdLayout>
  );
}

