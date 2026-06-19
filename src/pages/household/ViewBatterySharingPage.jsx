import React, { useMemo } from 'react';
import StatTile from '../../components/ui/StatTile';
import BatteryActionIndicator from '../../components/clustering/BatteryActionIndicator';
import BatteryOrganism from '../../components/energy/BatteryOrganism';
import { otherCircuit, resolveCircuit } from '../../constants/circuits';
import { useHouseholdCluster } from '../../hooks/useClustering';
import { estimateCo2Kg, useLatestSimulation } from '../../hooks/useLatestSimulation';
import { getMemberHouse, getMemberSurplus, useLiveData } from '../../hooks/useLiveData';

function formatCurrency(value) {
  return `₱${Number(value || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;
}

export default function ViewBatterySharingPage({ householdId = 'HH-01' }) {
  const data = useLiveData();
  const { results: sim } = useLatestSimulation();
  const { record: cluster } = useHouseholdCluster(householdId);
  const mine = resolveCircuit(householdId);
  const peer = otherCircuit(householdId);
  const myHouse = getMemberHouse(data, householdId);
  const mySurplus = getMemberSurplus(data, householdId);

  const householdShare = sim?.household_comparison?.find((h) => h.id === householdId)?.share;
  const shareFactor = householdShare != null ? householdShare / 100 : 0.25;
  const yourSolarKwh =
    sim?.solar_generated_kwh != null
      ? Math.round(sim.solar_generated_kwh * shareFactor)
      : null;

  const stats = useMemo(() => {
    const yourSavings = sim ? Math.round(sim.total_savings_php * shareFactor) : null;
    const soc = myHouse.online
      ? `${Math.round(myHouse.battery_percent ?? data.battery)}%`
      : '—';

    return [
      {
        id: 'savings',
        label: 'Your Savings',
        value: yourSavings != null ? formatCurrency(yourSavings) : '—',
        bgKey: 'savings',
      },
      {
        id: 'solar',
        label: 'Solar (live)',
        value: myHouse.online ? `${myHouse.solar} W` : '—',
        bgKey: 'solar',
      },
      {
        id: 'soc',
        label: 'Battery SOC',
        value: soc,
        bgKey: 'battery',
      },
      {
        id: 'grid',
        label: 'Grid Reduction',
        value: sim ? `${sim.grid_reduction_pct}%` : '—',
        bgKey: 'grid',
      },
    ];
  }, [sim, shareFactor, myHouse, data.battery]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-serif text-2xl font-semibold text-[#2c1f1a]">Battery Sharing</h2>
        <p className="text-sm text-black/55 mt-1">
          {mine.name} ↔ {peer.name} · community battery (2 circuits)
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 max-w-lg">
        {stats.map((s) => (
          <StatTile key={s.id} label={s.label} value={s.value} bgKey={s.bgKey} icon="🔋" />
        ))}
      </div>

      {sim && (
        <p className="text-xs text-black/50">
          CO₂ offset (community): ~{estimateCo2Kg(sim.solar_generated_kwh)} kg from latest simulation.
          {yourSolarKwh != null && ` Your share ≈ ${yourSolarKwh} kWh solar.`}
        </p>
      )}

      {cluster && (
        <BatteryActionIndicator
          action={cluster.action}
          label={cluster.action_label}
          description={cluster.action_description}
          size="md"
        />
      )}

      <BatteryOrganism data={data} />

      <div className="rounded-xl border border-black/10 bg-white/55 p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-black/45 mb-3">
          Your circuit — {mine.name}
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex justify-between border-b border-black/5 pb-2">
            <span>Net power</span>
            <span className="font-mono font-semibold text-emerald-800">
              {!myHouse.online ? '—' : `${mySurplus >= 0 ? '+' : ''}${mySurplus}W`}
            </span>
          </li>
          <li className="flex justify-between">
            <span>Load / solar</span>
            <span className="font-mono">
              {!myHouse.online ? '—' : `${myHouse.load}W / ${myHouse.solar}W`}
            </span>
          </li>
          <li className="flex justify-between border-t border-black/5 pt-2">
            <span>Status</span>
            <span className="font-mono">{myHouse.online ? myHouse.status : 'OFFLINE'}</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
