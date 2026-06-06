/** Design tokens shared across dashboard views */
export const colors = {
  sidebar: '#3d2b24',
  sidebarActive: '#5a4339',
  sidebarBorder: '#6b5248',
  canvas: '#f2ece1',
  card: '#faf6ef',
  cardBorder: '#8b7355',
  ink: '#2c1f1a',
  inkMuted: '#6b5d54',
  accent: '#c17a3a',
  runButton: '#3e6640',
  runButtonHover: '#345735',
  statSavings: '#8fa88f',
  statSolar: '#e8c98a',
  statBattery: '#9aabb8',
  statGrid: '#a89888',
  progressFill: '#5a8f5c',
  placeholder: '#e8dfd0',
};

export const simulationDefaults = {
  households: { min: 5, max: 100, value: 50 },
  batteryCapacity: { min: 10, max: 200, value: 100, unit: 'kWh' },
  minSoc: { min: 10, max: 50, value: 20 },
  maxSoc: { min: 70, max: 100, value: 90 },
  peakTariff: 15.0,
  durationDays: 30,
};
