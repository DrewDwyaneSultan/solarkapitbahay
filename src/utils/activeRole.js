export const ACTIVE_ROLE_KEY = 'skb_active_role';

export function persistActiveRole(role) {
  try {
    sessionStorage.setItem(ACTIVE_ROLE_KEY, role);
  } catch {
    /* ignore */
  }
}

export function readActiveRole() {
  try {
    const stored = sessionStorage.getItem(ACTIVE_ROLE_KEY);
    if (stored === 'household' || stored === 'operator') return stored;
  } catch {
    /* ignore */
  }
  return null;
}

export function clearActiveRole() {
  try {
    sessionStorage.removeItem(ACTIVE_ROLE_KEY);
  } catch {
    /* ignore */
  }
}

/** Pick operator vs household view when one Google account has both roles. */
export function resolveActiveRole(profile, intended = null) {
  const roles = profile?.roles?.length
    ? profile.roles.filter((r) => r === 'operator' || r === 'household')
    : profile?.role
      ? [profile.role]
      : [];

  if (intended && roles.includes(intended)) return intended;

  const stored = readActiveRole();
  if (stored && roles.includes(stored)) return stored;

  if (profile?.role && roles.includes(profile.role)) return profile.role;

  return roles[0] ?? 'operator';
}
