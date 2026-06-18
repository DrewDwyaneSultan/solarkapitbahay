const API_BASE = import.meta.env.VITE_API_URL ?? '';

function authHeaders(accessToken) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}

async function parseError(res) {
  const body = await res.json().catch(() => ({}));
  throw new Error(body.detail ?? `Request failed (${res.status})`);
}

export async function lookupBarangay(code) {
  const res = await fetch(
    `${API_BASE}/api/barangays/lookup?code=${encodeURIComponent(code.trim())}`,
  );
  if (res.status === 404) return null;
  if (!res.ok) await parseError(res);
  return res.json();
}

export async function fetchMyBarangay(accessToken) {
  const res = await fetch(`${API_BASE}/api/barangays/mine`, {
    headers: authHeaders(accessToken),
  });
  if (res.status === 404) return null;
  if (!res.ok) await parseError(res);
  return res.json();
}

export async function registerBarangay(accessToken, payload) {
  const res = await fetch(`${API_BASE}/api/barangays/register`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
  if (!res.ok) await parseError(res);
  return res.json();
}

export async function fetchRegistrations(accessToken, status = 'pending') {
  const res = await fetch(`${API_BASE}/api/registrations?status=${status}`, {
    headers: authHeaders(accessToken),
  });
  if (!res.ok) await parseError(res);
  return res.json();
}

export async function approveRegistration(accessToken, registrationId) {
  const res = await fetch(`${API_BASE}/api/registrations/${registrationId}/approve`, {
    method: 'PATCH',
    headers: authHeaders(accessToken),
  });
  if (!res.ok) await parseError(res);
  return res.json();
}

export async function rejectRegistration(accessToken, registrationId, reason) {
  const res = await fetch(`${API_BASE}/api/registrations/${registrationId}/reject`, {
    method: 'PATCH',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ reason: reason || null }),
  });
  if (!res.ok) await parseError(res);
  return res.json();
}

export async function fetchHouseholdsByBarangay(barangayCode, { claimableOnly = false } = {}) {
  const params = new URLSearchParams({ barangay_code: barangayCode });
  if (claimableOnly) params.set('claimable_only', 'true');
  const res = await fetch(`${API_BASE}/api/households?${params}`);
  if (!res.ok) await parseError(res);
  const data = await res.json();
  return data.households ?? [];
}
