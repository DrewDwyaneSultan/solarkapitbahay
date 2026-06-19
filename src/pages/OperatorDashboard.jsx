import React, { useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import ComingSoonPage from './ComingSoonPage';
import DashboardPage from './DashboardPage';
import EnergyTransferPage from './EnergyTransferPage';
import HouseholdsPage from './HouseholdsPage';
import AlertsPage from './AlertsPage';
import SettingsPage from './SettingsPage';
import SimulationPage from './SimulationPage';

const pageComponents = {
  dashboard: DashboardPage,
  energyTransfer: EnergyTransferPage,
  simulation: SimulationPage,
  households: HouseholdsPage,
  alerts: AlertsPage,
  settings: SettingsPage,
};

const headerSubtitles = {
  simulation: 'Total Registrations:',
  dashboard: 'Overview',
  energyTransfer: 'Live energy routing',
  households: 'Registered Households',
  alerts: 'System Alerts',
  settings: 'Operator Settings',
};

export default function OperatorDashboard({
  operator,
  barangayName,
  barangayCode,
  accessToken,
  onLogout,
}) {
  const [activePage, setActivePage] = useState('dashboard');

  const PageView = pageComponents[activePage] ?? (() => <ComingSoonPage pageId={activePage} />);

  return (
    <DashboardLayout
      activePage={activePage}
      onNavigate={setActivePage}
      operator={operator}
      barangayName={barangayName}
      headerSubtitle={headerSubtitles[activePage]}
      onLogout={onLogout}
    >
      {activePage === 'dashboard' ? (
        <DashboardPage operatorName={operator?.name} />
      ) : activePage === 'households' ? (
        <HouseholdsPage accessToken={accessToken} barangayCode={barangayCode} />
      ) : activePage === 'energyTransfer' ? (
        <EnergyTransferPage accessToken={accessToken} />
      ) : (
        <PageView />
      )}
    </DashboardLayout>
  );
}
