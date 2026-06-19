import React, { useEffect, useMemo, useState } from 'react';
import Card from '../components/ui/Card';
import Toggle from '../components/ui/Toggle';
import LiveStatusBadge from '../components/ui/LiveStatusBadge';
import { SunLogoIcon } from '../components/icons/NavIcons';
import TransferAnimationOverlay from '../components/energy/TransferAnimationOverlay';
import { getHouseCards, useLiveData } from '../hooks/useLiveData';
import { executeManualTransfer } from '../services/liveApi';
import { isTransferActive } from '../utils/liveStatus';

function fmtCountdown(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function EnergyTransferPage({ accessToken }) {
  const liveData = useLiveData();
  const [mode, setMode] = useState('auto');
  const [autoMode, setAutoMode] = useState(true);
  const [showAutoLog, setShowAutoLog] = useState(false);
  const [countdown, setCountdown] = useState(300);
  const [fromHouse, setFromHouse] = useState('House A');
  const [recipients, setRecipients] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [showTransferAnim, setShowTransferAnim] = useState(false);
  const [manualBusy, setManualBusy] = useState(false);
  const [manualNote, setManualNote] = useState('');

  const txHistory = liveData.transferLog ?? [];

  const automationLog = useMemo(() => {
    const rows = [];
    for (const t of txHistory.slice(0, 8)) {
      rows.push({
        time: t.time,
        decision: `${t.from} → ${t.to} (${t.kw} kW)`,
        soc: `${Math.round(liveData.battery)}%`,
        reason: t.status || 'MQTT transfer',
      });
    }
    if (liveData.houseA?.transfer && isTransferActive(liveData.houseA.transfer)) {
      rows.unshift({
        time: 'Now',
        decision: `House A · ${liveData.houseA.transfer}`,
        soc: `${Math.round(liveData.battery)}%`,
        reason: `${liveData.houseA.status} · ${liveData.houseA.voltage?.toFixed?.(1)} V`,
      });
    }
    if (liveData.houseB?.transfer && isTransferActive(liveData.houseB.transfer)) {
      rows.unshift({
        time: 'Now',
        decision: `House B · ${liveData.houseB.transfer}`,
        soc: `${Math.round(liveData.battery)}%`,
        reason: `${liveData.houseB.status} · ${liveData.houseB.voltage?.toFixed?.(1)} V`,
      });
    }
    return rows;
  }, [txHistory, liveData]);

  useEffect(() => {
    if (!liveData.mqttConnected) return undefined;
    const id = setInterval(() => setCountdown((c) => (c <= 0 ? 300 : c - 1)), 1000);
    return () => clearInterval(id);
  }, [liveData.mqttConnected]);

  useEffect(() => {
    const cards = getHouseCards(liveData);
    const surplus = cards.find((h) => h.online && h.surplus > 0);
    const deficit = cards.find((h) => h.online && h.surplus < 0);
    if (!surplus || !deficit) {
      setRecipients([]);
      return;
    }
    setFromHouse(surplus.name);
    const need = Math.abs(deficit.surplus);
    setRecipients([
      {
        id: 1,
        house: deficit.name,
        need,
        amount: Math.min(need, surplus.surplus),
      },
    ]);
  }, [liveData]);

  const surplusSources = liveData.surplusSources ?? [];
  const devices = liveData.devices?.length ? liveData.devices : [];

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
    setCountdown(300);
  };

  const runManualTransfer = async () => {
    if (!accessToken) {
      setManualNote('Sign in as operator to send MQTT commands.');
      setShowTransferAnim(true);
      return;
    }
    setManualBusy(true);
    setManualNote('');
    try {
      const toHouse = recipients[0]?.house ?? 'House B';
      const result = await executeManualTransfer(accessToken, {
        fromHouse,
        toHouse,
        watts: totalSending,
      });
      if (result.published) {
        setManualNote(`MQTT command sent to ${result.topic}. ${result.note ?? ''}`);
      } else {
        setManualNote(result.reason ?? result.note ?? 'Command was not published.');
      }
      setShowTransferAnim(true);
    } catch (err) {
      setManualNote(err.message ?? 'Manual transfer failed.');
    } finally {
      setManualBusy(false);
    }
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

        <LiveStatusBadge data={liveData} />

        <Card title="Live Snapshot">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: 'House A Solar',
                val: liveData.houseA.online ? liveData.houseA.solar : '—',
                unit: liveData.houseA.online ? 'W' : '',
                sub: liveData.houseA.online
                  ? `${liveData.houseA.voltage?.toFixed?.(1) ?? '—'} V · ${liveData.houseA.current?.toFixed?.(2) ?? '—'} A`
                  : 'Offline',
              },
              {
                label: 'House B Solar',
                val: liveData.houseB.online ? liveData.houseB.solar : '—',
                unit: liveData.houseB.online ? 'W' : '',
                sub: liveData.houseB.online
                  ? `${liveData.houseB.voltage?.toFixed?.(1) ?? '—'} V · ${liveData.houseB.current?.toFixed?.(2) ?? '—'} A`
                  : 'Offline',
              },
              {
                label: 'Battery SOC',
                val: liveData.mqttConnected ? Math.round(liveData.battery) : '—',
                unit: liveData.mqttConnected ? '%' : '',
                sub: liveData.mqttConnected ? liveData.batteryStatus : 'No live data',
              },
              {
                label: 'Battery V',
                val: liveData.mqttConnected ? (liveData.batteryVoltage?.toFixed?.(2) ?? '—') : '—',
                unit: liveData.mqttConnected ? 'V' : '',
                sub: 'Community 18650',
              },
            ].map((row) => (
              <div key={row.label} className="rounded-xl border border-sk-card-border/40 bg-white/70 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <SunLogoIcon className="w-4 h-4 text-amber-500 opacity-80" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-sk-ink-muted">{row.label}</span>
                </div>
                <p className="font-mono text-xl font-bold text-sk-ink">
                  {row.val}
                  <span className="text-sm font-medium text-sk-ink-muted ml-1">{row.unit}</span>
                </p>
                <p className="text-[10px] text-sk-ink-muted mt-1 font-semibold uppercase">{row.sub}</p>
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
                <p className="text-xs text-sk-ink-muted">
                  {liveData.mqttConnected
                    ? `Next decision in ${fmtCountdown(countdown)}`
                    : 'Waiting for ESP32 MQTT data…'}
                </p>
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
                  {showAutoLog ? 'Hide' : 'View'} Live Activity Log
                </button>
                {showAutoLog && (
                  <ul className="mt-3 space-y-2 text-xs max-h-40 overflow-y-auto">
                    {automationLog.length === 0 ? (
                      <li className="text-sk-ink-muted">Waiting for MQTT activity…</li>
                    ) : (
                      automationLog.map((row, i) => (
                        <li key={i} className="rounded-lg bg-white/80 px-2 py-2 border border-emerald-100">
                          <span className="font-mono text-sk-ink-muted">{row.time}</span>
                          <p className="font-semibold">{row.decision}</p>
                          <p className="text-sk-ink-muted">SOC {row.soc} · {row.reason}</p>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </Card>

              <Card title="Recent Transfers (MQTT)" className="!shadow-none border-emerald-200/60">
                {txHistory.length === 0 ? (
                  <p className="text-xs text-sk-ink-muted py-4 text-center">
                    No transfers logged yet — trigger A↔B transfer with solar + deficit.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-widest text-sk-ink-muted">
                          <th className="text-left py-1">Time</th>
                          <th className="text-left py-1">Route</th>
                          <th className="text-left py-1">kW</th>
                          <th className="text-left py-1">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {txHistory.slice(0, 8).map((t, i) => (
                          <tr key={i} className="border-t border-emerald-100">
                            <td className="py-2 font-mono">{t.time}</td>
                            <td className="py-2 font-semibold">{t.from} → {t.to}</td>
                            <td className="py-2 font-mono">{t.kw}</td>
                            <td className="py-2">
                              <TransferStatusPill status={t.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-amber-300/80 bg-gradient-to-br from-amber-50/90 to-orange-50/40 p-4 space-y-4">
            <p className="text-sm font-semibold text-amber-950">
              Manual override — sends an MQTT command to the broker. House A/B firmware must
              subscribe to <code className="text-xs">solar/command/transfer</code> to act on it;
              until then Greedy auto-transfer on the ESP32 still runs independently.
            </p>
            {manualNote && (
              <p className="text-xs text-amber-900 bg-white/70 border border-amber-200 rounded-lg px-3 py-2">
                {manualNote}
              </p>
            )}

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
                disabled={!canTransfer || manualBusy}
                onClick={runManualTransfer}
                className="w-full h-11 rounded-xl bg-amber-700 text-white font-semibold disabled:opacity-50 hover:bg-amber-800"
              >
                {manualBusy ? 'Sending…' : 'Execute Manual Transfer'}
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
  const transferring = isTransferActive(house.transfer);
  return (
    <div className="rounded-xl border border-sk-card-border/40 bg-white/60 p-4">
      <div className="flex justify-between items-start mb-3">
        <p className="font-semibold">{house.name}</p>
        <p className={`font-mono font-bold ${positive ? 'text-emerald-800' : 'text-rose-800'}`}>
          {positive ? '+' : ''}{Math.round(house.surplus)}W
        </p>
      </div>
      <p className="text-xs font-mono text-sk-ink-muted mb-2">
        {house.solar}W solar · {house.voltage?.toFixed?.(1) ?? '—'} V · {house.current?.toFixed?.(2) ?? '—'} A
      </p>
      <p className="text-xs text-sk-ink-muted mb-2">
        {house.status} · {house.transfer} · {house.online ? 'online' : 'offline'}
      </p>
      <StatusPill ok={house.relay} label={house.relay ? 'Relay ON' : 'Relay OFF'} />
      {transferring && (
        <StatusPill ok label={`${house.transfer} ⚡`} />
      )}
    </div>
  );
}

function TransferStatusPill({ status }) {
  const s = String(status || 'DONE').toUpperCase();
  const tone =
    s === 'TRANSFERRING' || s === 'PREPARING'
      ? 'bg-amber-100 text-amber-900'
      : s === 'DONE'
        ? 'bg-emerald-100 text-emerald-900'
        : 'bg-sky-100 text-sky-900';
  return (
    <span className={`inline-flex text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${tone}`}>
      {s}
    </span>
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
