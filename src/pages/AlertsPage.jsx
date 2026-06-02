import React, { useMemo, useState } from 'react';
import Card from '../components/ui/Card';
import Toggle from '../components/ui/Toggle';

const initialAlerts = [
  {
    id: 'AL-001',
    kind: 'danger',
    title: 'Household approaching minimum supply',
    message: 'HH-02 is nearing minimum battery allocation. Consider rebalancing.',
    at: 'Today · 4:12 PM',
    ack: false,
  },
  {
    id: 'AL-002',
    kind: 'info',
    title: 'Simulation completed',
    message: 'Hybrid simulation ran successfully with current parameters.',
    at: 'Today · 2:08 PM',
    ack: false,
  },
  {
    id: 'AL-003',
    kind: 'warning',
    title: 'Excess capacity detected',
    message: 'Community battery exceeded configured cap threshold.',
    at: 'Yesterday · 6:31 PM',
    ack: true,
  },
  {
    id: 'AL-004',
    kind: 'info',
    title: 'Device ESP32_C3 offline',
    message: 'House C sensor has not reported in 12 minutes.',
    at: 'Yesterday · 3:00 PM',
    ack: true,
  },
];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [kind, setKind] = useState('all');

  const active = alerts.filter((a) => !a.ack);
  const history = alerts.filter((a) => a.ack);

  const filteredActive = useMemo(() => {
    return active.filter((a) => (kind === 'all' ? true : a.kind === kind));
  }, [active, kind]);

  const ackAlert = (id) => setAlerts((rows) => rows.map((a) => (a.id === id ? { ...a, ack: true } : a)));
  const markAllRead = () => setAlerts((rows) => rows.map((a) => ({ ...a, ack: true })));

  return (
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
              className="h-10 px-4 rounded-md bg-sk-run text-white text-sm font-semibold hover:bg-sk-run-hover"
            >
              Mark all as read
            </button>
          </div>

          {filteredActive.length === 0 ? (
            <p className="py-8 text-center text-sk-ink-muted">All caught up — no active alerts.</p>
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
                  <tr key={a.id} className="border-t border-sk-card-border/30">
                    <td className="py-2 font-mono text-xs">{a.at}</td>
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
            <MiniStat label="Critical" value={countKind(alerts, 'danger', false)} tone="danger" />
            <MiniStat label="Warning" value={countKind(alerts, 'warning', false)} tone="warning" />
            <MiniStat label="Info" value={countKind(alerts, 'info', false)} tone="info" />
          </div>
        </Card>

        <Card title="Notification Rules">
          <div className="space-y-3">
            <RuleToggle label="Excess capacity" defaultOn />
            <RuleToggle label="Approaching minimum supply" defaultOn />
            <RuleToggle label="Simulation completed" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function countKind(rows, kind, ack) {
  return rows.filter((a) => a.kind === kind && a.ack === ack).length;
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

function RuleToggle({ label, defaultOn = false }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-center justify-between rounded-xl border border-sk-card-border/40 bg-white/60 px-3 py-2.5">
      <span className="text-sm font-semibold text-sk-ink">{label}</span>
      <Toggle on={on} onChange={setOn} label={label} />
    </div>
  );
}
