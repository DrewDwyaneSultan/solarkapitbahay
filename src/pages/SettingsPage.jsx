import React, { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import Toggle from '../components/ui/Toggle';
import { fetchMqttStatus } from '../services/liveApi';

const DEFAULT_BROKER = '10.211.242.244';

export default function SettingsPage() {
  const [barangayName, setBarangayName] = useState('Barangay Mabini');
  const [contactEmail, setContactEmail] = useState('operator@barangay.gov.ph');
  const [broker, setBroker] = useState(DEFAULT_BROKER);
  const [port, setPort] = useState('1883');
  const [autoDisc, setAutoDisc] = useState(true);
  const [emailNotif, setEmailNotif] = useState(true);
  const [battLow, setBattLow] = useState('20');
  const [saved, setSaved] = useState(false);
  const [mqttStatus, setMqttStatus] = useState({
    connected: false,
    last_message_at: null,
    topic_prefix: 'solar/#',
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const s = await fetchMqttStatus();
        if (!cancelled) {
          setMqttStatus(s);
          if (s.broker) {
            const [host, p] = s.broker.split(':');
            if (host) setBroker(host);
            if (p) setPort(p);
          }
        }
      } catch {
        /* backend offline — keep defaults */
      }
    }
    load();
    const id = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const doSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const lastSyncLabel = mqttStatus.last_message_at
    ? new Date(mqttStatus.last_message_at).toLocaleString()
    : mqttStatus.connected
      ? 'Broker connected — waiting for ESP32'
      : 'Backend not receiving MQTT';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <p className="text-sm text-sk-ink-muted">Configure barangay info, MQTT hardware, and notifications.</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={doSave}
            className={`h-10 px-4 rounded-md text-sm font-semibold text-white ${saved ? 'bg-emerald-700' : 'bg-sk-run hover:bg-sk-run-hover'}`}
          >
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
          <button type="button" className="h-10 px-4 rounded-md border border-sk-card-border/70 text-sm font-semibold">
            Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Barangay Information">
          <div className="space-y-4">
            <Field label="Barangay Name" value={barangayName} onChange={setBarangayName} />
            <Field label="Operator Email" value={contactEmail} onChange={setContactEmail} />
            <Field
              label="Battery Low Threshold (%)"
              value={battLow}
              onChange={setBattLow}
              type="number"
              min={1}
              max={100}
            />
          </div>
        </Card>

        <Card title="MQTT & Hardware">
          <div className="grid grid-cols-[1fr_80px] gap-3 mb-4">
            <Field label="Broker Address (laptop IP)" value={broker} onChange={setBroker} />
            <Field label="Port" value={port} onChange={setPort} />
          </div>
          <p className="text-xs text-sk-ink-muted mb-3">
            ESP32 sketches use this IP in <code className="text-xs">mqttBroker</code>. Backend subscribes on{' '}
            <strong>127.0.0.1</strong> on the same laptop.
          </p>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm font-semibold">Auto Device Discovery</span>
            <Toggle on={autoDisc} onChange={setAutoDisc} label="Auto device discovery" />
          </div>
          <dl className="mt-3 space-y-2 text-sm rounded-lg border border-sk-card-border/30 bg-white/50 p-3">
            <InfoRow
              label="Bridge status"
              value={mqttStatus.connected ? 'Connected to broker' : 'Not connected'}
            />
            <InfoRow label="Topics" value="solar/A/* · solar/B/*" />
          </dl>
        </Card>

        <Card title="Preferences">
          <div className="flex items-center justify-between py-2 mb-2">
            <span className="text-sm font-semibold">Email notifications</span>
            <Toggle on={emailNotif} onChange={setEmailNotif} label="Email notifications" />
          </div>
          <p className="text-xs text-sk-ink-muted">Alerts for low battery, failed transfers, and simulation completion.</p>
        </Card>

        <Card title="System">
          <dl className="space-y-2 text-sm">
            <InfoRow label="App mode" value="Live MQTT + Greedy hardware" />
            <InfoRow label="Version" value="v0.9-alpha" />
            <InfoRow label="Last ESP32 message" value={lastSyncLabel} />
          </dl>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', min, max }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-sk-ink-muted mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 rounded-md border border-sk-card-border/60 bg-white px-3 text-sm"
      />
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 rounded-lg border border-sk-card-border/30 bg-white/50 px-3 py-2">
      <dt className="text-[10px] font-bold uppercase tracking-widest text-sk-ink-muted">{label}</dt>
      <dd className="text-sm font-semibold text-right">{value}</dd>
    </div>
  );
}
