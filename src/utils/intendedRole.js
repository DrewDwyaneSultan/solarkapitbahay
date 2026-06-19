export const INTENDED_ROLE_KEY = 'skb_intended_role';
const URL_PARAM = 'intended_role';

/** Persist operator vs household choice before OAuth redirect. */
export function persistIntendedRole(role) {
  try {
    sessionStorage.setItem(INTENDED_ROLE_KEY, role);
  } catch {
    /* ignore */
  }
}

export function readIntendedRole() {
  try {
    const stored = sessionStorage.getItem(INTENDED_ROLE_KEY);
    if (stored === 'household' || stored === 'operator') return stored;
  } catch {
    /* ignore */
  }
  return null;
}

export function clearIntendedRole() {
  try {
    sessionStorage.removeItem(INTENDED_ROLE_KEY);
  } catch {
    /* ignore */
  }
}

/** Read ?intended_role= from OAuth redirect and store it (sessionStorage alone is unreliable). */
export function consumeIntendedRoleFromUrl() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get(URL_PARAM);
  if (fromUrl !== 'household' && fromUrl !== 'operator') return readIntendedRole();

  persistIntendedRole(fromUrl);
  params.delete(URL_PARAM);
  const nextQuery = params.toString();
  const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
  window.history.replaceState({}, '', nextUrl);
  return fromUrl;
}
