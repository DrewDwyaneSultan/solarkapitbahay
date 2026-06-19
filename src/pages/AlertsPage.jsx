import React, { useMemo, useState } from 'react';
import Card from '../components/ui/Card';
import LiveStatusBadge from '../components/ui/LiveStatusBadge';
import { useLiveAlerts } from '../hooks/useLiveAlerts';
import { useLiveData } from '../hooks/useLiveData';

export default function AlertsPage() {
  const liveData = useLiveData();
  const { active, history, ackAlert, markAllRead } = useLiveAlerts(liveData);
  const [kind, setKind] = useState('all');

  const filteredActive = useMemo(() => {
    return active.filter((a) => (kind === 'all' ? true : a.kind === kind));
  }, [active, kind]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <LiveStatusBadge data={liveData} />
        <p className="text-xs text-sk-ink-muted">
          Alerts refresh from MQTT every 2s — ESP32 status, battery, transfers
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.85fr)] gap-6">
        <div className="space-y-4">
          <Card title="Active Alerts">
            <div className="flex flex-wrap gap-3 mb-4">
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                className="h-10 rounded-md border border-sk-card-border/60 bg-white px-3 text-sm"
              >
                <option value="all">All</option>
                <option value="danger">Critical</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
              <button
                type="button"
                onClick={markAllRead}
                disabled={filteredActive.length === 0}
                className="h-10 px-4 rounded-md bg-sk-run text-white text-sm font-semibold hover:bg-sk-run-hover disabled:opacity-40"
              >
                Mark all as read
              </button>
            </div>

            {filteredActive.length === 0 ? (
              <p className="py-8 text-center text-sk-ink-muted">
                {liveData.source === 'mock'
                  ? 'Connect backend + ESP32s for live alerts.'
                  : 'All caught up — no active alerts.'}
              </p>
            ) : (
              <div className="space-y-3">
                {filteredActive.map((a) => (
                  <AlertRow key={a.id} alert={a} onAck={() => ackAlert(a.id)} />
                ))}
              </div>
            )}
          </Card>

          {history.length > 0 && (
            <Card title="Alert History">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-sk-ink-muted">
                    <th className="text-left py-2">Time</th>
                    <th className="text-left py-2">Severity</th>
                    <th className="text-left py-2">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((a) => (
                    <tr key={`${a.id}-${a.ackedAt}`} className="border-t border-sk-card-border/30">
                      <td className="py-2 font-mono text-xs">{a.ackedAt ?? a.at}</td>
                      <td className="py-2">{toneStyles(a.kind).label}</td>
                      <td className="py-2">{a.title}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card title="Quick Summary">
            <div className="grid grid-cols-3 gap-2">
              <MiniStat label="Critical" value={countKind(active, 'danger')} tone="danger" />
              <MiniStat label="Warning" value={countKind(active, 'warning')} tone="warning" />
              <MiniStat label="Info" value={countKind(active, 'info')} tone="info" />
            </div>
          </Card>

          <Card title="Live Telemetry">
            <dl className="space-y-2 text-sm">
              <TelemetryRow label="House A" house={liveData.houseA} />
              <TelemetryRow label="House B" house={liveData.houseB} />
              <div className="flex justify-between rounded-lg bg-white/50 px-3 py-2 border border-sk-card-border/20">
                <dt className="text-[10px] font-bold uppercase tracking-widest text-sk-ink-muted">Battery</dt>
                <dd className="font-mono font-semibold">
                  {Math.round(liveData.battery)}% · {liveData.batteryStatus}
                </dd>
              </div>
            </dl>
          </Card>

          <Card title="Alert Rules (live)">
            <ul className="text-xs text-sk-ink-muted space-y-2 list-disc pl-4">
              <li>ESP32 offline (&gt;30s no MQTT)</li>
              <li>Battery CRIT / LOW from House A sensor</li>
              <li>DEFICIT solar status per house</li>
              <li>Active transfer (PREPARING / TRANSFERRING)</li>
              <li>Broker disconnected or mock fallback</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TelemetryRow({ label, house }) {
  if (!house) return null;
  return (
    <div className="flex justify-between gap-3 rounded-lg bg-white/50 px-3 py-2 border border-sk-card-border/20">
      <dt className="text-[10px] font-bold uppercase tracking-widest text-sk-ink-muted">{label}</dt>
      <dd className="font-mono text-xs text-right">
        {house.online ? 'Online' : 'Offline'} · {house.status} · {house.voltage?.toFixed?.(1) ?? '—'} V
      </dd>
    </div>
  );
}

function countKind(rows, kind) {
  return rows.filter((a) => a.kind === kind).length;
}

function AlertRow({ alert, onAck }) {
  const tone = toneStyles(alert.kind);
  return (
    <div className={`rounded-2xl border-2 p-4 shadow-sm ${tone.bg}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <span className="text-2xl shrink-0" aria-hidden>
            {tone.emoji}
          </span>
          <div>
            <span className={`inline-flex text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${tone.chip}`}>
              {tone.label}
            </span>
            {alert.live && (
              <span className="ml-2 text-[10px] font-bold uppercase text-emerald-800">MQTT</span>
            )}
            <p className="mt-2 font-bold text-sk-ink text-base">{alert.title}</p>
            <p className="text-sm text-sk-ink mt-1">{alert.message}</p>
            <p className="text-[10px] uppercase tracking-widest text-sk-ink-muted/80 mt-2 font-semibold">{alert.at}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onAck}
          className="h-9 px-3 rounded-md bg-white border-2 border-sk-card-border text-xs font-bold shrink-0 hover:bg-sk-placeholder/30"
        >
          Acknowledge
        </button>
      </div>
    </div>
  );
}

function toneStyles(kind) {
  switch (kind) {
    case 'danger':
      return {
        label: 'Critical',
        emoji: '🚨',
        chip: 'bg-rose-200 text-rose-950 border-rose-400',
        bg: 'bg-rose-100 border-rose-400',
      };
    case 'warning':
      return {
        label: 'Warning',
        emoji: '⚠️',
        chip: 'bg-amber-200 text-amber-950 border-amber-400',
        bg: 'bg-amber-100 border-amber-400',
      };
    default:
      return {
        label: 'Info',
        emoji: 'ℹ️',
        chip: 'bg-sky-200 text-sky-950 border-sky-400',
        bg: 'bg-sky-50 border-sky-300',
      };
  }
}

function MiniStat({ label, value, tone }) {
  const toneMap = {
    danger: 'bg-rose-100 text-rose-950 border-rose-300',
    warning: 'bg-amber-100 text-amber-950 border-amber-300',
    info: 'bg-sky-100 text-sky-950 border-sky-300',
  };
  return (
    <div className={`rounded-xl border-2 p-3 ${toneMap[tone]}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-90">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
