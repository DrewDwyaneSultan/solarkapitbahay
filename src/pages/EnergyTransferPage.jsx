import React, { useEffect, useMemo, useState } from 'react';
import Card from '../components/ui/Card';
import Toggle from '../components/ui/Toggle';
import { SunLogoIcon } from '../components/icons/NavIcons';
import TransferAnimationOverlay from '../components/energy/TransferAnimationOverlay';
import { getHouseCards, useLiveData } from '../hooks/useLiveData';
import { initialAutomationLog } from '../constants/energyTransfer';

function fmtCountdown(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function EnergyTransferPage() {
  const liveData = useLiveData();
  const [mode, setMode] = useState('auto');
  const [autoMode, setAutoMode] = useState(true);
  const [showAutoLog, setShowAutoLog] = useState(false);
  const [countdown, setCountdown] = useState(154);
  const [fromHouse, setFromHouse] = useState('House A');
  const [recipients, setRecipients] = useState([
    { id: 1, house: 'House B', need: 150, amount: 80 },
  ]);
  const [scanning, setScanning] = useState(false);
  const [txHistory, setTxHistory] = useState([]);
  const [txLog] = useState(initialAutomationLog);
  const [showTransferAnim, setShowTransferAnim] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setCountdown((c) => (c <= 0 ? 300 : c - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  const surplusSources = liveData.surplusSources ?? [];
  const devices = liveData.devices?.length ? liveData.devices : [];
  const mqttLive = liveData.mqttConnected;

  useEffect(() => {
    if (liveData.transferLog?.length) {
      setTxHistory(liveData.transferLog);
    }
  }, [liveData.transferLog]);

  const selectedSurplus = surplusSources.find((s) => s.value === fromHouse)?.surplus ?? 0;
  const totalSending = recipients.reduce((sum, r) => sum + r.amount, 0);
  const canTransfer = totalSending > 0 && totalSending <= selectedSurplus && recipients.length > 0;
  const houseCards = getHouseCards(liveData);

  const updateAmount = (id, amount) => {
    const clamped = Math.max(0, Math.min(500, amount));
    setRecipients((rows) => rows.map((r) => (r.id === id ? { ...r, amount: clamped } : r)));
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
          onClose={() => setShowTransferAnim(false)}
        />
      )}

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <ModeTab id="auto" label="Automated" active={mode === 'auto'} onClick={() => setMode('auto')} tone="emerald" />
          <ModeTab id="manual" label="Manual Override" active={mode === 'manual'} onClick={() => setMode('manual')} tone="amber" />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className={`w-2 h-2 rounded-full ${mqttLive ? 'bg-emerald-600 animate-pulse' : 'bg-amber-500'}`} />
          <span className="text-sk-ink-muted">
            {mqttLive ? 'Live MQTT · solar/A & solar/B' : 'Mock data — start backend + ESP32s for live readings'}
          </span>
        </div>

        <Card title="Live Snapshot">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'House A Solar', val: liveData.houseA.solar, unit: 'W', icon: '☀️' },
              { label: 'House B Solar', val: liveData.houseB.solar, unit: 'W', icon: '☀️' },
              { label: 'Battery SOC', val: Math.round(liveData.battery), unit: '%', icon: '🔋' },
            ].map((row) => (
              <div key={row.label} className="rounded-xl border border-sk-card-border/40 bg-white/70 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{row.icon}</span>
                  <SunLogoIcon className="w-4 h-4 text-amber-500 opacity-80" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-sk-ink-muted">{row.label}</span>
                </div>
                <p className="font-mono text-xl font-bold text-sk-ink">
                  {row.val}
                  <span className="text-sm font-medium text-sk-ink-muted ml-1">{row.unit}</span>
                </p>
              </div>
            ))}
          </div>
        </Card>

        {mode === 'auto' ? (
          <div className="rounded-2xl border-2 border-emerald-300/80 bg-gradient-to-br from-emerald-50/90 to-white p-4 space-y-4">
            <div className="flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${autoMode ? 'bg-emerald-600 animate-pulse' : 'bg-stone-400'}`} />
              <div className="flex-1">
                <p className="font-semibold text-sk-ink">Greedy algorithm — automated routing</p>
                <p className="text-xs text-sk-ink-muted">Next decision in {fmtCountdown(countdown)}</p>
              </div>
              <Toggle on={autoMode} onChange={setAutoMode} label="Automated mode" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card title="Registered Devices" className="!shadow-none border-emerald-200/60">
                <div className="flex gap-2 mb-3">
                  <button type="button" onClick={doScan} disabled={scanning} className="h-8 px-3 rounded-md bg-emerald-700 text-white text-xs font-semibold">
                    {scanning ? 'Scanning…' : 'Scan'}
                  </button>
                </div>
                <ul className="space-y-2 text-sm">
                  {devices.map((d) => (
                    <li key={d.id} className="flex justify-between rounded-lg bg-white/80 px-2 py-1.5 border border-emerald-100">
                      <span className="font-mono text-xs">{d.id}</span>
                      <span>{d.house}</span>
                      <StatusPill ok={d.status === 'Online'} label={d.status} />
                    </li>
                  ))}
                </ul>
                <button type="button" onClick={() => setShowAutoLog((v) => !v)} className="mt-3 w-full h-8 rounded-md border border-emerald-300 text-xs font-semibold">
                  {showAutoLog ? 'Hide' : 'View'} Automation Log
                </button>
              </Card>

              <Card title="Recent Transfers" className="!shadow-none border-emerald-200/60">
                <ul className="space-y-2 text-sm">
                  {txHistory.slice(0, 4).map((t, i) => (
                    <li key={i} className="rounded-lg bg-white/80 px-2 py-2 border border-emerald-100">
                      <span className="font-mono text-xs text-sk-ink-muted">{t.time}</span>
                      <p className="font-semibold">{t.from} → {t.to}</p>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-amber-300/80 bg-gradient-to-br from-amber-50/90 to-orange-50/40 p-4 space-y-4">
            <p className="text-sm font-semibold text-amber-950">Manual override — one-time transfer (automation pauses 5 min)</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card title="From (Surplus)" className="!shadow-none border-amber-200/60">
                <div className="grid grid-cols-2 gap-2">
                  {surplusSources.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setFromHouse(s.value)}
                      className={`rounded-xl border-2 p-3 text-left ${
                        fromHouse === s.value ? 'border-amber-700 bg-amber-100' : 'border-sk-card-border/40 bg-white'
                      }`}
                    >
                      <p className="font-semibold text-sm">{s.value}</p>
                      <p className="text-xs text-emerald-800 font-mono">+{s.surplus}W</p>
                    </button>
                  ))}
                </div>
              </Card>

              <Card title="To (House B)" className="!shadow-none border-amber-200/60">
                <p className="text-xs text-sk-ink-muted mb-3">Two-circuit setup — transfer targets the other house only.</p>
                {recipients.map((r) => (
                  <div key={r.id} className="rounded-xl bg-white border border-amber-200/60 p-3 mb-2">
                    <div className="flex justify-between mb-2">
                      <p className="font-semibold text-sm">{r.house}</p>
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
            </div>

            <div className={`rounded-xl border p-4 ${canTransfer ? 'border-amber-500 bg-amber-100/50' : 'border-stone-300 bg-white/60'}`}>
              <div className="grid grid-cols-3 gap-2 text-center text-xs mb-4">
                <div>
                  <p className="text-sk-ink-muted uppercase">Sending</p>
                  <p className="font-mono font-bold text-lg">{totalSending}W</p>
                </div>
                <div>
                  <p className="text-sk-ink-muted uppercase">Available</p>
                  <p className="font-mono font-bold text-lg text-emerald-800">{selectedSurplus}W</p>
                </div>
                <div>
                  <p className="text-sk-ink-muted uppercase">Status</p>
                  <p className="font-bold text-lg">{canTransfer ? 'Ready' : 'Check'}</p>
                </div>
              </div>
              <button
                type="button"
                disabled={!canTransfer}
                onClick={() => setShowTransferAnim(true)}
                className="w-full h-11 rounded-xl bg-amber-700 text-white font-semibold disabled:opacity-50 hover:bg-amber-800"
              >
                Execute Manual Transfer
              </button>
            </div>
          </div>
        )}

        <Card title="Circuit Status (House A & B)">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {houseCards.map((h) => (
              <HouseStatusCard key={h.name} house={h} />
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

function ModeTab({ label, active, onClick, tone }) {
  const activeClass =
    tone === 'emerald'
      ? 'bg-emerald-700 text-white border-emerald-800'
      : 'bg-amber-700 text-white border-amber-800';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-5 py-2.5 rounded-xl text-sm font-bold border-2 transition-colors ${
        active ? activeClass : 'bg-white text-sk-ink border-sk-card-border/50 hover:bg-sk-placeholder/30'
      }`}
    >
      {label}
    </button>
  );
}

function HouseStatusCard({ house }) {
  const positive = house.surplus >= 0;
  const transferring = house.transfer === 'SENDING';
  return (
    <div className="rounded-xl border border-sk-card-border/40 bg-white/60 p-4">
      <div className="flex justify-between items-start mb-3">
        <p className="font-semibold">{house.name}</p>
        <p className={`font-mono font-bold ${positive ? 'text-emerald-800' : 'text-rose-800'}`}>
          {positive ? '+' : ''}{Math.round(house.surplus)}W
        </p>
      </div>
      <p className="text-xs font-mono text-sk-ink-muted mb-2">
        {house.solar}W solar · {house.status} {house.online ? '· online' : '· offline'}
      </p>
      <StatusPill ok={house.relay} label={house.relay ? 'Relay ON' : 'Relay OFF'} />
      {transferring && (
        <StatusPill ok label="Transferring ⚡" />
      )}
    </div>
  );
}

function StatusPill({ ok, label }) {
  return (
    <span
      className={`inline-flex mt-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
        ok ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
      }`}
    >
      {label}
    </span>
  );
}
