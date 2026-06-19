import { useCallback, useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import { fetchMe } from '../services/authApi';

export function profileToUser(profile) {
  const name = profile.display_name ?? 'User';
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'U';

  if (profile.role === 'household') {
    return {
      role: 'household',
      name,
      initials,
      householdId: profile.household_id ?? null,
      house: profile.circuit_name ?? profile.house_label ?? profile.household_id ?? 'Pending approval',
      profileId: profile.id,
      status: profile.status,
      barangayName: profile.barangay_name,
      barangayCode: profile.barangay_code,
      rejectionReason: profile.rejection_reason ?? null,
    };
  }

  return {
    role: 'operator',
    name,
    initials,
    roleLabel: 'Barangay Operator',
    profileId: profile.id,
    barangayName: profile.barangay_name,
    barangayCode: profile.barangay_code,
  };
}

export function useAuth() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [authError, setAuthError] = useState('');

  const refreshProfile = useCallback(async (accessToken) => {
    setAuthError('');
    try {
      const nextProfile = await fetchMe(accessToken);
      setProfile(nextProfile);
      setNeedsProfile(false);
    } catch (err) {
      if (err.status === 404) {
        setProfile(null);
        setNeedsProfile(true);
      } else {
        setProfile(null);
        setNeedsProfile(false);
        setAuthError(err.message ?? 'Could not load profile.');
      }
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) {
      setLoading(false);
      return undefined;
    }

    let active = true;

    supabase.auth.getSession().then(({ data: { session: current } }) => {
      if (!active) return;
      setSession(current);
      if (current?.access_token) {
        refreshProfile(current.access_token).finally(() => {
          if (active) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.access_token) {
        // Tab focus triggers TOKEN_REFRESHED — refresh profile without full-screen loading.
        if (event === 'TOKEN_REFRESHED') {
          refreshProfile(nextSession.access_token);
          return;
        }
        setLoading(true);
        refreshProfile(nextSession.access_token).finally(() => setLoading(false));
      } else {
        setProfile(null);
        setNeedsProfile(false);
        setLoading(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [refreshProfile]);

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured() && supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setProfile(null);
    setNeedsProfile(false);
    setAuthError('');
  }, []);

  const setProfileFromSave = useCallback((saved) => {
    setProfile(saved);
    setNeedsProfile(false);
  }, []);

  return {
    supabaseEnabled: isSupabaseConfigured(),
    session,
    profile,
    user: profile ? profileToUser(profile) : null,
    loading,
    needsProfile,
    authError,
    signOut,
    refreshProfile,
    setProfileFromSave,
  };
}
