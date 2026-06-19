import React, { useEffect, useMemo, useState } from 'react';
import Card from '../components/ui/Card';
import Toggle from '../components/ui/Toggle';
import GlossaryTerm from '../components/ui/GlossaryTerm';
import LiveStatusBadge from '../components/ui/LiveStatusBadge';
import { SunLogoIcon } from '../components/icons/NavIcons';
import { getHouseCards, useLiveData } from '../hooks/useLiveData';
import { isTransferActive } from '../utils/liveStatus';

function fmtCountdown(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function EnergyTransferPage() {
  const liveData = useLiveData();
  const [autoMode, setAutoMode] = useState(true);
  const [showAutoLog, setShowAutoLog] = useState(false);
  const [countdown, setCountdown] = useState(300);
  const [scanning, setScanning] = useState(false);

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

  const devices = liveData.devices?.length ? liveData.devices : [];
  const houseCards = getHouseCards(liveData);

  const doScan = () => {
    setScanning(true);
    setTimeout(() => setScanning(false), 1500);
  };

  return (
    <div className="space-y-4">
      <LiveStatusBadge data={liveData} />

      <Card title="Live Snapshot">
        <p className="text-xs text-sk-ink-muted mb-3 uppercase tracking-widest font-semibold">
          {liveData.lastSync
            ? `Updated ${new Date(liveData.lastSync).toLocaleTimeString()}`
            : liveData.mqttConnected
              ? 'Polling MQTT…'
              : 'Waiting for live MQTT'}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'House A Solar',
              val: liveData.houseA.online ? liveData.houseA.solar : '—',
              unit: liveData.houseA.online ? 'W' : '',
              sub: liveData.houseA.online
                ? `${Number(liveData.houseA.voltage ?? 0).toFixed(1)} V · ${Number(liveData.houseA.current ?? 0).toFixed(2)} A · ${liveData.houseA.status}`
                : 'Offline',
            },
            {
              label: 'House B Solar',
              val: liveData.houseB.online ? liveData.houseB.solar : '—',
              unit: liveData.houseB.online ? 'W' : '',
              sub: liveData.houseB.online
                ? `${Number(liveData.houseB.voltage ?? 0).toFixed(1)} V · ${Number(liveData.houseB.current ?? 0).toFixed(2)} A · ${liveData.houseB.status}`
                : 'Offline',
            },
            {
              label: 'Battery SOC',
              glossaryId: 'soc',
              val: liveData.mqttConnected ? Math.round(liveData.battery) : '—',
              unit: liveData.mqttConnected ? '%' : '',
              sub: liveData.mqttConnected ? liveData.batteryStatus : 'No live data',
            },
            {
              label: 'Battery V',
              val: liveData.mqttConnected ? Number(liveData.batteryVoltage ?? 0).toFixed(2) : '—',
              unit: liveData.mqttConnected ? 'V' : '',
              sub: 'Community 18650 (House A)',
            },
          ].map((row) => (
            <div key={row.label} className="rounded-xl border border-sk-card-border/40 bg-white/70 p-3">
              <div className="flex items-center gap-2 mb-2">
                <SunLogoIcon className="w-4 h-4 text-amber-500 opacity-80" />
                <span className="text-xs font-bold uppercase tracking-widest text-sk-ink-muted">
                  {row.glossaryId ? (
                    <GlossaryTerm id={row.glossaryId}>{row.label}</GlossaryTerm>
                  ) : (
                    row.label
                  )}
                </span>
              </div>
              <p className="font-mono text-xl font-bold text-sk-ink">
                {row.val}
                <span className="text-sm font-medium text-sk-ink-muted ml-1">{row.unit}</span>
              </p>
              <p className="text-xs text-sk-ink-muted mt-1 font-semibold uppercase">{row.sub}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="rounded-2xl border-2 border-emerald-300/80 bg-gradient-to-br from-emerald-50/90 to-white p-4 space-y-4">
        <div className="rounded-lg border border-emerald-200 bg-white/80 px-3 py-2 text-sm text-sk-ink-muted leading-relaxed">
          <strong className="text-emerald-900">Automated sharing only.</strong>{' '}
          The ESP32 <GlossaryTerm id="greedy">greedy firmware</GlossaryTerm> watches solar voltage and neighbor
          status, then flips the <GlossaryTerm id="relay">relay</GlossaryTerm> LEDs when one house has surplus and
          the other is in deficit. Transfers are handled on-device — the dashboard monitors only.
        </div>
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
              <button
                type="button"
                onClick={doScan}
                disabled={scanning}
                className="h-8 px-3 rounded-md bg-emerald-700 text-white text-xs font-semibold"
              >
                {scanning ? 'Scanning…' : 'Scan'}
              </button>
            </div>
            <ul className="space-y-2 text-sm">
              {devices.map((d) => (
                <li
                  key={d.id}
                  className="flex justify-between rounded-lg bg-white/80 px-2 py-1.5 border border-emerald-100"
                >
                  <span className="font-mono text-xs">{d.id}</span>
                  <span>{d.house}</span>
                  <StatusPill ok={d.status === 'Online'} label={d.status} />
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setShowAutoLog((v) => !v)}
              className="mt-3 w-full h-8 rounded-md border border-emerald-300 text-xs font-semibold"
            >
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
                      <p className="text-sk-ink-muted">
                        SOC {row.soc} · {row.reason}
                      </p>
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
                    <tr className="text-xs uppercase tracking-widest text-sk-ink-muted">
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
                        <td className="py-2 font-semibold">
                          {t.from} → {t.to}
                        </td>
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

      <Card title="Circuit Status (House A & B)">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {houseCards.map((h) => (
            <HouseStatusCard key={h.name} house={h} />
          ))}
        </div>
      </Card>
    </div>
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
          {positive ? '+' : ''}
          {Math.round(house.surplus)}W
        </p>
      </div>
      <p className="text-xs font-mono text-sk-ink-muted mb-2">
        {house.solar}W solar · {house.voltage?.toFixed?.(1) ?? '—'} V · {house.current?.toFixed?.(2) ?? '—'} A
      </p>
      <p className="text-xs text-sk-ink-muted mb-2">
        {house.status} · {house.transfer} · {house.online ? 'online' : 'offline'}
      </p>
      <StatusPill ok={house.relay} label={house.relay ? 'Relay ON' : 'Relay OFF'} />
      {transferring && <StatusPill ok label={`${house.transfer} ⚡`} />}
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
    <span className={`inline-flex text-xs font-bold uppercase px-2 py-0.5 rounded-full ${tone}`}>{s}</span>
  );
}

function StatusPill({ ok, label }) {
  return (
    <span
      className={`inline-flex mt-2 text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
        ok ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
      }`}
    >
      {label}
    </span>
  );
}
