const API_BASE = import.meta.env.VITE_API_URL ?? '';

export async function fetchClustering() {
  const res = await fetch(`${API_BASE}/api/clustering`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Clustering failed (${res.status})`);
  }
  return res.json();
}

export async function fetchHouseholdCluster(householdId) {
  const res = await fetch(`${API_BASE}/api/clustering/${encodeURIComponent(householdId)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Household cluster not found (${res.status})`);
  }
  return res.json();
}
