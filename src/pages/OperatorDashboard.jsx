import React, { useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import ComingSoonPage from './ComingSoonPage';
import DashboardPage from './DashboardPage';
import EnergyTransferPage from './EnergyTransferPage';
import HouseholdsPage from './HouseholdsPage';
import AlertsPage from './AlertsPage';
import SettingsPage from './SettingsPage';
import SimulationPage from './SimulationPage';
import { LiveDataProvider, useLiveData } from '../hooks/useLiveData';
import { useLiveAlerts } from '../hooks/useLiveAlerts';
import { ToastProvider } from '../context/ToastContext';

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
  onBarangayUpdated,
}) {
  return (
    <LiveDataProvider>
      <ToastProvider>
        <OperatorDashboardInner
        operator={operator}
        barangayName={barangayName}
        barangayCode={barangayCode}
        accessToken={accessToken}
        onLogout={onLogout}
        onBarangayUpdated={onBarangayUpdated}
      />
      </ToastProvider>
    </LiveDataProvider>
  );
}

function OperatorDashboardInner({
  operator,
  barangayName,
  barangayCode,
  accessToken,
  onLogout,
  onBarangayUpdated,
}) {
  const [activePage, setActivePage] = useState('dashboard');
  const liveData = useLiveData();
  const alerts = useLiveAlerts(liveData);

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
        <EnergyTransferPage />
      ) : activePage === 'settings' ? (
        <SettingsPage
          accessToken={accessToken}
          barangayName={barangayName}
          barangayCode={barangayCode}
          operatorEmail={operator?.email ?? ''}
          onBarangayUpdated={onBarangayUpdated}
        />
      ) : activePage === 'alerts' ? (
        <AlertsPage liveData={liveData} alerts={alerts} />
      ) : (
        <PageView />
      )}
    </DashboardLayout>
  );
}
