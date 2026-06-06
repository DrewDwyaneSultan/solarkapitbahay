import { useCallback, useEffect, useState } from 'react';
import { fetchClustering, fetchHouseholdCluster } from '../services/clusteringApi';

export function useClustering() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchClustering());
    } catch (err) {
      setError(err.message ?? 'Could not load clustering.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
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
