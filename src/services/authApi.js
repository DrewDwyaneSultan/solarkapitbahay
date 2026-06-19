const API_BASE = import.meta.env.VITE_API_URL ?? '';
const API_TIMEOUT_MS = 25000;
const AUTH_ME_RETRIES = 2;

async function fetchWithTimeout(url, options = {}, timeoutMs = API_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
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
  let lastErr;
  for (let attempt = 0; attempt < AUTH_ME_RETRIES; attempt += 1) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 1500));
    }
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/auth/me`, {
        headers: authHeaders(accessToken),
      });
      if (res.status === 404) {
        const err = new Error('Profile not found');
        err.status = 404;
        throw err;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const raw = body.detail;
        const detail =
          typeof raw === 'string'
            ? raw
            : Array.isArray(raw)
              ? raw.map((d) => d?.msg ?? JSON.stringify(d)).join('; ')
              : raw
                ? String(raw)
                : null;
        const err = new Error(detail ?? `Auth failed (${res.status})`);
        err.status = res.status;
        throw err;
      }
      return res.json();
    } catch (err) {
      lastErr = err;
      if (err.status === 404 || err.status === 401 || err.status === 403) {
        throw err;
      }
      if (err.name !== 'AbortError' && !err.status) {
        throw err;
      }
    }
  }
  if (lastErr?.name === 'AbortError') {
    const timeoutErr = new Error(
      'Backend timed out. The server may be waking up — tap Retry or wait a few seconds.',
    );
    timeoutErr.status = 504;
    throw timeoutErr;
  }
  throw lastErr ?? new Error('Could not load profile.');
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

export async function switchToOperator(accessToken) {
  const res = await fetchWithTimeout(`${API_BASE}/api/auth/switch-to-operator`, {
    method: 'POST',
    headers: authHeaders(accessToken),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? 'Could not add operator access.');
  }
  return res.json();
}

export async function switchActiveRole(accessToken, role) {
  const res = await fetchWithTimeout(`${API_BASE}/api/auth/switch-role`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ role }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? 'Could not switch role.');
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
