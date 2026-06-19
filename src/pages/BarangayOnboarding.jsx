import React, { useState } from 'react';
import BrandLogo from '../components/BrandLogo';
import { registerBarangay } from '../services/registrationApi';
import { ToastProvider, useToast } from '../context/ToastContext';
import { validateBarangayOnboarding } from '../utils/userMessages';

export default function BarangayOnboarding(props) {
  return (
    <ToastProvider>
      <BarangayOnboardingInner {...props} />
    </ToastProvider>
  );
}

function BarangayOnboardingInner({ accessToken, operatorName, onComplete }) {
  const { showToast, showError } = useToast();
  const [name, setName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const validation = validateBarangayOnboarding({ name, contactEmail });
    if (validation) {
      setError(validation.message);
      showToast({ tone: 'error', ...validation });
      return;
    }
    setBusy(true);
    try {
      const saved = await registerBarangay(accessToken, {
        name: name.trim(),
        contact_email: contactEmail.trim(),
        city_municipality: city.trim() || null,
        province: province.trim() || null,
        location_lat: null,
        location_lon: null,
      });
      setResult(saved);
      onComplete?.(saved);
    } catch (err) {
      const msg = err.message ?? 'Could not register barangay.';
      setError(msg);
      showError(err, msg);
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <div className="min-h-screen bg-sk-canvas flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-sk-card-border/50 bg-white p-8 shadow-lg text-center">
          <BrandLogo circleBg circleBgSize={100} />
          <h2 className="font-serif text-2xl font-semibold text-sk-ink mt-4">Virtual hub created</h2>
          <p className="text-sm text-sk-ink-muted mt-2">
            <strong>{result.name}</strong> is ready with synthetic household data for simulation and
            clustering.
          </p>
          <div className="mt-6 rounded-xl bg-emerald-50 border border-emerald-200 p-4">
            <p className="text-xs uppercase tracking-widest text-emerald-800 font-bold">
              Share this code with households
            </p>
            <p className="text-2xl font-mono font-bold text-emerald-900 mt-1">{result.barangay_code}</p>
          </div>
          <p className="text-xs text-sk-ink-muted mt-4">
            {result.virtual_hub?.households ?? 15} virtual households seeded · community battery
            configured
          </p>
          <button
            type="button"
            onClick={() => onComplete?.(result)}
            className="mt-6 w-full h-11 rounded-md bg-sk-run text-white text-sm font-semibold"
          >
            Go to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sk-canvas flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-sk-card-border/50 bg-white p-8 shadow-lg">
        <div className="flex flex-col items-center mb-6">
          <BrandLogo circleBg circleBgSize={90} />
          <p className="text-xs uppercase tracking-widest text-sk-ink-muted mt-3">
            First-time setup
          </p>
          <h2 className="font-serif text-2xl font-semibold text-sk-ink text-center mt-1">
            Register your barangay
          </h2>
          <p className="text-sm text-sk-ink-muted text-center mt-2">
            Hi {operatorName ?? 'Operator'} — this creates a virtual energy hub with synthetic data
            for your community (no physical hardware required).
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <Field label="Barangay name" value={name} onChange={setName} required placeholder="Barangay Mabini" />
          <Field
            label="Operator contact email"
            type="email"
            value={contactEmail}
            onChange={setContactEmail}
            required
            placeholder="operator@barangay.gov.ph"
            hint="Used for alerts and household contact. Must be a full email address."
          />
          <div className="grid grid-cols-2 gap-3">
            <Field label="City / municipality" value={city} onChange={setCity} placeholder="Davao City" />
            <Field label="Province" value={province} onChange={setProvince} placeholder="Davao del Sur" />
          </div>
          {error && (
            <p className="text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full h-11 rounded-md bg-sk-run text-white text-sm font-semibold disabled:opacity-60"
          >
            {busy ? 'Creating virtual hub…' : 'Create virtual hub'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required, placeholder, hint }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold uppercase tracking-widest text-sk-ink-muted">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full h-10 rounded-md border border-sk-card-border/60 bg-white px-3 text-sm text-sk-ink focus:outline-none focus:ring-2 focus:ring-sk-run/30"
      />
      {hint && <p className="text-xs text-sk-ink-muted">{hint}</p>}
    </div>
  );
}
