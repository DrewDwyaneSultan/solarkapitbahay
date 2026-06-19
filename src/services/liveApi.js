const API_BASE = import.meta.env.VITE_API_URL ?? '';

export async function fetchLiveTelemetry() {
  const res = await fetch(`${API_BASE}/api/live`);
  if (!res.ok) throw new Error('Live telemetry unavailable.');
  return res.json();
}

export async function fetchMqttStatus() {
  const res = await fetch(`${API_BASE}/api/live/status`);
  if (!res.ok) throw new Error('MQTT status unavailable.');
  return res.json();
}
