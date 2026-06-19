import { useCallback, useEffect, useState } from 'react';
import { fetchSimulationRunDetail, fetchSimulationRuns } from '../services/simulationApi';

export const SIMULATION_STORAGE_KEY = 'skb_latest_simulation';
export const SIMULATION_UPDATED_EVENT = 'skb-simulation-updated';

function readStoredResults() {
  try {
    const raw = sessionStorage.getItem(SIMULATION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function persistSimulationResults(results) {
  sessionStorage.setItem(SIMULATION_STORAGE_KEY, JSON.stringify(results));
  window.dispatchEvent(new Event(SIMULATION_UPDATED_EVENT));
}

/** Latest greedy simulation — from session (just ran) or most recent saved run in DB. */
export function useLatestSimulation() {
  const [results, setResults] = useState(readStoredResults);
  const [runMeta, setRunMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const stored = readStoredResults();
    if (stored) setResults(stored);

    try {
      const { runs } = await fetchSimulationRuns(1);
      if (runs?.[0]?.id) {
        const detail = await fetchSimulationRunDetail(runs[0].id);
        setResults(detail.results);
        setRunMeta({
          id: detail.id,
          created_at: detail.created_at,
          algorithm: detail.algorithm,
          households: detail.households,
          simulation_days: detail.results?.simulation_days,
        });
        sessionStorage.setItem(SIMULATION_STORAGE_KEY, JSON.stringify(detail.results));
      }
    } catch {
      /* keep session / prior state */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    const onUpdate = () => {
      setResults(readStoredResults());
      reload();
    };
    window.addEventListener(SIMULATION_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(SIMULATION_UPDATED_EVENT, onUpdate);
  }, [reload]);

  return { results, runMeta, loading, reload };
}

/** CO₂ avoided from shared solar (Philippines grid factor ~0.79 kg/kWh). */
export function estimateCo2Kg(solarGeneratedKwh) {
  return Math.round(Number(solarGeneratedKwh || 0) * 0.79);
}

export function buildSavingsTrend(results, period = 'week') {
  if (!results) return [];
  const days = Number(results.simulation_days || 30);
  const total = Number(results.total_savings_php || 0);
  const daily = days > 0 ? total / days : 0;
  const points = period === 'month' ? 30 : 7;
  return Array.from({ length: points }, (_, i) =>
    Math.round(daily * (0.65 + (i / Math.max(points - 1, 1)) * 0.5)),
  );
}

export function buildPeakHourChart(results) {
  const reduction = Number(results?.grid_reduction_pct ?? 0) / 100;
  const scale = Math.max(0.15, 1 - reduction * 0.85);
  const without = [8, 7, 6, 5];
  const withSharing = without.map((v) => Number((v * scale).toFixed(1)));
  return { without, withSharing, labels: ['6PM', '7PM', '8PM', '9PM'] };
}
