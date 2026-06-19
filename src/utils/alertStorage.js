const STORAGE_KEY = 'sk-alert-state';

function readRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { suppressed: [], history: [] };
    const parsed = JSON.parse(raw);
    return {
      suppressed: Array.isArray(parsed.suppressed) ? parsed.suppressed : [],
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    return { suppressed: [], history: [] };
  }
}

export function loadAlertState() {
  const { suppressed, history } = readRaw();
  return {
    suppressedIds: new Set(suppressed),
    history,
  };
}

export function persistAlertState(suppressedIds, history) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        suppressed: [...suppressedIds],
        history: history.slice(0, 50),
      }),
    );
  } catch {
    /* quota / private mode */
  }
}
