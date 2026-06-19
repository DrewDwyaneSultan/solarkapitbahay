import React, { useCallback, useEffect, useRef, useState } from 'react';
import Card from '../components/ui/Card';
import Toggle from '../components/ui/Toggle';
import { fetchMqttStatus } from '../services/liveApi';
import { fetchMyBarangay, updateMyBarangay } from '../services/registrationApi';

const DEFAULT_BROKER = '10.211.242.244';

function applyBarangayToForm(bg, setters) {
  if (!bg) return;
  const {
    setBarangayName,
    setContactEmail,
    setBroker,
    setPort,
    setAutoDisc,
    setEmailNotif,
    setBattLow,
    setBarangayCode,
  } = setters;
  setBarangayName(bg.name ?? '');
  setContactEmail(bg.contact_email ?? '');
  setBroker(bg.mqtt_broker_host ?? DEFAULT_BROKER);
  setPort(bg.mqtt_broker_port != null ? String(bg.mqtt_broker_port) : '1883');
  setAutoDisc(bg.auto_device_discovery != null ? Boolean(bg.auto_device_discovery) : true);
  setEmailNotif(bg.email_notifications != null ? Boolean(bg.email_notifications) : true);
  setBattLow(bg.battery_low_threshold_pct != null ? String(bg.battery_low_threshold_pct) : '20');
  if (setBarangayCode) setBarangayCode(bg.barangay_code ?? '');
}

