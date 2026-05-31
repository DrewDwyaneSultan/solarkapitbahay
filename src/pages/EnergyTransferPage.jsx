import React, { useEffect, useMemo, useState } from 'react';
import Card from '../components/ui/Card';
import Toggle from '../components/ui/Toggle';
import TransferAnimationOverlay from '../components/energy/TransferAnimationOverlay';
import { getHouseCards, useLiveData } from '../hooks/useLiveData';
import {
  initialAutomationLog,
  initialDevices,
  initialTxHistory,
  surplusSources,
} from '../constants/energyTransfer';

function fmtCountdown(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function EnergyTransferPage() {
  const liveData = useLiveData();
  const [autoMode, setAutoMode] = useState(true);
  const [showAutoLog, setShowAutoLog] = useState(false);
  const [countdown, setCountdown] = useState(154);
  const [fromHouse, setFromHouse] = useState('House A');
  const [recipients, setRecipients] = useState([
    { id: 1, house: 'House B', need: 150, amount: 80, inputVal: '80' },
  ]);
  const [devices, setDevices] = useState(initialDevices);
  const [scanning, setScanning] = useState(false);
  const [txHistory, setTxHistory] = useState(initialTxHistory);
  const [txLog] = useState(initialAutomationLog);
  const [showTransferAnim, setShowTransferAnim] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setCountdown((c) => (c <= 0 ? 300 : c - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  const selectedSurplus = surplusSources.find((s) => s.value === fromHouse)?.surplus ?? 0;
  const totalSending = recipients.reduce((sum, r) => sum + r.amount, 0);
  const canTransfer = totalSending > 0 && totalSending <= selectedSurplus && recipients.length > 0;
  const houseCards = getHouseCards(liveData);

  const updateAmount = (id, amount) => {
    const clamped = Math.max(0, Math.min(500, amount));
    setRecipients((rows) =>
      rows.map((r) => (r.id === id ? { ...r, amount: clamped, inputVal: String(clamped) } : r)),
    );
  };

  const addRecipient = () => {
    setRecipients((rows) => [
      ...rows,
      { id: Date.now(), house: 'House B', need: 150, amount: 50, inputVal: '50' },
    ]);
  };

  const removeRecipient = (id) => setRecipients((rows) => rows.filter((r) => r.id !== id));

  const doScan = () => {
    setScanning(true);
    setTimeout(() => setScanning(false), 1500);
  };

  const onTransferComplete = () => {
    setShowTransferAnim(false);
    const first = recipients[0];
    setTxHistory((h) => [
      {
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        from: fromHouse,
        to: first?.house ?? 'House B',
        kw: (totalSending / 1000).toFixed(2),
        status: 'Success',
      },
      ...h,
    ]);
    setCountdown(300);
  };

  const transferTarget = useMemo(() => recipients[0]?.house ?? 'House B', [recipients]);

  return (
    <>
      {showTransferAnim && (
        <TransferAnimationOverlay
          from={fromHouse}
          to={transferTarget}
          amount={totalSending}
          onComplete={onTransferComplete}
        />
      )}

      <div className="space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Card title="Automated Mode">
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${autoMode ? 'bg-emerald-600 animate-pulse' : 'bg-stone-400'}`} />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-sk-ink">
                    {autoMode ? 'Hybrid algorithm active' : 'Automation paused'}
                  </p>
                  <p className="text-xs text-sk-ink-muted">Decisions every 5 minutes when enabled</p>
                </div>
                <Toggle on={autoMode} onChange={setAutoMode} label="Toggle automated mode" />
              </div>
            </Card>

            <Card title="Live Snapshot">
              <div className="space-y-3">
                {[
                  { label: 'Solar A Generation', val: liveData.houseA.solar, unit: 'W', max: 250 },
                  { label: 'House A Load', val: liveData.houseA.load, unit: 'W', max: 250 },
                  { label: 'Battery SOC', val: Math.round(liveData.battery), unit: '%', max: 100 },
                ].map((row) => (
                  <MetricRow key={row.label} {...row} />
                ))}
                <div className="rounded-lg bg-sk-placeholder/60 px-3 py-2 text-sm">
                  <span className="font-semibold text-sk-ink">Current sharing:</span>{' '}
                  House A → House B (100W) <span className="text-emerald-800 text-xs font-bold ml-1">Active</span>
                </div>
              </div>
            </Card>

            <Card title="Next Automated Decision">
              <p className="font-mono text-3xl font-bold text-sk-ink tabular-nums">{fmtCountdown(countdown)}</p>
            </Card>

            <Card title="Registered Devices">
              <div className="flex gap-2 mb-3">
                <button type="button" onClick={doScan} disabled={scanning} className="h-8 px-3 rounded-md border border-sk-card-border/60 text-xs font-semibold hover:bg-sk-placeholder/40">
                  {scanning ? 'Scanning…' : 'Scan'}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDevices((p) => [
                      ...p,
                      {
                        id: `ESP32_X${p.length}`,
                        mac: `AA:BB:CC:DD:EE:0${p.length}`,
                        house: 'New House',
                        solar: false,
                        status: 'Online',
                      },
                    ])
                  }
                  className="h-8 px-3 rounded-md border border-sk-card-border/60 text-xs font-semibold hover:bg-sk-placeholder/40"
                >
                  + Manual
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest text-sk-ink-muted">
                      <th className="text-left py-2">Device</th>
                      <th className="text-left py-2">House</th>
                      <th className="text-left py-2">Solar</th>
                      <th className="text-left py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {devices.map((d) => (
                      <tr key={d.id} className="border-t border-sk-card-border/30">
                        <td className="py-2 font-mono text-xs">{d.id}</td>
                        <td className="py-2">{d.house}</td>
                        <td className="py-2">{d.solar ? 'Yes' : 'No'}</td>
                        <td className="py-2">
                          <StatusPill ok={d.status === 'Online'} label={d.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={() => setShowAutoLog((v) => !v)} className="mt-3 w-full h-8 rounded-md border border-sk-card-border/60 text-xs font-semibold hover:bg-sk-placeholder/40">
                {showAutoLog ? 'Hide' : 'View'} Automation Log
              </button>
              {showAutoLog && (
                <ul className="mt-3 space-y-2 text-xs">
                  {txLog.map((r, i) => (
                    <li key={i} className="border-b border-sk-card-border/20 pb-2">
                      <span className="font-mono text-sk-ink-muted">{r.time}</span> — {r.decision}
                      <span className="block text-sk-ink-muted">SOC {r.soc} · {r.reason}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-sk-accent/30 bg-amber-50/50 px-4 py-3">
              <p className="text-sm font-semibold text-sk-ink">Manual Override Controls</p>
              <p className="text-xs text-sk-ink-muted mt-1">Override automation for one transfer. Resumes after 5 minutes.</p>
            </div>

            <Card title="From (Surplus House)">
              <div className="grid grid-cols-2 gap-3">
                {surplusSources.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setFromHouse(s.value)}
                    className={`rounded-xl border-2 p-3 text-left transition-colors ${
                      fromHouse === s.value
                        ? 'border-emerald-700 bg-emerald-50'
                        : 'border-sk-card-border/40 bg-white hover:bg-sk-placeholder/30'
                    }`}
                  >
                    <p className="font-semibold text-sm">{s.value}</p>
                    <p className="text-xs text-emerald-800 font-mono">+{s.surplus}W surplus</p>
                  </button>
                ))}
              </div>
            </Card>

            <Card title="To (Recipients)">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs text-sk-ink-muted">Add households receiving energy</span>
                <button type="button" onClick={addRecipient} className="h-8 px-3 rounded-md border border-sk-card-border/60 text-xs font-semibold hover:bg-sk-placeholder/40">
                  + Add Recipient
                </button>
              </div>
              {recipients.map((r) => (
                <div key={r.id} className="rounded-xl bg-sk-placeholder/40 border border-sk-card-border/30 p-3 mb-3">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div>
                      <p className="font-semibold text-sm">{r.house}</p>
                      <p className="text-xs text-rose-800">Need: {r.need}W</p>
                    </div>
                    <button type="button" onClick={() => removeRecipient(r.id)} className="text-rose-700 text-xs font-bold">
                      Remove
                    </button>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={500}
                    step={5}
                    value={r.amount}
                    onChange={(e) => updateAmount(r.id, Number(e.target.value))}
                    className="sk-range w-full"
                    style={{ '--pct': `${(r.amount / 500) * 100}%` }}
                  />
                  <p className="text-xs font-mono mt-1">{r.amount}W</p>
                </div>
              ))}
            </Card>

            <div className={`rounded-xl border p-4 ${canTransfer ? 'border-emerald-300 bg-emerald-50/50' : 'border-sk-card-border/40'}`}>
              <div className="grid grid-cols-3 gap-2 text-center text-xs mb-4">
                <div>
                  <p className="text-sk-ink-muted uppercase tracking-widest">Sending</p>
                  <p className="font-mono font-bold text-lg">{totalSending}W</p>
                </div>
                <div>
                  <p className="text-sk-ink-muted uppercase tracking-widest">Available</p>
                  <p className="font-mono font-bold text-lg text-emerald-800">{selectedSurplus}W</p>
                </div>
                <div>
                  <p className="text-sk-ink-muted uppercase tracking-widest">Status</p>
                  <p className="font-bold text-lg">{canTransfer ? 'Ready' : 'Check'}</p>
                </div>
              </div>
              <button
                type="button"
                disabled={!canTransfer}
                onClick={() => setShowTransferAnim(true)}
                className="w-full h-11 rounded-xl bg-sk-run text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-sk-run-hover transition-colors"
              >
                Execute Manual Transfer
              </button>
            </div>

            <Card title="Recent Transfers">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-sk-ink-muted">
                    <th className="text-left py-2">Time</th>
                    <th className="text-left py-2">Route</th>
                    <th className="text-left py-2">kW</th>
                    <th className="text-left py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {txHistory.slice(0, 6).map((t, i) => (
                    <tr key={i} className="border-t border-sk-card-border/30">
                      <td className="py-2 font-mono text-xs">{t.time}</td>
                      <td className="py-2">{t.from} → {t.to}</td>
                      <td className="py-2 font-mono">{t.kw}</td>
                      <td className="py-2">
                        <StatusPill ok={t.status === 'Success'} label={t.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        </div>

        <Card title="Live Energy Status">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {houseCards.map((h) => (
              <HouseStatusCard key={h.name} house={h} />
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

function MetricRow({ label, val, unit, max }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-sk-ink-muted">{label}</span>
        <span className="font-mono font-semibold">{val}{unit}</span>
      </div>
      <div className="h-1.5 rounded-full bg-sk-placeholder overflow-hidden">
        <div className="h-full bg-sk-progress rounded-full transition-all" style={{ width: `${(val / max) * 100}%` }} />
      </div>
    </div>
  );
}

function HouseStatusCard({ house }) {
  const positive = house.surplus >= 0;
  return (
    <div className="rounded-xl border border-sk-card-border/40 bg-white/60 p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-semibold">{house.name}</p>
          <StatusPill ok={house.relay} label={house.relay ? 'Relay ON' : 'Relay OFF'} />
        </div>
        <p className={`font-mono font-bold ${positive ? 'text-emerald-800' : 'text-rose-800'}`}>
          {positive ? '+' : ''}{house.surplus}W
        </p>
      </div>
      {[
        { label: 'Solar', val: house.solar },
        { label: 'Load', val: house.load },
      ].map((s) => (
        <div key={s.label} className="mb-2">
          <div className="flex justify-between text-[11px] text-sk-ink-muted">
            <span>{s.label}</span>
            <span className="font-mono">{s.val}W</span>
          </div>
          <div className="h-1 rounded-full bg-sk-placeholder overflow-hidden">
            <div className="h-full bg-sk-accent/80" style={{ width: `${(s.val / 250) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusPill({ ok, label }) {
  return (
    <span
      className={`inline-flex text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
        ok ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
      }`}
    >
      {label}
    </span>
  );
}
