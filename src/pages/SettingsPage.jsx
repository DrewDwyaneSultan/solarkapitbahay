import React, { useState } from 'react';
import Card from '../components/ui/Card';
import Toggle from '../components/ui/Toggle';

export default function SettingsPage() {
  const [barangayName, setBarangayName] = useState('Barangay Mabini');
  const [contactEmail, setContactEmail] = useState('operator@barangay.gov.ph');
  const [broker, setBroker] = useState('192.168.1.100');
  const [port, setPort] = useState('1883');
  const [autoDisc, setAutoDisc] = useState(true);
  const [emailNotif, setEmailNotif] = useState(true);
  const [battLow, setBattLow] = useState('20');
  const [saved, setSaved] = useState(false);

  const doSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

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
            <Field label="Broker Address" value={broker} onChange={setBroker} />
            <Field label="Port" value={port} onChange={setPort} />
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm font-semibold">Auto Device Discovery</span>
            <Toggle on={autoDisc} onChange={setAutoDisc} label="Auto device discovery" />
          </div>
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
            <InfoRow label="App mode" value="Simulation + live transfer UI" />
            <InfoRow label="Version" value="v0.9-alpha" />
            <InfoRow label="Last sync" value="Not connected to MQTT broker" />
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
