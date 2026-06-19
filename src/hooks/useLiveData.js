import { useEffect, useState } from 'react';
import { resolveCircuit } from '../constants/circuits';
import { fetchLiveTelemetry } from '../services/liveApi';

const mockFallback = {
  houseA: {
    solar: 180,
    load: 80,
    relay: false,
    name: 'House A',
    status: 'UNKNOWN',
    transfer: 'STOPPED',
    online: false,
    voltage: 0,
    current: 0,
  },
  houseB: {
    solar: 0,
    load: 150,
    relay: false,
    name: 'House B',
    status: 'UNKNOWN',
    transfer: 'STOPPED',
    online: false,
    voltage: 0,
    current: 0,
  },
  battery: 54,
  batteryVoltage: 0,
  batteryStatus: 'UNKNOWN',
  savings: 1250,
  gridRed: 32,
  gini: 0.18,
  co2: 45,
  mqttConnected: false,
  brokerConnected: false,
  housesOnline: 0,
  lastSync: null,
  transferLog: [],
  devices: [],
  surplusSources: [
    { value: 'House A', surplus: 100, status: 'SURPLUS' },
    { value: 'House B', surplus: 0, status: 'DEFICIT' },
  ],
  source: 'mock',
};

function mapApiToState(api) {
  const brokerConnected = Boolean(api.mqtt?.connected);
  const housesOnline = Number(api.mqtt?.houses_online ?? 0);
  const houseAOnline = Boolean(api.houseA?.online);
  const houseBOnline = Boolean(api.houseB?.online);

  return {
    houseA: {
      name: api.houseA.name,
      solar: api.houseA.solar,
      load: api.houseA.load,
      relay: houseAOnline && Boolean(api.houseA.relay),
      voltage: api.houseA.voltage,
      current: api.houseA.current,
      status: api.houseA.status,
      transfer: api.houseA.transfer,
      online: houseAOnline,
      battery_voltage: api.houseA.battery_voltage,
      battery_percent: api.houseA.battery_percent,
      battery_status: api.houseA.battery_status,
    },
    houseB: {
      name: api.houseB.name,
      solar: api.houseB.solar,
      load: api.houseB.load,
      relay: houseBOnline && Boolean(api.houseB.relay),
      voltage: api.houseB.voltage,
      current: api.houseB.current,
      status: api.houseB.status,
      transfer: api.houseB.transfer,
      online: houseBOnline,
      battery_voltage: api.houseB.battery_voltage,
      battery_percent: api.houseB.battery_percent,
      battery_status: api.houseB.battery_status,
    },
    battery: api.battery,
    batteryVoltage: api.battery_voltage ?? api.battery,
    batteryStatus: api.battery_status ?? 'UNKNOWN',
    savings: api.savings,
    gridRed: api.gridRed,
    gini: api.gini,
    co2: api.co2,
    brokerConnected,
    housesOnline: housesOnline || Number(houseAOnline) + Number(houseBOnline),
    mqttConnected: brokerConnected && (houseAOnline || houseBOnline),
    lastSync: api.mqtt?.last_message_at ?? null,
    transferLog: api.transfer_log ?? [],
    devices: api.devices ?? [],
    surplusSources: api.surplus_sources ?? mockFallback.surplusSources,
    source: 'mqtt',
  };
}

export function useLiveData() {
  const [data, setData] = useState(mockFallback);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const api = await fetchLiveTelemetry();
        if (!cancelled) setData(mapApiToState(api));
      } catch {
        if (!cancelled) {
          setData((d) => ({ ...mockFallback, source: 'mock' }));
        }
      }
    }

    poll();
    const id = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return data;
}

export function getHouseCards(data) {
  return [
    {
      name: data.houseA.name,
      solar: data.houseA.solar,
      load: data.houseA.load,
      relay: data.houseA.online && data.houseA.relay,
      status: data.houseA.status,
      transfer: data.houseA.transfer,
      online: data.houseA.online,
      surplus: data.houseA.solar - data.houseA.load,
    },
    {
      name: data.houseB.name,
      solar: data.houseB.solar,
      load: data.houseB.load,
      relay: data.houseB.online && data.houseB.relay,
      status: data.houseB.status,
      transfer: data.houseB.transfer,
      online: data.houseB.online,
      surplus: data.houseB.solar - data.houseB.load,
    },
  ];
}

export function getMemberHouse(data, householdId) {
  const circuit = resolveCircuit(householdId);
  return data[circuit.key];
}

export function getMemberSurplus(data, householdId) {
  const house = getMemberHouse(data, householdId);
  return house.solar - house.load;
}