export default function SettingsPage({
  accessToken,
  barangayName: headerName,
  barangayCode: headerCode,
  onBarangayUpdated,
}) {
  const [barangayName, setBarangayName] = useState(headerName ?? '');
  const [barangayCode, setBarangayCode] = useState(headerCode ?? '');
  const [contactEmail, setContactEmail] = useState('');
  const [broker, setBroker] = useState(DEFAULT_BROKER);
  const [port, setPort] = useState('1883');
  const [autoDisc, setAutoDisc] = useState(true);
  const [emailNotif, setEmailNotif] = useState(true);
  const [battLow, setBattLow] = useState('20');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [mqttStatus, setMqttStatus] = useState({
    connected: false,
    last_message_at: null,
    topic_prefix: 'solar/#',
  });

  const formDirtyRef = useRef(false);
  const loadedRef = useRef(false);

  const markDirty = useCallback(() => {
    formDirtyRef.current = true;
  }, []);

  const setters = {
    setBarangayName,
    setContactEmail,
    setBroker,
    setPort,
    setAutoDisc,
    setEmailNotif,
    setBattLow,
    setBarangayCode,
  };

  useEffect(() => {
    if (!accessToken) return undefined;
    let cancelled = false;

    async function loadBarangay() {
      setLoadError(null);
      try {
        const bg = await fetchMyBarangay(accessToken);
        if (cancelled || !bg) return;
        if (!formDirtyRef.current) {
          applyBarangayToForm(bg, setters);
        }
        loadedRef.current = true;
      } catch (err) {
        if (!cancelled) setLoadError(err.message ?? 'Could not load barangay settings.');
      }
    }

    loadBarangay();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  useEffect(() => {
    let cancelled = false;
    async function loadMqtt() {
      try {
        const s = await fetchMqttStatus();
        if (!cancelled) {
          setMqttStatus(s);
          if (s.broker && !accessToken && !formDirtyRef.current) {
            const [host, p] = s.broker.split(':');
            if (host) setBroker(host);
            if (p) setPort(p);
          }
        }
      } catch {
        /* backend offline — keep loaded values */
      }
    }
    loadMqtt();
    const id = setInterval(loadMqtt, 10000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [accessToken]);

  const doSave = async () => {
    setSaveError(null);
    if (!accessToken) {
      setSaveError('Sign in to save barangay settings.');
      return;
    }
    const trimmedName = barangayName.trim();
    if (trimmedName.length < 2) {
      setSaveError('Barangay name must be at least 2 characters.');
      return;
    }
    setSaving(true);
    try {
      const updated = await updateMyBarangay(accessToken, {
        name: trimmedName,
        contact_email: contactEmail.trim(),
        mqtt_broker_host: broker.trim(),
        mqtt_broker_port: Number(port) || 1883,
        battery_low_threshold_pct: Number(battLow) || 20,
        auto_device_discovery: autoDisc,
        email_notifications: emailNotif,
      });
      formDirtyRef.current = false;
      applyBarangayToForm(updated, setters);
      onBarangayUpdated?.(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(err.message ?? 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const doReset = async () => {
    if (!accessToken) return;
    setLoadError(null);
    try {
      const bg = await fetchMyBarangay(accessToken);
      formDirtyRef.current = false;
      applyBarangayToForm(bg, setters);
    } catch (err) {
      setLoadError(err.message ?? 'Could not reload settings.');
    }
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
            disabled={saving}
            className={`h-10 px-4 rounded-md text-sm font-semibold text-white disabled:opacity-60 ${saved ? 'bg-emerald-700' : 'bg-sk-run hover:bg-sk-run-hover'}`}
          >
            {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={doReset}
            className="h-10 px-4 rounded-md border border-sk-card-border/70 text-sm font-semibold"
          >
            Reset
          </button>
        </div>
      </div>

      {(loadError || saveError) && (
        <p className="text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
          {saveError ?? loadError}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Barangay Information">
          <div className="space-y-4">
            <Field
              label="Barangay Name"
              value={barangayName}
              onChange={(v) => {
                markDirty();
                setBarangayName(v);
              }}
            />
            <ReadOnlyField label="Barangay Code" value={barangayCode || '—'} hint="Share this code with households during registration." />
            <Field
              label="Operator Email"
              value={contactEmail}
              onChange={(v) => {
                markDirty();
                setContactEmail(v);
              }}
              type="email"
            />
            <Field
              label="Battery Low Threshold (%)"
              value={battLow}
              onChange={(v) => {
                markDirty();
                setBattLow(v);
              }}
              type="number"
              min={1}
              max={100}
            />
          </div>
        </Card>

        <Card title="MQTT & Hardware">
          <div className="grid grid-cols-[1fr_80px] gap-3 mb-4">
            <Field
              label="Broker Address (laptop IP)"
              value={broker}
              onChange={(v) => {
                markDirty();
                setBroker(v);
              }}
            />
            <Field
              label="Port"
              value={port}
              onChange={(v) => {
                markDirty();
                setPort(v);
              }}
            />
          </div>
          <p className="text-xs text-sk-ink-muted mb-3">
            ESP32 sketches use this IP in <code className="text-xs">mqttBroker</code>. Backend subscribes on{' '}
            <strong>127.0.0.1</strong> on the same laptop.
          </p>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm font-semibold">Auto Device Discovery</span>
            <Toggle
              on={autoDisc}
              onChange={(v) => {
                markDirty();
                setAutoDisc(v);
              }}
              label="Auto device discovery"
            />
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
            <Toggle
              on={emailNotif}
              onChange={(v) => {
                markDirty();
                setEmailNotif(v);
              }}
              label="Email notifications"
            />
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
      <label className="block text-xs font-bold uppercase tracking-widest text-sk-ink-muted mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 rounded-md border border-sk-card-border/60 bg-white px-3 text-sm text-sk-ink"
      />
    </div>
  );
}

function ReadOnlyField({ label, value, hint }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-widest text-sk-ink-muted mb-1.5">{label}</label>
      <div className="w-full h-10 rounded-md border border-sk-card-border/40 bg-sk-placeholder/50 px-3 flex items-center">
        <span className="text-sm font-mono font-semibold text-sk-ink">{value}</span>
      </div>
      {hint && <p className="mt-1 text-xs text-sk-ink-muted">{hint}</p>}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 rounded-lg border border-sk-card-border/30 bg-white/50 px-3 py-2">
      <dt className="text-xs font-bold uppercase tracking-widest text-sk-ink-muted">{label}</dt>
      <dd className="text-sm font-semibold text-sk-ink text-right">{value}</dd>
    </div>
  );
}
