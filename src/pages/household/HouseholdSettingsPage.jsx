import React, { useState } from 'react';

export default function HouseholdSettingsPage({ memberName = 'User' }) {
  const [email, setEmail] = useState('user@email.com');
  const [address, setAddress] = useState('Purok —');
  const [householdId, setHouseholdId] = useState('HH-01');

  return (
    <div className="rounded-2xl border border-black/10 bg-[#7b704f] shadow-sm p-5 text-white">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] gap-6">
        <section>
          <h2 className="font-serif text-2xl font-semibold mb-4">Settings</h2>

          <div className="space-y-3">
            <Field label="Profile" value={memberName} disabled />
            <Field label="Email" value={email} onChange={setEmail} />
            <Field label="Address" value={address} onChange={setAddress} />
            <Field label="Code information" value={householdId} onChange={setHouseholdId} />
          </div>

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              className="h-11 px-4 rounded-md bg-white/90 text-[#2c1f1a] text-sm font-semibold hover:bg-white transition-colors"
            >
              Save
            </button>
            <button
              type="button"
              className="h-11 px-4 rounded-md border border-white/30 bg-transparent text-sm font-semibold hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
          </div>
        </section>

        <section className="flex flex-col items-center justify-start gap-3">
          <div className="w-28 h-28 rounded-full bg-[#6b3f2b] border border-white/20 flex items-center justify-center text-3xl font-bold">
            {String(memberName).slice(0, 1).toUpperCase()}
          </div>
          <div className="rounded-xl bg-white/20 border border-white/15 px-4 py-2 text-center">
            <p className="text-sm font-semibold">{memberName}</p>
            <p className="text-[10px] uppercase tracking-widest text-white/70">
              More information
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, disabled = false }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-bold uppercase tracking-widest text-white/70">
        {label}
      </label>
      <input
        value={value}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full h-10 rounded-full border border-white/20 bg-white/15 px-4 text-sm text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-70"
      />
    </div>
  );
}

