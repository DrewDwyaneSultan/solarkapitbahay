import React from 'react';
import { householdComparison as fallbackComparison } from '../constants/mockSimulation';
import { simulationDefaults } from '../constants/theme';
import Card from '../components/ui/Card';
import PlaceholderSlot from '../components/ui/PlaceholderSlot';
import RangeSlider from '../components/ui/RangeSlider';
import StatTile from '../components/ui/StatTile';
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
    algorithm,
    setAlgorithm,
    isRunning,
    results,
    error,
    runSimulation,
  } = useSimulationParams();

  const stats = results
    ? [
        { id: 'totalSavings', label: 'Total Savings', value: formatCurrency(results.total_savings_php), bgKey: 'savings' },
        { id: 'solarGenerated', label: 'Solar Generated', value: `${results.solar_generated_kwh} kWh`, bgKey: 'solar' },
        { id: 'batterySoc', label: 'Battery SOC', value: `${results.battery_soc_pct}%`, bgKey: 'battery' },
        { id: 'gridReduction', label: 'Grid Reduction', value: `${results.grid_reduction_pct}%`, bgKey: 'grid' },
      ]
    : [
        { id: 'totalSavings', label: 'Total Savings', value: '—', bgKey: 'savings' },
        { id: 'solarGenerated', label: 'Solar Generated', value: '—', bgKey: 'solar' },
        { id: 'batterySoc', label: 'Battery SOC', value: '—', bgKey: 'battery' },
        { id: 'gridReduction', label: 'Grid Reduction', value: '—', bgKey: 'grid' },
      ];

  const comparisonRows = results?.household_comparison ?? fallbackComparison;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-6">
      <div className="space-y-4">
        <Card title="Parameters">
          <div className="space-y-6">
            <RangeSlider
              id="households"
              label="Households"
              min={simulationDefaults.households.min}
              max={simulationDefaults.households.max}
              value={households}
              onChange={setHouseholds}
            />
            <RangeSlider
              id="battery-capacity"
              label="Community Battery Capacity"
              min={simulationDefaults.batteryCapacity.min}
              max={simulationDefaults.batteryCapacity.max}
              value={batteryCapacity}
              onChange={setBatteryCapacity}
              unit={simulationDefaults.batteryCapacity.unit}
            />
          </div>
        </Card>

        <Card title="Selected Algorithm">
          <div className="grid grid-cols-2 gap-3">
            <AlgorithmOption
              id="greedy"
              label="Greedy"
              description="Live — priority-based allocation"
              selected={algorithm === 'greedy'}
              onSelect={() => setAlgorithm('greedy')}
            />
            <AlgorithmOption
              id="lp"
              label="Linear Programming"
              description="Coming next sprint"
              selected={algorithm === 'lp'}
              onSelect={() => setAlgorithm('lp')}
              disabled
            />
          </div>
        </Card>

        <Card title="Hardware Constraints">
          <div className="space-y-2 text-sm text-sk-ink-muted">
            <p>Greedy target: ESP32-class nodes (placeholder constraints)</p>
            <PlaceholderSlot variant="pill" label="Max memory: 520 KB SRAM" />
            <PlaceholderSlot variant="pill" label="Offline-capable: yes" />
          </div>
        </Card>

        {error && (
          <p className="text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={runSimulation}
          disabled={isRunning || algorithm !== 'greedy'}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-sk-run text-white font-semibold text-sm tracking-wide hover:bg-sk-run-hover active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-emerald-950/15"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M8 5.14v13.72a1 1 0 001.52.85l10.26-6.86a1 1 0 000-1.7L9.52 4.29A1 1 0 008 5.14z" />
          </svg>
          {isRunning ? 'Running…' : 'Run Simulation'}
        </button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => (
            <StatTile key={stat.id} label={stat.label} value={stat.value} bgKey={stat.bgKey} />
          ))}
        </div>

        {results && (
          <Card title="Run Summary">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-[10px] uppercase tracking-widest text-sk-ink-muted font-bold">Run ID</dt>
                <dd className="font-semibold text-sk-ink">#{results.run_id}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-widest text-sk-ink-muted font-bold">Execution</dt>
                <dd className="font-semibold text-sk-ink">{results.execution_ms} ms</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-widest text-sk-ink-muted font-bold">Energy Shared</dt>
                <dd className="font-semibold text-sk-ink">{results.energy_shared_kwh} kWh</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-widest text-sk-ink-muted font-bold">Gini (fairness)</dt>
                <dd className="font-semibold text-sk-ink">{results.gini_coefficient}</dd>
              </div>
            </dl>
          </Card>
        )}

        <Card title="Compare Households">
          <ul className="space-y-3" aria-label="Household comparison">
            {comparisonRows.map((row) => (
              <li key={row.id} className="flex items-center gap-3">
                <span className="w-14 text-xs font-bold text-sk-ink shrink-0">{row.id}</span>
                <div className="flex-1 h-3 rounded-full bg-sk-placeholder overflow-hidden border border-sk-card-border/30">
                  <div
                    className="h-full rounded-full bg-sk-progress transition-all duration-300"
                    style={{ width: `${row.share}%` }}
                    role="progressbar"
                    aria-valuenow={row.share}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Algorithm Comparison">
          <div className="grid grid-cols-2 gap-3">
            <PlaceholderSlot variant="chart" label="Greedy results (current run)" />
            <PlaceholderSlot variant="chart" label="LP / Hybrid (next sprint)" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function AlgorithmOption({ id, label, description, selected, onSelect, disabled = false }) {
  return (
    <button
      type="button"
      id={id}
      onClick={onSelect}
      disabled={disabled}
      className={`rounded-xl border p-3 text-left transition-colors ${
        selected
          ? 'border-sk-run bg-emerald-50/80'
          : 'border-sk-card-border/40 bg-sk-placeholder hover:bg-white/60'
      } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      <p className="text-sm font-semibold text-sk-ink">{label}</p>
      <p className="text-xs text-sk-ink-muted mt-1">{description}</p>
    </button>
  );
}
