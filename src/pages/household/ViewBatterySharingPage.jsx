import React from 'react';
import StatTile from '../../components/ui/StatTile';
import PlaceholderSlot from '../../components/ui/PlaceholderSlot';
import { householdMemberRows, householdMemberStats } from '../../constants/mockSimulation';

export default function ViewBatterySharingPage() {
  return (
    <div className="rounded-2xl border border-black/10 bg-[#7b704f] shadow-sm p-5 text-white">
      <div className="grid grid-cols-2 gap-3 max-w-[420px]">
        {householdMemberStats.map((s) => (
          <div key={s.id} className="text-[#2c1f1a]">
            <StatTile label={s.label} value={s.value} bgKey={s.bgKey} />
          </div>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-5">
        <div className="space-y-3">
          {householdMemberRows.map((r) => (
            <div key={r.id} className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-full bg-white/20 border border-white/20" />
              <div className="flex-1">
                <div className="h-2.5 rounded-full bg-white/25 overflow-hidden">
                  <div className="h-full bg-white/70" style={{ width: r.ok ? '74%' : '38%' }} />
                </div>
              </div>
              <span className="w-10 flex justify-center">
                {r.ok ? (
                  <span className="text-emerald-300 font-bold">✓</span>
                ) : (
                  <span className="text-rose-300 font-bold">✕</span>
                )}
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <PlaceholderSlot variant="chart" label="Chart placeholder" className="bg-white/25 border-white/15" />
          <PlaceholderSlot variant="chart" label="Chart placeholder" className="bg-white/25 border-white/15" />
        </div>
      </div>
    </div>
  );
}

