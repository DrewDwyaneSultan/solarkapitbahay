import React, { useState } from 'react';
import StatTile from '../../components/ui/StatTile';
import { useLiveData } from '../../hooks/useLiveData';
import { householdMemberStats } from '../../constants/mockSimulation';

export default function ViewBatterySharingPage() {
  const data = useLiveData();
  const [pulse, setPulse] = useState(0);

  React.useEffect(() => {
    const id = setInterval(() => setPulse((p) => p + 1), 1200);
    return () => clearInterval(id);
  }, []);

  const pct = Math.round(data.battery);
  const sharingTo = 'House B';
  const transferW = 95;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-serif text-2xl font-semibold text-[#2c1f1a]">Battery Sharing</h2>
        <p className="text-sm text-black/55 mt-1">Live community battery and energy routed to neighbors</p>
      </div>

      <div className="grid grid-cols-2 gap-3 max-w-lg">
        {householdMemberStats.map((s) => (
          <StatTile key={s.id} label={s.label} value={s.value} bgKey={s.bgKey} icon="🔋" />
        ))}
      </div>

      <section className="rounded-2xl border border-black/10 bg-gradient-to-br from-[#8a7d5c] to-[#6b5a3d] p-6 text-white shadow-md">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-4">
          Community battery — energy transfer state
        </p>

        <div className="relative rounded-3xl border-[3px] border-emerald-400/80 bg-[#2c1f1a]/20 p-6 overflow-hidden">
          <div className="absolute top-4 right-4 text-right">
            <p className="text-3xl font-bold font-mono tabular-nums">{pct}%</p>
            <p className="text-[10px] uppercase tracking-widest text-white/60">State of charge</p>
          </div>

          <div className="h-3 rounded-full bg-white/20 overflow-hidden mb-8 max-w-md">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-amber-300 transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-3 min-h-[160px]">
            <HouseBlock label="Your home" sub="House A" power={`+${data.houseA.solar - data.houseA.load}W`} role="sending" active />
            <FlowLine active={pulse % 2 === 0} />
            <BatteryBlock pct={pct} />
            <FlowLine active transferLabel={`${transferW}W`} />
            <HouseBlock label={sharingTo} sub="Receiving" power={`Need ${data.houseB.load}W`} role="receiving" active />
          </div>

          <p className="mt-6 text-center text-sm text-white/90">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-600/40 border border-emerald-300/50 px-3 py-1">
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
              Transferring {transferW}W to {sharingTo} via community battery
            </span>
          </p>
        </div>
      </section>

      <div className="rounded-xl border border-black/10 bg-white/55 p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-black/45 mb-3">Recent sharing activity</p>
        <ul className="space-y-2 text-sm">
          <li className="flex justify-between border-b border-black/5 pb-2">
            <span>To House B</span>
            <span className="font-mono font-semibold text-emerald-800">95W · Active</span>
          </li>
          <li className="flex justify-between border-b border-black/5 pb-2">
            <span>From community battery</span>
            <span className="font-mono">Yesterday 6:12 PM</span>
          </li>
          <li className="flex justify-between">
            <span>Received from House C</span>
            <span className="font-mono text-emerald-800">+40W</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

function HouseBlock({ label, sub, power, role, active }) {
  const isSend = role === 'sending';
  return (
    <div className="flex flex-col items-center text-center">
      <div
        className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl border-2 ${
          isSend ? 'border-emerald-300 bg-emerald-900/30' : 'border-amber-300 bg-amber-900/30'
        } ${active ? 'ring-2 ring-white/40' : ''}`}
      >
        🏠
      </div>
      <p className="mt-2 text-xs font-bold">{label}</p>
      <p className="text-[10px] text-white/60">{sub}</p>
      <p className={`text-xs font-mono font-bold mt-1 ${isSend ? 'text-emerald-300' : 'text-amber-200'}`}>{power}</p>
    </div>
  );
}

function BatteryBlock({ pct }) {
  return (
    <div className="flex flex-col items-center px-2">
      <div className="w-20 h-24 rounded-2xl border-[3px] border-emerald-400 bg-emerald-950/50 relative overflow-hidden flex items-end justify-center">
        <div className="absolute bottom-0 left-0 right-0 bg-emerald-500/80 transition-all" style={{ height: `${pct}%` }} />
        <span className="relative z-10 text-2xl mb-2">🔋</span>
      </div>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-widest">Community</p>
    </div>
  );
}

function FlowLine({ active, transferLabel }) {
  return (
    <div className="flex flex-col items-center gap-1 px-1 min-w-[48px]">
      <div className={`h-1 w-10 rounded ${active ? 'bg-amber-300 animate-pulse' : 'bg-white/20'}`} />
      {transferLabel && <span className="text-[9px] font-mono text-amber-200">{transferLabel}</span>}
      <span className="text-lg">{active ? '⚡' : '—'}</span>
    </div>
  );
}
