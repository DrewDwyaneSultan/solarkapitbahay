import { useCallback, useState } from 'react';
import { simulationDefaults } from '../constants/theme';
import { persistSimulationResults } from './useLatestSimulation';
import { runSimulation as runSimulationApi } from '../services/simulationApi';

export function useSimulationParams() {
  const [households, setHouseholds] = useState(simulationDefaults.households.value);
  const [batteryCapacity, setBatteryCapacity] = useState(
    simulationDefaults.batteryCapacity.value,
  );
  const [algorithm, setAlgorithm] = useState('greedy');
  const [isRunning, setIsRunning] = useState(false);
  const [lastRunAt, setLastRunAt] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const runSimulation = useCallback(
    async (simulationDays = 30) => {
      setIsRunning(true);
      setError(null);
      try {
        const data = await runSimulationApi({
          households,
          batteryCapacity,
          simulationDays,
          algorithm,
        });
        setResults(data);
        setLastRunAt(new Date());
        persistSimulationResults(data);
      } catch (err) {
        setError(err.message ?? 'Simulation failed. Is the backend running?');
        setResults(null);
      } finally {
        setIsRunning(false);
      }
    },
    [households, batteryCapacity, algorithm],
  );

  return {
    households,
    setHouseholds,
    batteryCapacity,
    setBatteryCapacity,
    algorithm,
    setAlgorithm,
    isRunning,
    lastRunAt,
    results,
    error,
    runSimulation,
    params: { households, batteryCapacity, algorithm },
  };
}
