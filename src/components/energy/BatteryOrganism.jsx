import React, { useEffect, useState } from 'react';

export default function BatteryOrganism({ data, capacityKwh = 100 }) {
  const pct = Math.round(data.battery);
  const battColor =
    pct > 60 ? 'border-emerald-700 text-emerald-800' : pct > 30 ? 'border-amber-600 text-amber-800' : 'border-rose-600 text-rose-800';
  const fillColor = pct > 60 ? '#5a8f5c' : pct > 30 ? '#c17a3a' : '#d23d2d';
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1200);
    return () => clearInterval(id);
  }, []);

  const surplusA = data.houseA.solar - data.houseA.load;
  const surplusC = data.houseC.solar - data.houseC.load;
  const needB = data.houseB.load - data.houseB.solar;

  return (
    <div className={`relative rounded-3xl border-[3px] bg-sk-card p-6 shadow-sm ${battColor.split(' ')[0]}`}>
      <div
        className={`absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-3 rounded-t-md ${battColor.includes('emerald') ? 'bg-emerald-700' : battColor.includes('amber') ? 'bg-amber-600' : 'bg-rose-600'}`}
      />
      <div className="absolute top-3 right-5 text-right">
        <p className="text-2xl font-bold tabular-nums font-mono">{pct}%</p>
        <p className="text-[10px] uppercase tracking-widest text-sk-ink-muted">
          {Math.round(pct * capacityKwh * 0.01)} kWh / {capacityKwh} kWh
        </p>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-bold uppercase tracking-widest">Community Battery</span>
      </div>

      <div className="h-2.5 rounded-full bg-sk-placeholder overflow-hidden mb-6">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: fillColor }} />
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 min-h-[140px]">
        <HouseNode label="House A" surplus={surplusA} sending={surplusA > 0} />
        <FlowArrow active={surplusA > 0} />
        <div className="flex flex-col items-center justify-center px-2">
          <div className="w-16 h-16 rounded-2xl bg-sk-sidebar/90 text-white flex items-center justify-center text-2xl shadow-inner">
            🔋
          </div>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-sk-ink-muted">Battery</p>
        </div>
        <FlowArrow active={needB > 0} />
        <HouseNode label="House B" surplus={-needB} sending={false} receiving={needB > 0} />
      </div>

      {surplusC > 0 && (
        <p className="mt-4 text-xs text-sk-ink-muted text-center">
          House C also supplying +{surplusC}W · pulse {tick % 2 === 0 ? '▸' : '▹'}
        </p>
      )}
    </div>
  );
}

function HouseNode({ label, surplus, sending, receiving }) {
  const positive = surplus >= 0;
  return (
    <div className="flex flex-col items-center text-center">
      <div
        className={`w-14 h-14 rounded-xl flex items-center justify-center text-xl border-2 ${
          positive ? 'border-emerald-600 bg-emerald-50' : 'border-rose-400 bg-rose-50'
        }`}
      >
        🏠
      </div>
      <p className="mt-2 text-xs font-bold text-sk-ink">{label}</p>
      <p className={`text-[10px] font-semibold ${positive ? 'text-emerald-800' : 'text-rose-800'}`}>
        {positive ? `+${surplus}W` : `${surplus}W`}
      </p>
      {sending && <span className="mt-1 text-[9px] uppercase tracking-widest text-emerald-700">Sending</span>}
      {receiving && <span className="mt-1 text-[9px] uppercase tracking-widest text-amber-800">Receiving</span>}
    </div>
  );
}

function FlowArrow({ active }) {
  return (
    <div className="flex flex-col items-center gap-1 px-1">
      <div className={`h-0.5 w-8 rounded ${active ? 'bg-sk-progress animate-pulse' : 'bg-sk-card-border/40'}`} />
      <span className="text-[10px] text-sk-ink-muted">{active ? '⚡' : '—'}</span>
    </div>
  );
}
