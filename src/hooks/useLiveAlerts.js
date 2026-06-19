import { useMemo, useState } from 'react';
import { isTransferActive } from '../utils/liveStatus';

function fmtTime(iso) {
  if (!iso) return 'Just now';
  try {
    return new Date(iso).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Just now';
  }
}

/** Build alert list from live MQTT snapshot (recomputed each poll). */
export function buildLiveAlerts(data) {
  const alerts = [];
  const at = fmtTime(data?.lastSync);

  if (!data || data.source === 'mock') {
    alerts.push({
      id: 'sys-mock',
      kind: 'warning',
      title: 'Dashboard using mock data',
      message: 'Start the backend (port 8000) and Mosquitto so ESP32 telemetry can reach the app.',
      at,
      live: true,
    });
    return alerts;
  }

  if (!data.brokerConnected) {
    alerts.push({
      id: 'mqtt-broker',
      kind: 'danger',
      title: 'MQTT broker disconnected',
      message: 'Mosquitto is not connected to the API bridge. Start Mosquitto on port 1883.',
      at,
      live: true,
    });
  }

  const houses = [
    { key: 'houseA', label: 'House A', circuit: 'HH-01' },
    { key: 'houseB', label: 'House B', circuit: 'HH-02' },
  ];

  for (const { key, label, circuit } of houses) {
    const h = data[key];
    if (!h) continue;

    if (!h.online) {
      alerts.push({
        id: `${key}-offline`,
        kind: 'danger',
        title: `${label} ESP32 offline`,
        message: `No MQTT messages from ${circuit} in the last 30 seconds. Check USB power and Wi‑Fi.`,
        at,
        live: true,
      });
    }

    if (h.online && h.status === 'DEFICIT' && data.battery < 25) {
      alerts.push({
        id: `${key}-deficit-low`,
        kind: 'danger',
        title: `${label} in deficit with low community battery`,
        message: `Solar status DEFICIT and community battery at ${Math.round(data.battery)}%.`,
        at,
        live: true,
      });
    } else if (h.online && h.status === 'DEFICIT') {
      alerts.push({
        id: `${key}-deficit`,
        kind: 'warning',
        title: `${label} needs solar input`,
        message: `${label} reports DEFICIT — no strong sunlight on panel (${h.voltage?.toFixed?.(1) ?? '—'} V).`,
        at,
        live: true,
      });
    }

    if (h.online && isTransferActive(h.transfer)) {
      alerts.push({
        id: `${key}-transfer`,
        kind: 'info',
        title: `${label} energy transfer active`,
        message: `Transfer state: ${h.transfer}. Relays coordinating peer-to-peer routing.`,
        at,
        live: true,
      });
    }
  }

  const batStat = String(data.batteryStatus || '').toUpperCase();
  if (batStat === 'CRIT' || (data.battery > 0 && data.battery < 15)) {
    alerts.push({
      id: 'battery-crit',
      kind: 'danger',
      title: 'Community battery critical',
      message: `Battery at ${Math.round(data.battery)}% (${data.batteryVoltage?.toFixed?.(2) ?? '—'} V). Charge from solar soon.`,
      at,
      live: true,
    });
  } else if (batStat === 'LOW' || (data.battery > 0 && data.battery < 30)) {
    alerts.push({
      id: 'battery-low',
      kind: 'warning',
      title: 'Community battery low',
      message: `Battery at ${Math.round(data.battery)}%. Status: ${batStat || 'LOW'}.`,
      at,
      live: true,
    });
  }

  if (batStat === 'CHRG') {
    alerts.push({
      id: 'battery-chrg',
      kind: 'info',
      title: 'Community battery charging',
      message: `Solar charging detected — ${Math.round(data.battery)}% SOC.`,
      at,
      live: true,
    });
  }

  if (data.houseA?.online && data.houseB?.online && data.houseA.status === 'SURPLUS' && data.houseB.status === 'SURPLUS') {
    alerts.push({
      id: 'both-surplus',
      kind: 'info',
      title: 'Both houses in surplus',
      message: 'No peer transfer needed — both panels have strong solar.',
      at,
      live: true,
    });
  }

  return alerts;
}

export function useLiveAlerts(liveData) {
  const [ackedIds, setAckedIds] = useState(() => new Set());
  const [history, setHistory] = useState([]);

  const generated = useMemo(() => buildLiveAlerts(liveData), [liveData]);

  const active = useMemo(
    () => generated.filter((a) => !ackedIds.has(a.id)),
    [generated, ackedIds],
  );

  const ackAlert = (id) => {
    const alert = generated.find((a) => a.id === id);
    if (alert) {
      setHistory((h) => [{ ...alert, ack: true, ackedAt: new Date().toLocaleString() }, ...h].slice(0, 50));
    }
    setAckedIds((prev) => new Set([...prev, id]));
  };

  const markAllRead = () => {
    const toAck = generated.filter((a) => !ackedIds.has(a.id));
    setHistory((h) => [
      ...toAck.map((a) => ({ ...a, ack: true, ackedAt: new Date().toLocaleString() })),
      ...h,
    ].slice(0, 50));
    setAckedIds((prev) => new Set([...prev, ...toAck.map((a) => a.id)]));
  };

  return { active, history, ackAlert, markAllRead, generated };
}
