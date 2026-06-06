const API_BASE = import.meta.env.VITE_API_URL ?? '';

export async function runSimulation({
  households,
  batteryCapacity,
  simulationDays = 30,
  algorithm = 'greedy',
}) {
  const res = await fetch(`${API_BASE}/api/simulation/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      households,
      battery_capacity_kwh: batteryCapacity,
      simulation_days: simulationDays,
      algorithm,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Simulation failed (${res.status})`);
  }

  return res.json();
}

export async function fetchSimulationRuns(limit = 10) {
  const res = await fetch(`${API_BASE}/api/simulation/runs?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to load simulation history.');
  return res.json();
}
