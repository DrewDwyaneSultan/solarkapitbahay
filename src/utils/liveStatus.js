/** Derive connection badge state from useLiveData payload. */

const ACTIVE_TRANSFER = new Set(['PREPARING', 'TRANSFERRING', 'SENDING']);

export function isTransferActive(transfer) {
  return ACTIVE_TRANSFER.has(String(transfer || '').toUpperCase());
}

export function getLiveStatus(data) {
  if (!data || data.source === 'mock') {
    return {
      tone: 'mock',
      label: 'Mock data',
      detail: 'Backend unreachable — showing fallback values',
      pulse: false,
    };
  }

  if (!data.brokerConnected) {
    return {
      tone: 'offline',
      label: 'Broker offline',
      detail: 'Start Mosquitto on this laptop',
      pulse: false,
    };
  }

  const online =
    Number(data.housesOnline) ||
    Number(data.houseA?.online) + Number(data.houseB?.online);

  if (online === 0) {
    return {
      tone: 'waiting',
      label: 'No ESP32 data',
      detail: 'Broker OK — power ESP32s and check Wi‑Fi',
      pulse: false,
    };
  }

  if (online === 1) {
    const which = data.houseA?.online ? 'House A' : 'House B';
    return {
      tone: 'partial',
      label: `Live · 1/2 online`,
      detail: `${which} reporting · waiting for other circuit`,
      pulse: true,
    };
  }

  const sync = data.lastSync
    ? new Date(data.lastSync).toLocaleTimeString()
    : new Date().toLocaleTimeString();

  return {
    tone: 'live',
    label: 'Live · 2/2 online',
    detail: `Last MQTT · ${sync}`,
    pulse: true,
  };
}

export function liveStatusStyles(tone) {
  switch (tone) {
    case 'live':
      return { dot: 'bg-emerald-600 animate-pulse', text: 'text-emerald-800' };
    case 'partial':
      return { dot: 'bg-amber-500 animate-pulse', text: 'text-amber-800' };
    case 'waiting':
      return { dot: 'bg-stone-400', text: 'text-sk-ink-muted' };
    case 'offline':
      return { dot: 'bg-rose-500', text: 'text-rose-800' };
    default:
      return { dot: 'bg-amber-500', text: 'text-amber-800' };
  }
}
