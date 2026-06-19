import React, { useEffect, useRef, useState } from 'react';
import BrandLogo from './components/BrandLogo';
import Toggle from './components/ui/Toggle';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';
import { saveProfile } from './services/authApi';
import { lookupBarangay } from './services/registrationApi';
import { profileToUser, getProfileRole } from './hooks/useAuth';
import {
  persistIntendedRole,
  clearIntendedRole,
  consumeIntendedRoleFromUrl,
  readIntendedRole,
} from './utils/intendedRole';

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
    householdId: 'HH-01',
    initials: 'HA',
  },
  'houseb@solarkapitbahay.com': {
    role: 'household',
    name: 'House B',
    house: 'House B',
    householdId: 'HH-02',
    initials: 'HB',
  },
};

export default function Login({
  onSignIn,
  onProfileComplete,
  onIntendedRoleChange,
  onSwitchToOperator,
  needsProfile = false,
  session = null,
  supabaseEnabled = isSupabaseConfigured(),
  defaultRole = 'operator',
  forceHousehold = false,
}) {
  const [role, setRole] = useState(() => {
    if (forceHousehold) return 'household';
    const stored = readIntendedRole();
    if (stored === 'household' || stored === 'operator') return stored;
    return defaultRole === 'household' ? 'household' : 'operator';
  });
  const roleInitRef = useRef(false);
  const [mode, setMode] = useState(needsProfile ? 'complete' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [address, setAddress] = useState('');
  const [householdId, setHouseholdId] = useState('');
  const [barangayCode, setBarangayCode] = useState('');
  const [householdCode, setHouseholdCode] = useState('');
  const [barangayInfo, setBarangayInfo] = useState(null);
  const [joinMode, setJoinMode] = useState('existing');
  const [householdOptions, setHouseholdOptions] = useState([]);
  const [hasSolar, setHasSolar] = useState(false);
  const [hasBattery, setHasBattery] = useState(false);
  const [batteryModel, setBatteryModel] = useState('');
  const [batteryCapacity, setBatteryCapacity] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (needsProfile) setMode('complete');
  }, [needsProfile]);

  useEffect(() => {
    if (needsProfile || roleInitRef.current) return;
    roleInitRef.current = true;

    const fromUrl = consumeIntendedRoleFromUrl();
    if (fromUrl) {
      setRole(fromUrl);
      onIntendedRoleChange?.(fromUrl);
      return;
    }

    const stored = readIntendedRole();
    if (stored === 'household' || stored === 'operator') {
      setRole(stored);
      onIntendedRoleChange?.(stored);
      return;
    }

    setRole('operator');
    persistIntendedRole('operator');
    onIntendedRoleChange?.('operator');
    // Run once on mount — do not reset role when parent re-renders (onIntendedRoleChange identity).
  }, [needsProfile]);

  useEffect(() => {
    if (forceHousehold) {
      setRole('household');
      persistIntendedRole('household');
      return;
    }
    if (needsProfile && defaultRole) setRole(defaultRole);
  }, [needsProfile, defaultRole, forceHousehold]);

  useEffect(() => {
    if (!needsProfile || !session?.user || displayName) return;
    const meta = session.user.user_metadata ?? {};
    const name =
      meta.full_name ||
      meta.name ||
      [meta.given_name, meta.family_name].filter(Boolean).join(' ') ||
      session.user.email?.split('@')[0] ||
      '';
    if (name) setDisplayName(name);
  }, [needsProfile, session, displayName]);

  const setRoleAndPersist = (nextRole) => {
    if (forceHousehold && nextRole !== 'household') return;
    setRole(nextRole);
    persistIntendedRole(nextRole);
    onIntendedRoleChange?.(nextRole);
  };

  const switchToOperator = () => {
    setRole('operator');
    persistIntendedRole('operator');
    onIntendedRoleChange?.('operator');
    onSwitchToOperator?.();
  };

  useEffect(() => {
    const effectiveRole = forceHousehold ? 'household' : role;
    if (mode !== 'complete' || effectiveRole !== 'household') return;
    const code = barangayCode.trim().toUpperCase();
    if (!code) {
      setBarangayInfo(null);
      setHouseholdOptions([]);
      return;
    }
    let cancelled = false;
    lookupBarangay(code)
      .then((bg) => {
        if (cancelled) return;
        setBarangayInfo(bg);
        setHouseholdOptions(bg?.households ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setBarangayInfo(null);
          setHouseholdOptions([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [mode, role, forceHousehold, barangayCode]);

  const resetMessages = () => {
    setError('');
    setInfo('');
  };

  const handleGoogleSignIn = async () => {
    if (!supabase) return;
    resetMessages();
    persistIntendedRole(role);
    setBusy(true);
    const redirectTo = `${window.location.origin}${window.location.pathname}?intended_role=${encodeURIComponent(role)}`;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (oauthError) setError(oauthError.message);
    setBusy(false);
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!supabase) return;
    resetMessages();
    setBusy(true);

    if (mode === 'signin') {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError(signInError.message);
        setBusy(false);
        return;
      }
      if (data.session) {
        persistIntendedRole(role);
        onSignIn?.({ session: data.session });
      }
    } else {
      persistIntendedRole(role);
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (signUpError) {
        setError(signUpError.message);
        setBusy(false);
        return;
      }
      if (data.session) {
        setMode('complete');
        setInfo('Account created. Complete your profile below.');
      } else {
        setInfo('Check your email to confirm your account, then sign in.');
        setMode('signin');
      }
    }
    setBusy(false);
  };

  const handleCompleteProfile = async (e) => {
    e.preventDefault();
    const token = session?.access_token;
    if (!token) {
      setError('Session expired. Please sign in again.');
      return;
    }
    const profileRole = forceHousehold ? 'household' : role;
    if (profileRole === 'household') {
      if (!barangayCode.trim()) {
        setError('Enter the barangay code from your operator.');
        return;
      }
      if (!barangayInfo) {
        setError('Barangay code not found. Check with your operator.');
        return;
      }
      if (joinMode === 'existing' && !householdId && !householdCode.trim()) {
        setError('Select a home or enter the household code from your operator.');
        return;
      }
    }
    resetMessages();
    setBusy(true);
    try {
      const saved = await saveProfile(token, {
        role: profileRole,
        display_name: displayName.trim(),
        address: address.trim() || null,
        barangay_code: profileRole === 'household' ? barangayCode.trim().toUpperCase() || null : null,
        household_id:
          profileRole === 'household' && joinMode === 'existing' ? householdId || null : null,
        household_code:
          profileRole === 'household' && joinMode === 'existing' ? householdCode.trim().toUpperCase() || null : null,
        has_solar: hasSolar,
        has_battery: hasBattery,
        battery_model: hasBattery ? batteryModel.trim() || null : null,
        battery_capacity_kwh:
          hasBattery && batteryCapacity ? Number.parseFloat(batteryCapacity) : null,
      });
      onProfileComplete?.(saved);
      if (getProfileRole(saved) === 'household') {
        clearIntendedRole();
      }
      onSignIn?.({ user: profileToUser(saved) });
    } catch (err) {
      setError(err.message ?? 'Could not save profile.');
    } finally {
      setBusy(false);
    }
  };

  const handleDemoSignIn = (e) => {
    e?.preventDefault?.();
    const account = demoAccounts[email.trim().toLowerCase()];
    if (account?.role === 'operator' && password === 'admin123') {
      resetMessages();
      onSignIn?.({ user: account });
      return;
    }
    setError('Invalid credentials. Try operator@solarkapitbahay.com / admin123');
  };

  const handleDemoHousehold = () => {
    resetMessages();
    onSignIn?.({
      user: {
        role: 'household',
        name: 'House A',
        house: 'House A',
        householdId: 'HH-01',
        initials: 'HA',
      },
    });
  };

  const isComplete = mode === 'complete';

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full bg-sk-canvas">
      <div
        className="relative w-full md:w-1/2 min-h-[45vh] md:min-h-screen flex flex-col justify-end p-8 md:p-16 bg-cover bg-center text-white"
        style={{ backgroundImage: `url('/solarbackground.jpg')` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-md">
          <h2 className="text-4xl md:text-5xl font-semibold leading-tight font-serif mb-6 tracking-wide">
            Sharing the sun,
            <br />
            together
          </h2>
          <div className="text-[11px] uppercase tracking-widest opacity-75 space-y-1 font-sans border-t border-white/20 pt-4">
            <p className="font-semibold">Solar Energy Management System</p>
            <p>Barangay-Level Distribution Platform</p>
            <p className="text-amber-400/90 font-medium">
              {supabaseEnabled ? 'Live accounts · Google sign-in' : 'Demo mode · local only'}
            </p>
          </div>
        </div>
      </div>

      <div className="w-full md:w-1/2 min-h-[55vh] md:min-h-screen flex flex-col justify-center items-center p-6 md:p-12">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-6">
            <BrandLogo circleBg circleBgSize={140} />
          </div>

          {!isComplete && (
            <div className="mb-6 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-sk-ink-muted text-center">
                Step 1 — Choose your role
              </p>
              <div className="grid grid-cols-2 gap-2">
                <RoleCard
                  active={role === 'operator'}
                  title="Operator"
                  description="Manage barangay, approve households, run simulations"
                  onClick={() => setRoleAndPersist('operator')}
                />
                <RoleCard
                  active={role === 'household'}
                  title="Household"
                  description="Join a barangay with a code from your operator"
                  onClick={() => setRoleAndPersist('household')}
                />
              </div>
            </div>
          )}

          {isComplete ? (
            <>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-sk-ink-muted mb-2">
                One more step
              </p>
              <h3 className="font-serif text-3xl text-sk-ink leading-tight mb-6">
                Complete your
                <br />
                <span className="italic font-semibold">profile.</span>
              </h3>
              <form className="space-y-4" onSubmit={handleCompleteProfile}>
                {!forceHousehold && (
                  <div className="flex bg-white/70 p-1 rounded-lg border border-sk-card-border/50 mb-2">
                    <button
                      type="button"
                      onClick={() => setRoleAndPersist('operator')}
                      className={`flex-1 py-1 text-[10px] uppercase tracking-widest font-bold rounded-md ${
                        role === 'operator' ? 'bg-white text-sk-ink shadow-sm' : 'text-sk-ink-muted'
                      }`}
                    >
                      Operator
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoleAndPersist('household')}
                      className={`flex-1 py-1 text-[10px] uppercase tracking-widest font-bold rounded-md ${
                        role === 'household' ? 'bg-white text-sk-ink shadow-sm' : 'text-sk-ink-muted'
                      }`}
                    >
                      Household
                    </button>
                  </div>
                )}
                {forceHousehold && (
                  <div className="text-xs bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2 mb-1 space-y-2">
                    <p className="text-emerald-900">
                      Joining as a <strong>household member</strong> — ask your barangay operator for the
                      barangay code (e.g. demo: <code className="font-mono">SK-MABINI-DEMO</code>).
                    </p>
                    <button
                      type="button"
                      onClick={switchToOperator}
                      className="text-emerald-800 underline font-semibold hover:text-emerald-950"
                    >
                      I&apos;m a barangay operator instead
                    </button>
                  </div>
                )}
                {!forceHousehold && role === 'operator' && (
                  <p className="text-xs text-sk-ink-muted bg-sk-placeholder/40 rounded-md px-3 py-2">
                    After sign-in you&apos;ll register your barangay and receive a{' '}
                    <strong>barangay code</strong> to share with households. Demo seed uses{' '}
                    <code className="font-mono text-[11px]">SK-MABINI-DEMO</code>.
                  </p>
                )}
                <Field label="Display name" value={displayName} onChange={setDisplayName} required />
                {(forceHousehold || role === 'household') && (
                  <>
                    <Field
                      label="Barangay code"
                      value={barangayCode}
                      onChange={setBarangayCode}
                      placeholder="SK-MABINI-DEMO"
                      required
                    />
                    {barangayCode && !barangayInfo && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                        Checking code… or code not found. Ask your barangay operator for the correct
                        code.
                      </p>
                    )}
                    {barangayInfo && (
                      <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
                        Joining <strong>{barangayInfo.name}</strong>
                        {barangayInfo.city_municipality ? ` · ${barangayInfo.city_municipality}` : ''}
                      </p>
                    )}
                    {barangayInfo && (
                      <div className="flex bg-white/70 p-1 rounded-lg border border-sk-card-border/50">
                        <button
                          type="button"
                          onClick={() => setJoinMode('existing')}
                          className={`flex-1 py-1 text-[10px] uppercase tracking-widest font-bold rounded-md ${
                            joinMode === 'existing' ? 'bg-white text-sk-ink shadow-sm' : 'text-sk-ink-muted'
                          }`}
                        >
                          Pre-registered home
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setJoinMode('new');
                            setHouseholdId('');
                            setHouseholdCode('');
                          }}
                          className={`flex-1 py-1 text-[10px] uppercase tracking-widest font-bold rounded-md ${
                            joinMode === 'new' ? 'bg-white text-sk-ink shadow-sm' : 'text-sk-ink-muted'
                          }`}
                        >
                          Register new house
                        </button>
                      </div>
                    )}
                    {barangayInfo && joinMode === 'existing' && (
                      <>
                        <Field
                          label="Household code (from operator)"
                          value={householdCode}
                          onChange={setHouseholdCode}
                          placeholder="SK-MABINI-DEMO-H01"
                        />
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-sk-ink-muted">
                            Or pick from list
                          </label>
                          <select
                            value={householdId}
                            onChange={(e) => {
                              setHouseholdId(e.target.value);
                              const picked = householdOptions.find((h) => h.id === e.target.value);
                              if (picked?.household_code) setHouseholdCode(picked.household_code);
                            }}
                            className="w-full h-10 rounded-md border border-sk-card-border/60 bg-white px-3 text-sm text-sk-ink"
                          >
                            <option value="">Select a pre-registered home…</option>
                            {householdOptions.map((hh) => (
                              <option key={hh.id} value={hh.id}>
                                {hh.id} — {hh.head_name ?? 'Household'}
                                {hh.household_code ? ` (${hh.household_code})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}
                    {barangayInfo && joinMode === 'new' && (
                      <p className="text-xs text-sk-ink-muted bg-sk-placeholder/40 rounded-md px-3 py-2">
                        Your registration will be sent to the barangay operator for approval.
                      </p>
                    )}
                    <Field label="Address" value={address} onChange={setAddress} />
                    <HouseholdEquipmentFields
                      hasSolar={hasSolar}
                      setHasSolar={setHasSolar}
                      hasBattery={hasBattery}
                      setHasBattery={setHasBattery}
                      batteryModel={batteryModel}
                      setBatteryModel={setBatteryModel}
                      batteryCapacity={batteryCapacity}
                      setBatteryCapacity={setBatteryCapacity}
                    />
                  </>
                )}
                {error && <Alert tone="error">{error}</Alert>}
                {info && <Alert tone="info">{info}</Alert>}
                <SubmitButton busy={busy}>Save profile & continue</SubmitButton>
              </form>
            </>
          ) : supabaseEnabled ? (
            <>
              <div className="flex gap-2 mb-6">
                <TabButton active={mode === 'signin'} onClick={() => { setMode('signin'); resetMessages(); }}>
                  Sign in
                </TabButton>
                <TabButton active={mode === 'signup'} onClick={() => { setMode('signup'); resetMessages(); }}>
                  Sign up
                </TabButton>
              </div>

              <h3 className="font-serif text-3xl text-sk-ink leading-tight mb-6">
                {mode === 'signin' ? 'Welcome back.' : 'Create an account.'}
              </h3>

              <p className="text-[10px] font-bold uppercase tracking-widest text-sk-ink-muted text-center mb-3">
                Step 2 — Sign in with Google
              </p>

              <p className="text-[10px] text-sk-ink-muted text-center mb-4 leading-relaxed">
                Choose operator or household above — sign out and pick the other role if you need to switch later.
              </p>

              {session?.user && !needsProfile && (
                <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-3">
                  Already signed in as <strong>{session.user.email}</strong>. Google may skip the
                  account picker — you&apos;ll continue with this account.
                </p>
              )}

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={busy}
                className="w-full h-11 rounded-md border border-sk-card-border/70 bg-white text-sm font-semibold text-sk-ink hover:bg-sk-placeholder/30 flex items-center justify-center gap-2 mb-4"
              >
                <GoogleIcon />
                Continue with Google ({role === 'operator' ? 'Operator' : 'Household'})
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-sk-card-border/50" />
                <span className="text-[10px] uppercase tracking-widest text-sk-ink-muted">or email</span>
                <div className="h-px flex-1 bg-sk-card-border/50" />
              </div>

              <form className="space-y-4" onSubmit={handleEmailAuth}>
                <Field
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  required
                />
                <Field
                  label="Password"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  required
                  minLength={6}
                />
                {error && <Alert tone="error">{error}</Alert>}
                {info && <Alert tone="info">{info}</Alert>}
                <SubmitButton busy={busy}>
                  {mode === 'signin' ? 'Sign in' : 'Create account'}
                </SubmitButton>
              </form>

              <p className="text-[10px] text-sk-ink-muted mt-4 text-center">
                {role === 'operator'
                  ? 'Operators manage barangay dashboards and simulations.'
                  : 'Household members register energy data and view sharing.'}
              </p>
            </>
          ) : role === 'operator' ? (
            <>
              <h3 className="font-serif text-3xl text-sk-ink leading-tight mb-8">
                Demo operator sign-in
              </h3>
              <form className="space-y-5" onSubmit={handleDemoSignIn}>
                <Field
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="operator@solarkapitbahay.com"
                />
                <Field
                  label="Password"
                  type="password"
                  value={password}
                  onChange={setPassword}
                />
                {error && <Alert tone="error">{error}</Alert>}
                <p className="text-[10px] text-sk-ink-muted bg-sk-placeholder/40 rounded-md px-3 py-2">
                  Demo: operator@solarkapitbahay.com / admin123
                </p>
                <SubmitButton busy={busy}>Sign in to Dashboard</SubmitButton>
              </form>
            </>
          ) : (
            <>
              <h3 className="font-serif text-3xl text-sk-ink leading-tight mb-6">
                Demo household preview
              </h3>
              <p className="text-sm text-sk-ink-muted mb-4">
                Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for real sign-up.
              </p>
              <SubmitButton busy={busy} onClick={handleDemoHousehold}>
                Preview as House A
              </SubmitButton>
              <button
                type="button"
                onClick={() =>
                  onSignIn?.({
                    user: {
                      role: 'household',
                      name: 'House B',
                      house: 'House B',
                      householdId: 'HH-02',
                      initials: 'HB',
                    },
                  })
                }
                className="w-full h-10 mt-2 rounded-md border border-sk-card-border/70 bg-white text-sm font-semibold text-sk-ink hover:bg-sk-placeholder/40"
              >
                Preview as House B
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function RoleCard({ active, title, description, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-xl border-2 p-3 transition-colors ${
        active
          ? 'border-sk-run bg-emerald-50/80 shadow-sm'
          : 'border-sk-card-border/40 bg-white/60 hover:border-sk-card-border'
      }`}
    >
      <p className="text-sm font-bold text-sk-ink">{title}</p>
      <p className="text-[10px] text-sk-ink-muted mt-1 leading-snug">{description}</p>
    </button>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-1.5 text-[10px] uppercase tracking-widest font-bold rounded-md border transition-colors ${
        active
          ? 'bg-sk-run text-white border-sk-run'
          : 'bg-white text-sk-ink-muted border-sk-card-border/50 hover:text-sk-ink'
      }`}
    >
      {children}
    </button>
  );
}

function Field({ label, type = 'text', value, onChange, required, placeholder, minLength }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-bold uppercase tracking-widest text-sk-ink-muted">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        required={required}
        placeholder={placeholder}
        minLength={minLength}
        className="w-full h-10 rounded-md border border-sk-card-border/60 bg-white px-3 text-sm text-sk-ink focus:outline-none focus:ring-2 focus:ring-sk-run/30"
      />
    </div>
  );
}

function HouseholdEquipmentFields({
  hasSolar,
  setHasSolar,
  hasBattery,
  setHasBattery,
  batteryModel,
  setBatteryModel,
  batteryCapacity,
  setBatteryCapacity,
}) {
  return (
    <>
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
          <Field
            label="Battery model"
            value={batteryModel}
            onChange={setBatteryModel}
            placeholder="LiFePO4 5kWh"
          />
          <Field
            label="Capacity (kWh)"
            value={batteryCapacity}
            onChange={setBatteryCapacity}
            placeholder="5"
          />
        </div>
      )}
    </>
  );
}

function SubmitButton({ children, busy, onClick, type = 'submit' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={busy}
      className="w-full h-11 rounded-md bg-sk-run text-white text-sm font-semibold hover:bg-sk-run-hover transition-colors shadow-md shadow-emerald-950/15 disabled:opacity-60"
    >
      {busy ? 'Please wait…' : children}
    </button>
  );
}

function Alert({ tone, children }) {
  const styles =
    tone === 'error'
      ? 'text-rose-700 bg-rose-50 border-rose-200'
      : 'text-emerald-800 bg-emerald-50 border-emerald-200';
  return (
    <p className={`text-xs border rounded-md px-3 py-2 ${styles}`}>{children}</p>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.203 36 24 36c-5.522 0-10-4.478-10-10s4.478-10 10-10c2.837 0 5.357 1.087 7.263 2.863l5.657-5.657C33.64 10.053 29.082 8 24 8 12.955 8 4 16.955 4 28s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c2.837 0 5.357 1.087 7.263 2.863l5.657-5.657C33.64 10.053 29.082 8 24 8 16.318 8 9.656 13.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.203 0-9.62-3.134-11.278-7.584l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );
}
