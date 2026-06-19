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

export async function executeManualTransfer(accessToken, { fromHouse, toHouse, watts }) {
  const res = await fetch(`${API_BASE}/api/live/manual-transfer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      from_house: fromHouse,
      to_house: toHouse,
      watts,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.detail ?? 'Manual transfer command failed.');
  return body;
}
