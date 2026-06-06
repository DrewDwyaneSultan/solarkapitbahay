import React from 'react';
import StatTile from '../../components/ui/StatTile';
import BatteryActionIndicator from '../../components/clustering/BatteryActionIndicator';
import BatteryOrganism from '../../components/energy/BatteryOrganism';
import { otherCircuit, resolveCircuit } from '../../constants/circuits';
import { useHouseholdCluster } from '../../hooks/useClustering';
import { getMemberHouse, getMemberSurplus, useLiveData } from '../../hooks/useLiveData';
import { householdMemberStats } from '../../constants/mockSimulation';

export default function ViewBatterySharingPage({ householdId = 'HH-01' }) {
  const data = useLiveData();
  const { record: cluster } = useHouseholdCluster(householdId);
  const mine = resolveCircuit(householdId);
  const peer = otherCircuit(householdId);
  const myHouse = getMemberHouse(data, householdId);
  const mySurplus = getMemberSurplus(data, householdId);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-serif text-2xl font-semibold text-[#2c1f1a]">Battery Sharing</h2>
        <p className="text-sm text-black/55 mt-1">
          {mine.name} ↔ {peer.name} · community battery (2 circuits)
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 max-w-lg">
        {householdMemberStats.map((s) => (
          <StatTile key={s.id} label={s.label} value={s.value} bgKey={s.bgKey} icon="🔋" />
        ))}
      </div>

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
              {mySurplus >= 0 ? '+' : ''}
              {mySurplus}W
            </span>
          </li>
          <li className="flex justify-between">
            <span>Load / solar</span>
            <span className="font-mono">
              {myHouse.load}W / {myHouse.solar}W
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
