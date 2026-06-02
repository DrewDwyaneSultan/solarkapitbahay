import React, { useState } from 'react';
import { SunLogoIcon } from './components/icons/NavIcons';
import Toggle from './components/ui/Toggle';

const demoAccounts = {
  'operator@solarkapitbahay.com': {
    role: 'operator',
    name: 'Barangay Captain',
    initials: 'BC',
  },
  'household@solarkapitbahay.com': {
    role: 'household',
    name: 'House A',
    house: 'House A',
    initials: 'HA',
  },
};

export default function Login({ onSignIn }) {
  const [role, setRole] = useState('operator');
  const [email, setEmail] = useState('operator@solarkapitbahay.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [hasSolar, setHasSolar] = useState(false);
  const [hasBattery, setHasBattery] = useState(false);
  const [batteryModel, setBatteryModel] = useState('');
  const [batteryCapacity, setBatteryCapacity] = useState('');

  const handleOperatorSignIn = (e) => {
    e.preventDefault();
    const account = demoAccounts[email.trim().toLowerCase()];
    if (account?.role === 'operator' && password === 'admin123') {
      setError('');
      onSignIn?.(account);
      return;
    }
    setError('Invalid credentials. Try operator@solarkapitbahay.com / admin123');
  };

  const handleHouseholdRegister = (e) => {
    e.preventDefault();
    onSignIn?.({
      role: 'household',
      name: 'House A',
      house: 'House A',
      initials: 'HA',
    });
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full bg-sk-canvas">
      
      {/* LEFT SIDE: HERO IMAGE & BRANDING */}
      <div
        className="relative w-full md:w-1/2 min-h-[45vh] md:min-h-screen flex flex-col justify-end p-8 md:p-16 bg-cover bg-center text-white"
        style={{ backgroundImage: `url('/solarbackground.jpg')` }}
      >
        {/* Ambient overlay gradient to guarantee white text remains legible */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none"></div>
        
        {/* Branding Content */}
        <div className="relative z-10 max-w-md">
          <div className="flex items-center gap-2 mb-6">
            <SunLogoIcon className="w-8 h-8 text-amber-400" />
            <h1 className="text-xl font-bold tracking-wide font-sans">
              Solar<span className="text-amber-400">KapitBahay</span>
            </h1>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-semibold leading-tight font-serif mb-6 tracking-wide">
            Sharing the sun, <br />
            together
          </h2>
          
          <div className="text-[11px] uppercase tracking-widest opacity-75 space-y-1 font-sans border-t border-white/20 pt-4">
            <p className="font-semibold">Solar Energy Management System</p>
            <p>Barangay-Level Distribution Platform</p>
            <p className="text-amber-400/90 font-medium">Simulation Mode · v0.9-Alpha</p>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: LOGIN FORM */}
      <div className="w-full md:w-1/2 min-h-[55vh] md:min-h-screen flex flex-col justify-center items-center p-6 md:p-12">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-6">
            <SunLogoIcon className="w-10 h-10 text-amber-500" />
            <p className="mt-2 text-[11px] font-bold uppercase tracking-widest text-sk-ink-muted">
              Solar
            </p>
            <p className="-mt-1 text-[11px] font-bold uppercase tracking-widest text-sk-ink-muted">
              KapitBahay
            </p>
          </div>

          {/* Role Selector (matches Figma: small rounded tabs) */}
          <div className="flex bg-white/70 p-1 rounded-lg border border-sk-card-border/50 mb-8 shadow-inner">
            <button
              type="button"
              onClick={() => setRole('operator')}
              className={`flex-1 py-1.5 text-[10px] uppercase tracking-widest font-bold rounded-md transition-colors ${
                role === 'operator'
                  ? 'bg-white text-sk-ink shadow-sm'
                  : 'text-sk-ink-muted hover:text-sk-ink'
              }`}
            >
              Operator Access
            </button>
            <button
              type="button"
              onClick={() => setRole('household')}
              className={`flex-1 py-1.5 text-[10px] uppercase tracking-widest font-bold rounded-md transition-colors ${
                role === 'household'
                  ? 'bg-white text-sk-ink shadow-sm'
                  : 'text-sk-ink-muted hover:text-sk-ink'
              }`}
            >
              Household Member
            </button>
          </div>

          {role === 'operator' ? (
            <>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-sk-ink-muted mb-2">
                Operator Access
              </p>
              <h3 className="font-serif text-3xl text-sk-ink leading-tight mb-8">
                Welcome online,
                <br />
                <span className="italic font-semibold">operator.</span>
              </h3>

              <form className="space-y-5" onSubmit={handleOperatorSignIn}>
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-sk-ink-muted">
                    Username
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-10 rounded-md border border-sk-card-border/60 bg-white px-3 text-sm text-sk-ink focus:outline-none focus:ring-2 focus:ring-sk-run/30"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-sk-ink-muted">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-10 rounded-md border border-sk-card-border/60 bg-white px-3 text-sm text-sk-ink focus:outline-none focus:ring-2 focus:ring-sk-run/30"
                  />
                </div>

                {error && (
                  <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
                    {error}
                  </p>
                )}

                <p className="text-[10px] text-sk-ink-muted bg-sk-placeholder/40 rounded-md px-3 py-2">
                  Demo: operator@solarkapitbahay.com / admin123
                </p>

                <button
                  type="submit"
                  className="w-full h-11 rounded-md bg-sk-run text-white text-sm font-semibold hover:bg-sk-run-hover transition-colors shadow-md shadow-emerald-950/15"
                >
                  Sign in to Dashboard
                </button>
              </form>
            </>
          ) : (
            <>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-sk-ink-muted mb-2">
                Household Access
              </p>
              <h3 className="font-serif text-3xl text-sk-ink leading-tight mb-6">
                Register your,
                <br />
                <span className="italic font-semibold">energy data.</span>
              </h3>

              <form className="space-y-4" onSubmit={handleHouseholdRegister}>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Email" />
                  <Field label="Name" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Password" type="password" />
                  <Field label="Address" />
                </div>

                <div className="rounded-xl border border-sk-card-border/40 bg-white/50 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-sk-ink">Solar panel installed</p>
                      <p className="text-xs text-sk-ink-muted">Household can export surplus energy</p>
                    </div>
                    <Toggle on={hasSolar} onChange={setHasSolar} label="Has solar panel" />
                  </div>
                  <div className="flex items-center justify-between border-t border-sk-card-border/30 pt-4">
                    <div>
                      <p className="text-sm font-semibold text-sk-ink">Battery installed</p>
                      <p className="text-xs text-sk-ink-muted">Enable to enter battery details</p>
                    </div>
                    <Toggle on={hasBattery} onChange={setHasBattery} label="Has battery" />
                  </div>
                </div>

                {hasBattery && (
                  <div className="space-y-2 rounded-xl border border-amber-200/60 bg-amber-50/40 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-sk-ink-muted mb-2">
                      Battery information
                    </p>
                    <SmallPillInput
                      placeholder="Battery model (e.g. LiFePO4 5kWh)"
                      value={batteryModel}
                      onChange={setBatteryModel}
                    />
                    <SmallPillInput
                      placeholder="Capacity (kWh)"
                      value={batteryCapacity}
                      onChange={setBatteryCapacity}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full h-11 rounded-md bg-sk-run text-white text-sm font-semibold hover:bg-sk-run-hover transition-colors shadow-md shadow-emerald-950/15 mt-2"
                >
                  Register Household
                </button>
              </form>
            </>
          )}
        </div>
      </div>

    </div>
  );
}

function Field({ label, type = 'text' }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-bold uppercase tracking-widest text-sk-ink-muted">
        {label}
      </label>
      <input
        type={type}
        className="w-full h-9 rounded-md border border-sk-card-border/60 bg-white px-3 text-sm text-sk-ink focus:outline-none focus:ring-2 focus:ring-sk-run/30"
      />
    </div>
  );
}

function SmallPillInput({ placeholder, value = '', onChange }) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className="w-full h-9 rounded-full border border-sk-card-border/50 bg-white/70 px-4 text-sm text-sk-ink placeholder:text-sk-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-sk-run/25"
    />
  );
}