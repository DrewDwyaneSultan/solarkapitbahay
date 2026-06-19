import { parseApiError } from './apiErrors';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export async function runSimulation({
  households,
  batteryCapacity,
  simulationDays = 30,
  minSocPct = 20,
  maxSocPct = 95,
  algorithm = 'greedy',
}) {
  const res = await fetch(`${API_BASE}/api/simulation/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      households,
      battery_capacity_kwh: batteryCapacity,
      simulation_days: simulationDays,
      min_soc_pct: minSocPct,
      max_soc_pct: maxSocPct,
      algorithm,
    }),
  });

  if (!res.ok) throw await parseApiError(res);

  return res.json();
}

export async function fetchSimulationRuns(limit = 10) {
  const res = await fetch(`${API_BASE}/api/simulation/runs?limit=${limit}`);
  if (!res.ok) throw await parseApiError(res);
  return res.json();
}

export async function fetchSimulationRunDetail(runId) {
  const res = await fetch(`${API_BASE}/api/simulation/runs/${runId}`);
  if (!res.ok) throw await parseApiError(res);
  return res.json();
}
