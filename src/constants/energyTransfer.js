/** Placeholder data for Energy Transfer — wire to MQTT/API later */

export const initialDevices = [
  { id: 'ESP32_A1', mac: 'AA:BB:CC:DD:EE:01', house: 'House A', solar: true, status: 'Online' },
  { id: 'ESP32_B2', mac: 'AA:BB:CC:DD:EE:02', house: 'House B', solar: false, status: 'Online' },
  { id: 'ESP32_C3', mac: 'AA:BB:CC:DD:EE:03', house: 'House C', solar: true, status: 'Offline' },
];

export const initialTxHistory = [
  { time: '08:32 AM', from: 'House A', to: 'House B', kw: '0.10', status: 'Success' },
  { time: '08:15 AM', from: 'House C', to: 'House B', kw: '0.06', status: 'Success' },
  { time: '07:50 AM', from: 'House A', to: 'House B', kw: '0.08', status: 'Success' },
  { time: '07:20 AM', from: 'House A', to: 'House C', kw: '0.05', status: 'Failed' },
];

export const initialAutomationLog = [
  { time: '10:23:45', decision: 'House A → House B (100W)', soc: '45%', reason: 'Surplus high' },
  { time: '10:18:22', decision: 'Battery charging (120W)', soc: '42%', reason: 'Solar surplus' },
  { time: '10:13:07', decision: 'House C → House B (50W)', soc: '40%', reason: 'Fairness adj.' },
];

export const surplusSources = [
  { value: 'House A', surplus: 100 },
  { value: 'House C', surplus: 60 },
];
