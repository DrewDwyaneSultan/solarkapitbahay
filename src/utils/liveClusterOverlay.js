const ACTION_META = {
  charge: { label: 'Charge', color: '#2563eb' },
  discharge: { label: 'Discharge', color: '#d97706' },
  balanced: { label: 'Balanced', color: '#6b7280' },
};

function actionFromLive(status, wattage, netLoadW) {
  if (status === 'DEFICIT' || netLoadW > 20) return 'charge';
  if (status === 'SURPLUS' && wattage > 0.2) return 'discharge';
  return 'balanced';
}

/** Map MQTT live telemetry to clustering scatter overlay points (no extra API call). */
export function buildLiveClusterOverlay(liveData) {
  if (!liveData?.mqttConnected) return [];

  const batteryPct = Number(liveData.battery ?? 0);
  const houses = [
    { code: 'A', house: liveData.houseA },
    { code: 'B', house: liveData.houseB },
  ];

  return houses
    .filter(({ house }) => house?.online)
    .map(({ code, house }) => {
      const solar = Number(house.solar ?? 0);
      const load = Number(house.load ?? 0);
      const netW = load - solar;
      const netKwh = netW / 1000;
      const status = String(house.status ?? 'UNKNOWN');
      const wattage = Number(house.wattage ?? solar);
      const action = actionFromLive(status, wattage, netW);
      const meta = ACTION_META[action];

      return {
        household_id: `LIVE-${code}`,
        head_name: house.name ?? `House ${code}`,
        net_load_kwh: Number(netKwh.toFixed(4)),
        battery_soc_pct: Number((house.battery_percent ?? batteryPct).toFixed(1)),
        scatter_x: Number(netKwh.toFixed(4)),
        scatter_y: Number((house.battery_percent ?? batteryPct).toFixed(1)),
        action,
        action_label: meta.label,
        action_color: meta.color,
        live: true,
        online: true,
      };
    });
}
