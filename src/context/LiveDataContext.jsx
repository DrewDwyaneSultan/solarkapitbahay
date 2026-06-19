import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchLiveTelemetry } from '../services/liveApi';
import { mockFallback, mapApiToState } from '../hooks/liveDataUtils';

const LiveDataContext = createContext(mockFallback);

const POLL_MS = 3000;

export function LiveDataProvider({ children }) {
  const [data, setData] = useState(mockFallback);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const api = await fetchLiveTelemetry();
        if (cancelled) return;
        setData(mapApiToState(api));
      } catch {
        if (!cancelled) {
          setData({ ...mockFallback, source: 'mock' });
        }
      }
    }

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const value = useMemo(() => data, [data]);
  return <LiveDataContext.Provider value={value}>{children}</LiveDataContext.Provider>;
}

export function useLiveData() {
  return useContext(LiveDataContext);
}
