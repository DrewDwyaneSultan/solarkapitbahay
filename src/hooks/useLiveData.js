import { useEffect, useState } from 'react';
import { resolveCircuit } from '../constants/circuits';
import { fetchLiveTelemetry } from '../services/liveApi';

const mockFallback = {
  houseA: {
    solar: 0,
    load: 0,
    relay: false,
    name: 'House A',
    status: 'OFFLINE',
    transfer: 'STOPPED',
    online: false,
    voltage: 0,
    current: 0,
  },
  houseB: {
    solar: 0,
    load: 0,
    relay: false,
    name: 'House B',
    status: 'OFFLINE',
    transfer: 'STOPPED',
    online: false,
    voltage: 0,
    current: 0,
  },
  battery: 0,
  batteryVoltage: 0,
  batteryStatus: 'UNKNOWN',
  mqttConnected: false,
  brokerConnected: false,
  housesOnline: 0,
  lastSync: null,
  transferLog: [],
  devices: [],
  surplusSources: [
    { value: 'House A', surplus: 0, status: 'OFFLINE' },
    { value: 'House B', surplus: 0, status: 'OFFLINE' },
  ],
  source: 'mock',
};

function houseFromApi(apiHouse, online) {
  const solar = online ? Number(apiHouse.solar ?? 0) : 0;
  const load = online ? Number(apiHouse.load ?? 0) : 0;
  return {
    name: apiHouse.name,
    solar,
    load,
    relay: online && Boolean(apiHouse.relay),
    voltage: online ? apiHouse.voltage : 0,
    current: online ? apiHouse.current : 0,
    status: online ? apiHouse.status : 'OFFLINE',
    transfer: apiHouse.transfer,
    online,
    battery_voltage: apiHouse.battery_voltage,
    battery_percent: apiHouse.battery_percent,
    battery_status: apiHouse.battery_status,
    wattage: online ? apiHouse.wattage : 0,
  };
}

function mapApiToState(api) {
  const brokerConnected = Boolean(api.mqtt?.connected);
  const housesOnline = Number(api.mqtt?.houses_online ?? 0);
  const houseAOnline = Boolean(api.houseA?.online);
  const houseBOnline = Boolean(api.houseB?.online);

  return {
    houseA: houseFromApi(api.houseA, houseAOnline),
    houseB: houseFromApi(api.houseB, houseBOnline),
    battery: housesOnline > 0 ? api.battery : 0,
    batteryVoltage: housesOnline > 0 ? (api.battery_voltage ?? api.battery) : 0,
    batteryStatus: housesOnline > 0 ? (api.battery_status ?? 'UNKNOWN') : 'UNKNOWN',
    brokerConnected,
    housesOnline: housesOnline || Number(houseAOnline) + Number(houseBOnline),
    mqttConnected: brokerConnected && (houseAOnline || houseBOnline),
    lastSync: api.mqtt?.last_message_at ?? null,
    transferLog: api.transfer_log ?? [],
    devices: api.devices ?? [],
    surplusSources: (api.surplus_sources ?? []).map((s, i) => {
      const online = i === 0 ? houseAOnline : houseBOnline;
      if (!online) return { ...s, surplus: 0, status: 'OFFLINE' };
      return s;
    }),
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
