import React, { useState } from 'react';
import { householdComparison as fallbackComparison } from '../constants/mockSimulation';
import { simulationDefaults } from '../constants/theme';
import Card from '../components/ui/Card';
import RangeSliderWithInput from '../components/ui/RangeSliderWithInput';
import StatTile from '../components/ui/StatTile';
import SimpleLineChart from '../components/charts/SimpleLineChart';
import { useSimulationParams } from '../hooks/useSimulationParams';

function formatCurrency(value) {
  return `₱${Number(value).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;
}

export default function SimulationPage() {
  const {
    households,
    setHouseholds,
    batteryCapacity,
    setBatteryCapacity,
    isRunning,
    results,
    error,
    runSimulation,
  } = useSimulationParams();

  const [minSoc, setMinSoc] = useState(simulationDefaults.minSoc.value);
  const [maxSoc, setMaxSoc] = useState(simulationDefaults.maxSoc.value);
  const [peakTariff, setPeakTariff] = useState(String(simulationDefaults.peakTariff));
  const [duration, setDuration] = useState(String(simulationDefaults.durationDays));

  const savingsWeek = [4200, 5100, 6800, 7200, 8100, 7900, 9300];

  const stats = results
    ? [
        { id: 'savings', label: 'Total Savings', value: formatCurrency(results.total_savings_php), bgKey: 'savings', icon: '💰' },
        { id: 'grid', label: 'Grid Reduction', value: `${results.grid_reduction_pct}%`, bgKey: 'grid', icon: '⚡' },
        { id: 'gini', label: 'Fairness (Gini)', value: String(results.gini_coefficient), bgKey: 'battery', icon: '⚖️' },
        { id: 'time', label: 'Compute Time', value: `${results.execution_ms}ms`, bgKey: 'solar', icon: '⏱️' },
      ]
    : null;

  const comparisonRows = results?.household_comparison ?? fallbackComparison;
  const monthlySavings = results ? Math.round(Number(results.total_savings_php) / Number(duration) * 30) : 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif text-2xl font-semibold text-sk-ink">Simulation Planner</h2>
        <p className="text-sm text-sk-ink-muted mt-1 flex flex-wrap items-center gap-2">
          Configure parameters and run the pre-optimized algorithm.
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-900">
            ⚡ Hybrid Algorithm (pre-chosen)
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] gap-6">
        <div className="space-y-4">
          <Card title="Community Settings">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <RangeSliderWithInput
                id="households"
                label="Households"
                min={simulationDefaults.households.min}
                max={simulationDefaults.households.max}
                value={households}
                onChange={setHouseholds}
              />
              <RangeSliderWithInput
                id="battery-capacity"
                label="Battery Capacity"
                min={simulationDefaults.batteryCapacity.min}
                max={simulationDefaults.batteryCapacity.max}
                value={batteryCapacity}
                onChange={setBatteryCapacity}
                unit="kWh"
              />
            </div>
          </Card>

          <Card title="Battery & Tariff Settings">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <RangeSliderWithInput
                id="min-soc"
                label="Min SOC (%)"
                min={simulationDefaults.minSoc.min}
                max={simulationDefaults.minSoc.max}
                value={minSoc}
                onChange={setMinSoc}
                unit="%"
              />
              <RangeSliderWithInput
                id="max-soc"
                label="Max SOC (%)"
                min={simulationDefaults.maxSoc.min}
                max={simulationDefaults.maxSoc.max}
                value={maxSoc}
                onChange={setMaxSoc}
                unit="%"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-sk-ink-muted mb-1.5">
                  Peak Tariff (₱/kWh)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={peakTariff}
                  onChange={(e) => setPeakTariff(e.target.value)}
                  className="w-full h-10 rounded-md border border-sk-card-border/60 bg-white px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-sk-ink-muted mb-1.5">
                  Duration
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full h-10 rounded-md border border-sk-card-border/60 bg-white px-3 text-sm"
                >
                  <option value="7">7 Days</option>
                  <option value="30">30 Days</option>
                  <option value="90">90 Days</option>
                </select>
              </div>
            </div>
          </Card>

          {error && (
            <p className="text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={runSimulation}
              disabled={isRunning}
              className="flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 rounded-xl bg-sk-accent text-white font-semibold text-sm hover:opacity-95 disabled:opacity-60 shadow-md"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M8 5.14v13.72a1 1 0 001.52.85l10.26-6.86a1 1 0 000-1.7L9.52 4.29A1 1 0 008 5.14z" />
              </svg>
              {isRunning ? 'Running…' : 'Run Simulation'}
            </button>
            <button type="button" className="h-11 px-4 rounded-xl border border-sk-card-border/70 text-sm font-semibold bg-white">
              Save
            </button>
            <button type="button" className="h-11 px-4 rounded-xl border border-sk-card-border/70 text-sm font-semibold bg-white">
              Load
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {!results ? (
            <Card className="min-h-[420px] flex flex-col items-center justify-center text-center p-8">
              <span className="text-4xl mb-4" aria-hidden>
                ☀️
              </span>
              <h3 className="font-serif text-xl font-semibold text-sk-ink">Configure & run simulation</h3>
              <p className="text-sm text-sk-ink-muted mt-2 max-w-md">
                The pre-optimized Hybrid Algorithm will compute optimal energy distribution across your
                community battery network.
              </p>
              <p className="mt-4 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
                ✓ No algorithm selector needed — already optimized
              </p>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                {stats.map((stat) => (
                  <StatTile key={stat.id} label={stat.label} value={stat.value} bgKey={stat.bgKey} icon={stat.icon} />
                ))}
              </div>

              <Card title="System Recommendation">
                <div className="rounded-xl bg-emerald-50/80 border border-emerald-200 p-4 text-sm text-sk-ink">
                  <p className="font-semibold text-emerald-900 mb-1">✓ Hybrid algorithm result</p>
                  <p>
                    Based on the pre-optimized Hybrid Algorithm, your {households}-household community with a{' '}
                    {batteryCapacity} kWh battery can achieve {formatCurrency(results.total_savings_php)} in savings
                    over {duration} days (~{formatCurrency(monthlySavings)}/month projected).
                  </p>
                  <p className="text-xs text-sk-ink-muted mt-2">
                    Estimated payback ~2 years · Hardware cost est. ₱200,000 · Run #{results.run_id}
                  </p>
                </div>
              </Card>

              <Card title="Projected Daily Savings">
                <SimpleLineChart data={savingsWeek} height={140} />
                <div className="flex justify-between text-[10px] text-sk-ink-muted mt-2 px-1">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                </div>
              </Card>

              <Card title="Compare Households">
                <ul className="space-y-3">
                  {comparisonRows.map((row) => (
                    <li key={row.id} className="flex items-center gap-3">
                      <span className="w-14 text-xs font-bold text-sk-ink shrink-0">{row.id}</span>
                      <div className="flex-1 h-3 rounded-full bg-sk-placeholder overflow-hidden">
                        <div className="h-full rounded-full bg-sk-progress" style={{ width: `${row.share}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
