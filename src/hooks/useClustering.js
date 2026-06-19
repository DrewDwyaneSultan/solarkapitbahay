import { useCallback, useEffect, useState } from 'react';
import { fetchClustering, fetchHouseholdCluster } from '../services/clusteringApi';

const CLUSTER_POLL_MS = 15000;

export function useClustering() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const next = await fetchClustering(false);
      setData(next);
    } catch (err) {
      setError(err.message ?? 'Could not load clustering.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    const id = setInterval(reload, CLUSTER_POLL_MS);
    return () => clearInterval(id);
  }, [reload]);

  return { data, loading, error, reload };
}

export function useHouseholdCluster(householdId) {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(Boolean(householdId));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!householdId) {
      setRecord(null);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchHouseholdCluster(householdId)
      .then((row) => {
        if (!cancelled) setRecord(row);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setRecord(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [householdId]);

  return { record, loading, error };
}
