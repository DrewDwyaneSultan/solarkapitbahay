const API_BASE = import.meta.env.VITE_API_URL ?? '';
const API_TIMEOUT_MS = 12000;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function authHeaders(accessToken) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}

export async function fetchAuthStatus() {
  const res = await fetch(`${API_BASE}/api/auth/status`);
  if (!res.ok) return { auth_configured: false };
  return res.json();
}

export async function fetchMe(accessToken) {
  let res;
  try {
    res = await fetchWithTimeout(`${API_BASE}/api/auth/me`, {
      headers: authHeaders(accessToken),
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutErr = new Error('Backend timed out. Try again in a moment.');
      timeoutErr.status = 504;
      throw timeoutErr;
    }
    throw err;
  }
  if (res.status === 404) {
    const err = new Error('Profile not found');
    err.status = 404;
    throw err;
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.detail ?? `Auth failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function saveProfile(accessToken, profile) {
  const res = await fetch(`${API_BASE}/api/auth/profile`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(profile),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Save profile failed (${res.status})`);
  }
  return res.json();
}

export async function fetchHouseholdOptions(barangayCode) {
  const params = barangayCode
    ? `?barangay_code=${encodeURIComponent(barangayCode)}&claimable_only=true`
    : '';
  const res = await fetch(`${API_BASE}/api/households${params}`);
  if (!res.ok) throw new Error('Failed to load households.');
  const data = await res.json();
  return data.households ?? [];
}
