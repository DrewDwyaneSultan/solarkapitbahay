/** Placeholder data — replace with API responses when wired */

export const summaryStats = [
  { id: 'totalSavings', label: 'Total Savings', value: '₱12,450', bgKey: 'savings' },
  { id: 'solarGenerated', label: 'Solar Generated', value: '1,240 kWh', bgKey: 'solar' },
  { id: 'batterySoc', label: 'Battery SOC', value: '78%', bgKey: 'battery' },
  { id: 'gridReduction', label: 'Grid Reduction', value: '34%', bgKey: 'grid' },
];

export const householdComparison = [
  { id: 'HH-01', share: 82 },
  { id: 'HH-02', share: 22 },
  { id: 'HH-04', share: 65 },
  { id: 'HH-05', share: 48 },
  { id: 'HH-08', share: 91 },
  { id: 'HH-10', share: 36 },
];

export const navItems = {
  overview: [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
    { id: 'energyTransfer', label: 'Energy Transfer', icon: 'zap' },
    { id: 'simulation', label: 'Simulation', icon: 'play' },
    { id: 'households', label: 'Households', icon: 'house' },
  ],
  operator: [
    { id: 'alerts', label: 'Alerts', icon: 'bell' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ],
};

export const householdRows = [
  {
    id: 'HH-01',
    headName: 'Ramon D.',
    address: 'Purok 2',
    hasSolar: true,
    hasBattery: true,
    status: 'active',
  },
  {
    id: 'HH-02',
    headName: 'Linda S.',
    address: 'Purok 3',
    hasSolar: false,
    hasBattery: false,
    status: 'pending',
  },
  {
    id: 'HH-04',
    headName: 'Father C.',
    address: 'Purok 1',
    hasSolar: true,
    hasBattery: false,
    status: 'active',
  },
  {
    id: 'HH-05',
    headName: 'Mila G.',
    address: 'Purok 4',
    hasSolar: false,
    hasBattery: true,
    status: 'inactive',
  },
  {
    id: 'HH-08',
    headName: 'Arnel P.',
    address: 'Purok 5',
    hasSolar: true,
    hasBattery: true,
    status: 'active',
  },
];

export const alertsMock = [
  {
    id: 'AL-001',
    kind: 'warning',
    title: 'Household approaching minimum supply',
    message: 'HH-02 is nearing minimum battery allocation. Consider rebalancing.',
    at: 'Today · 4:12 PM',
  },
  {
    id: 'AL-002',
    kind: 'info',
    title: 'Simulation completed',
    message: 'Simulation ran successfully with current parameters.',
    at: 'Today · 2:08 PM',
  },
  {
    id: 'AL-003',
    kind: 'danger',
    title: 'Excess capacity detected',
    message: 'Community battery exceeded configured cap threshold (placeholder).',
    at: 'Yesterday · 6:31 PM',
  },
];

export const householdMemberNav = [
  { id: 'memberDashboard', label: 'Dashboard', icon: 'grid' },
  { id: 'memberBattery', label: 'View battery sharing', icon: 'battery' },
  { id: 'memberSettings', label: 'Settings', icon: 'settings' },
];

export const householdMemberStats = [
  { id: 'savings', label: 'Total Savings', value: '₱1,240', bgKey: 'savings' },
  { id: 'solar', label: 'Solar Generated', value: '124 kWh', bgKey: 'solar' },
  { id: 'soc', label: 'Battery SOC', value: '63%', bgKey: 'battery' },
  { id: 'grid', label: 'Grid Reduction', value: '18%', bgKey: 'grid' },
];

export const householdMemberRows = [
  { id: 'HH-01', ok: true, note: 'Supplying' },
  { id: 'HH-02', ok: false, note: 'Consuming' },
  { id: 'HH-04', ok: true, note: 'Supplying' },
  { id: 'HH-05', ok: false, note: 'Consuming' },
  { id: 'HH-08', ok: true, note: 'Supplying' },
  { id: 'HH-10', ok: false, note: 'Consuming' },
];
