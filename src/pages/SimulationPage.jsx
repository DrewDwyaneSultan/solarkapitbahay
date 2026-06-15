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

function ConfigSummaryPill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-sk-card-border/50 bg-white/80 px-3 py-1 text-xs font-medium text-sk-ink">
      {children}
    </span>
  );
}

function FormField({ id, label, children, hint }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[11px] font-bold uppercase tracking-wider text-sk-ink-muted">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-sk-ink-muted leading-snug">{hint}</p>}
    </div>
  );
}

const fieldClass =
  'w-full h-10 rounded-lg border border-sk-card-border/60 bg-white px-3 text-sm text-sk-ink focus:outline-none focus:ring-2 focus:ring-sk-run/25';

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
  const monthlySavings = results
    ? Math.round(Number(results.monthly_savings_php ?? 0))
    : 0;
  const paybackLabel =
    results?.payback_months != null
      ? `~${results.payback_months} mo`
      : '—';
  const hardwareCost = results?.hardware_cost_php ?? 1500;

  const handleRun = () => runSimulation(Number(duration));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="font-serif text-2xl font-semibold text-sk-ink">Simulation Planner</h2>
          <p className="text-sm text-sk-ink-muted mt-1.5 leading-relaxed">
            Configure parameters and run the Greedy energy-sharing algorithm (Colab/TOPSIS winner).
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-300 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-900 shrink-0">
          <span aria-hidden>⚡</span>
          Greedy Algorithm
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] gap-6 items-start">
        <aside className="space-y-4 xl:sticky xl:top-4">
          <Card title="Community Settings">
            <div className="space-y-3">
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
            <div className="space-y-3">
              <RangeSliderWithInput
                id="min-soc"
                label="Min SOC"
                min={simulationDefaults.minSoc.min}
                max={simulationDefaults.minSoc.max}
                value={minSoc}
                onChange={setMinSoc}
                unit="%"
              />
              <RangeSliderWithInput
                id="max-soc"
                label="Max SOC"
                min={simulationDefaults.maxSoc.min}
                max={simulationDefaults.maxSoc.max}
                value={maxSoc}
                onChange={setMaxSoc}
                unit="%"
              />
            </div>

            <div className="mt-4 pt-4 border-t border-sk-card-border/40 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                id="peak-tariff"
                label="Peak Tariff (₱/kWh)"
                hint="Display only — backend uses Davao Light TOU rates."
              >
                <input
                  id="peak-tariff"
                  type="number"
                  step="0.01"
                  value={peakTariff}
                  onChange={(e) => setPeakTariff(e.target.value)}
                  className={fieldClass}
                />
              </FormField>
              <FormField id="duration" label="Duration">
                <select
                  id="duration"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className={fieldClass}
                >
                  <option value="7">7 Days</option>
                  <option value="30">30 Days</option>
                  <option value="90">90 Days</option>
                </select>
              </FormField>
            </div>

            <div className="mt-4 rounded-lg bg-sk-placeholder/40 border border-sk-card-border/30 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-sk-ink-muted mb-1.5">
                Davao Light TOU (backend)
              </p>
              <div className="flex flex-wrap gap-1.5 text-[11px] text-sk-ink">
                <span className="rounded-md bg-rose-50 border border-rose-200/80 px-2 py-0.5">Peak 6–9 PM · ₱12.70</span>
                <span className="rounded-md bg-amber-50 border border-amber-200/80 px-2 py-0.5">Mid · ₱10.58</span>
                <span className="rounded-md bg-sky-50 border border-sky-200/80 px-2 py-0.5">Off 10 PM–5 AM · ₱8.99</span>
              </div>
            </div>
          </Card>

          {error && (
            <p className="text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 xl:hidden">
            <button
              type="button"
              onClick={handleRun}
              disabled={isRunning}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-sk-accent text-white font-semibold text-sm hover:opacity-95 disabled:opacity-60 shadow-md"
            >
              {isRunning ? 'Running…' : 'Run Simulation'}
            </button>
          </div>
        </aside>

        <div className="space-y-4 min-w-0">
          {!results ? (
            <Card className="flex flex-col items-center justify-center text-center px-6 py-12 sm:py-16 min-h-[28rem]">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200/80 text-3xl mb-5">
                <span aria-hidden>☀️</span>
              </div>
              <h3 className="font-serif text-xl sm:text-2xl font-semibold text-sk-ink">
                Configure &amp; run simulation
              </h3>
              <p className="text-sm text-sk-ink-muted mt-3 max-w-md leading-relaxed">
                Greedy matches surplus to the largest needs first, then routes through the community
                battery using Davao Light TOU tariffs (same logic as your Colab runs).
              </p>

              <div className="flex flex-wrap justify-center gap-2 mt-6">
                <ConfigSummaryPill>{households} households</ConfigSummaryPill>
                <ConfigSummaryPill>{batteryCapacity} kWh battery</ConfigSummaryPill>
                <ConfigSummaryPill>{duration} days</ConfigSummaryPill>
              </div>

              <button
                type="button"
                onClick={handleRun}
                disabled={isRunning}
                className="hidden xl:flex mt-8 items-center justify-center gap-2 min-w-[220px] py-3.5 px-6 rounded-xl bg-sk-accent text-white font-semibold text-sm hover:opacity-95 disabled:opacity-60 shadow-md"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M8 5.14v13.72a1 1 0 001.52.85l10.26-6.86a1 1 0 000-1.7L9.52 4.29A1 1 0 008 5.14z" />
                </svg>
                {isRunning ? 'Running…' : 'Run Simulation'}
              </button>

              <p className="mt-6 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5">
                LP &amp; Hybrid comparison coming later — Greedy is live now
              </p>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {stats.map((stat) => (
                  <StatTile key={stat.id} label={stat.label} value={stat.value} bgKey={stat.bgKey} icon={stat.icon} />
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleRun}
                  disabled={isRunning}
                  className="flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl bg-sk-accent text-white font-semibold text-sm hover:opacity-95 disabled:opacity-60 shadow-sm"
                >
                  {isRunning ? 'Running…' : 'Re-run Simulation'}
                </button>
              </div>

              <Card title="System Recommendation">
                <div className="rounded-xl bg-emerald-50/80 border border-emerald-200 p-4 text-sm text-sk-ink">
                  <p className="font-semibold text-emerald-900 mb-1">Greedy algorithm result</p>
                  <p className="leading-relaxed">
                    Your {households}-household community with a {batteryCapacity} kWh battery can save{' '}
                    {formatCurrency(results.total_savings_php)} over {duration} days (~
                    {formatCurrency(results.monthly_savings_php ?? monthlySavings)}/month).
                  </p>
                  <p className="text-xs text-sk-ink-muted mt-2">
                    Hardware est. {formatCurrency(hardwareCost)} (ESP32 stack) · Payback {paybackLabel} · Run #
                    {results.run_id} · {results.execution_ms}ms
                  </p>
                </div>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
