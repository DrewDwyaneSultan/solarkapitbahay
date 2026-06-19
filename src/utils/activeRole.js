import { getProfileRoles } from './profileRoles';

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
  const roles = getProfileRoles(profile);

  const stored = readActiveRole();
  if (stored && roles.includes(stored)) return stored;

  if (intended && roles.includes(intended)) return intended;

  const primary = String(profile?.role ?? '').toLowerCase().trim();
  if (primary && roles.includes(primary)) return primary;

  return roles[0] ?? 'operator';
}
