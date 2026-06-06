/** Energy Transfer — two ESP32 circuits (House A + House B). */

export const initialDevices = [
  { id: 'ESP32_A1', mac: 'AA:BB:CC:DD:EE:01', house: 'House A', solar: true, status: 'Online' },
  { id: 'ESP32_B2', mac: 'AA:BB:CC:DD:EE:02', house: 'House B', solar: false, status: 'Online' },
];

export const initialTxHistory = [
  { time: '08:32 AM', from: 'House A', to: 'House B', kw: '0.10', status: 'Success' },
  { time: '08:15 AM', from: 'House A', to: 'House B', kw: '0.06', status: 'Success' },
  { time: '07:50 AM', from: 'House A', to: 'House B', kw: '0.08', status: 'Success' },
];

export const initialAutomationLog = [
  { time: '10:23:45', decision: 'House A → House B (100W)', soc: '54%', reason: 'Greedy · surplus' },
  { time: '10:18:22', decision: 'Battery charging (120W)', soc: '52%', reason: 'Solar surplus' },
  { time: '10:13:07', decision: 'House A → House B (80W)', soc: '50%', reason: 'Peak hour draw' },
];

export const surplusSources = [
  { value: 'House A', surplus: 100 },
  { value: 'House B', surplus: 0 },
];
