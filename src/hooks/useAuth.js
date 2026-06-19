import { useCallback, useEffect, useRef, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import { fetchMe } from '../services/authApi';

import { resolveActiveRole } from '../utils/activeRole';
import { getProfileRoles, profileHasRole } from '../utils/profileRoles';

export { getProfileRoles, profileHasRole };

export function getProfileRole(profile, activeRole = null) {
  if (!profile) return null;
  const roles = getProfileRoles(profile);
  if (activeRole && roles.includes(activeRole)) return activeRole;
  const role = String(profile.role ?? '').toLowerCase().trim();
  if (role === 'household' || role === 'operator') return role;
  return roles[0] ?? 'operator';
}

export function profileToUser(profile, activeRole = null) {
  const viewRole = getProfileRole(profile, activeRole ?? resolveActiveRole(profile));
  const name = profile.display_name ?? 'User';
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'U';

  if (viewRole === 'household') {
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
      roles: getProfileRoles(profile),
    };
  }

  return {
    role: 'operator',
    name,
    initials,
    roleLabel: 'Barangay Operator',
    profileId: profile.id,
    barangayName: profile.operator_barangay_name ?? profile.barangay_name,
    barangayCode: profile.operator_barangay_code ?? profile.barangay_code,
    roles: getProfileRoles(profile),
  };
}

export function useAuth() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [authError, setAuthError] = useState('');
  const bootstrappedRef = useRef(false);
  const sessionUserIdRef = useRef(null);
  const profileRef = useRef(null);

  profileRef.current = profile;

  const refreshProfile = useCallback(async (accessToken) => {
    setAuthError('');
    try {
      const nextProfile = await fetchMe(accessToken);
      setProfile(nextProfile);
      setNeedsProfile(false);
      return nextProfile;
    } catch (err) {
      if (err.status === 404) {
        setProfile(null);
        setNeedsProfile(true);
      } else {
        if (!profileRef.current) {
          setProfile(null);
        }
        setNeedsProfile(false);
        setAuthError(err.message ?? 'Could not load profile.');
      }
      return null;
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
      sessionUserIdRef.current = current?.user?.id ?? null;
      if (current?.access_token) {
        refreshProfile(current.access_token).finally(() => {
          if (active) {
            bootstrappedRef.current = true;
            setLoading(false);
          }
        });
      } else {
        bootstrappedRef.current = true;
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);

      if (nextSession?.access_token) {
        const userId = nextSession.user?.id ?? null;
        const sameUser = Boolean(userId && sessionUserIdRef.current === userId);
        const keepUi =
          sameUser ||
          (bootstrappedRef.current && profileRef.current != null) ||
          event === 'TOKEN_REFRESHED' ||
          event === 'USER_UPDATED';

        sessionUserIdRef.current = userId;

        if (keepUi) {
          refreshProfile(nextSession.access_token);
          return;
        }

        setProfile(null);
        setLoading(true);
        refreshProfile(nextSession.access_token).finally(() => {
          bootstrappedRef.current = true;
          setLoading(false);
        });
        return;
      }

      sessionUserIdRef.current = null;
      setProfile(null);
      setNeedsProfile(false);
      setLoading(false);
      bootstrappedRef.current = true;
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
