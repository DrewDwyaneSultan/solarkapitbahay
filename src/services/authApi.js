const API_BASE = import.meta.env.VITE_API_URL ?? '';

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
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: authHeaders(accessToken),
  });
  if (res.status === 404) {
    const err = new Error('Profile not found');
    err.status = 404;
    throw err;
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Auth failed (${res.status})`);
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

export async function fetchHouseholdOptions() {
  const res = await fetch(`${API_BASE}/api/households`);
  if (!res.ok) throw new Error('Failed to load households.');
  const data = await res.json();
  return data.households ?? [];
}
