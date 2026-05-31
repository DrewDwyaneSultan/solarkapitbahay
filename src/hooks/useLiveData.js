import { useEffect, useRef, useState } from 'react';

function useInterval(callback, delay) {
  const saved = useRef(callback);
  useEffect(() => {
    saved.current = callback;
  }, [callback]);
  useEffect(() => {
    if (delay === null) return undefined;
    const id = setInterval(() => saved.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

const initial = {
  houseA: { solar: 180, load: 80, relay: true, name: 'House A' },
  houseB: { solar: 0, load: 150, relay: false, name: 'House B' },
  houseC: { solar: 120, load: 60, relay: true, name: 'House C' },
  battery: 45,
  savings: 1250,
  gridRed: 32,
  gini: 0.18,
  co2: 45,
};

export function useLiveData() {
  const [data, setData] = useState(initial);

  useInterval(() => {
    setData((d) => ({
      ...d,
      houseA: { ...d.houseA, solar: 160 + Math.round(Math.random() * 40) },
      houseB: { ...d.houseB, load: 120 + Math.round(Math.random() * 60) },
      houseC: { ...d.houseC, solar: 100 + Math.round(Math.random() * 40) },
      battery: Math.max(20, Math.min(95, d.battery + (Math.random() - 0.4) * 2)),
    }));
  }, 3000);

  return data;
}

export function getHouseCards(data) {
  return [
    {
      name: data.houseA.name,
      solar: data.houseA.solar,
      load: data.houseA.load,
      relay: data.houseA.relay,
      surplus: data.houseA.solar - data.houseA.load,
    },
    {
      name: data.houseB.name,
      solar: data.houseB.solar,
      load: data.houseB.load,
      relay: data.houseB.relay,
      surplus: data.houseB.solar - data.houseB.load,
    },
    {
      name: data.houseC.name,
      solar: data.houseC.solar,
      load: data.houseC.load,
      relay: data.houseC.relay,
      surplus: data.houseC.solar - data.houseC.load,
    },
  ];
}
