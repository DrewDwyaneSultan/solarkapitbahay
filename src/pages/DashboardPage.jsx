import React, { useMemo, useState } from 'react';
import Card from '../components/ui/Card';
import StatTile from '../components/ui/StatTile';
import GlossaryTerm from '../components/ui/GlossaryTerm';
import BatteryOrganism from '../components/energy/BatteryOrganism';
import SimpleLineChart from '../components/charts/SimpleLineChart';
import SimpleDualBarChart from '../components/charts/SimpleDualBarChart';
import ClusterScatterPlot from '../components/clustering/ClusterScatterPlot';
import ClusterMetrics from '../components/clustering/ClusterMetrics';
import LiveStatusBadge from '../components/ui/LiveStatusBadge';
import { useClustering } from '../hooks/useClustering';
import {
  buildPeakHourChart,
  buildSavingsTrend,
  estimateCo2Kg,
  useLatestSimulation,
} from '../hooks/useLatestSimulation';
import { useLiveData } from '../hooks/useLiveData';
import { buildLiveClusterOverlay } from '../utils/liveClusterOverlay';

function formatCurrency(value) {
  return `₱${Number(value || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;
}

export default function DashboardPage({ operatorName = 'Barangay Operator' }) {
  const data = useLiveData();
  const { results: sim, runMeta, loading: simLoading } = useLatestSimulation();
  const {
    data: clusterData,
    loading: clusterLoading,
    error: clusterError,
  } = useClustering();
  const [chartPeriod, setChartPeriod] = useState('week');

  const liveHouseholds = useMemo(() => buildLiveClusterOverlay(data), [data]);
  const liveActive = liveHouseholds.length > 0;

  const savingsTrend = useMemo(() => buildSavingsTrend(sim, chartPeriod), [sim, chartPeriod]);
  const peakChart = useMemo(() => buildPeakHourChart(sim), [sim]);
  const co2Kg = sim ? estimateCo2Kg(sim.solar_generated_kwh) : null;

  const stats = sim
    ? [
        {
          id: 'savings',
          label: 'Total Savings',
          value: formatCurrency(sim.total_savings_php),
          bgKey: 'savings',
          icon: '💰',
          hint: `PHP saved over ${sim.simulation_days ?? 30} simulated days (greedy sharing).`,
        },
        {
          id: 'grid',
          label: 'Grid Reduction',
          value: `${sim.grid_reduction_pct}%`,
          bgKey: 'grid',
          icon: '⚡',
          glossaryId: 'gridReduction',
          hint: 'Less grid energy bought vs. everyone on their own.',
        },
        {
          id: 'gini',
          label: 'Fairness (Gini)',
          value: String(sim.gini_coefficient),
          bgKey: 'battery',
          icon: '⚖️',
          glossaryId: 'gini',
          hint: '0 = perfectly fair shares; closer to 1 = uneven distribution.',
        },
        {
          id: 'co2',
          label: 'CO₂ Offset',
          value: `${co2Kg} kg`,
          bgKey: 'solar',
          icon: '🌱',
          glossaryId: 'co2',
          hint: 'Estimated emissions avoided from shared solar (0.79 kg/kWh).',
        },
        {
          id: 'time',
          label: 'Compute Time',
          value: `${sim.execution_ms ?? '—'}ms`,
          bgKey: 'grid',
          icon: '⏱️',
          glossaryId: 'computeTime',
          hint: 'Backend simulation runtime — live ESP32 transfers are independent.',
        },
      ]
    : [
        {
          id: 'savings',
          label: 'Total Savings',
          value: '—',
          bgKey: 'savings',
          icon: '💰',
          hint: 'Run a simulation to see projected community savings.',
        },
        {
          id: 'grid',
          label: 'Grid Reduction',
          value: '—',
          bgKey: 'grid',
          icon: '⚡',
          glossaryId: 'gridReduction',
          hint: 'Run a simulation to see grid draw reduction.',
        },
        {
          id: 'gini',
          label: 'Fairness (Gini)',
          value: '—',
          bgKey: 'battery',
          icon: '⚖️',
          glossaryId: 'gini',
          hint: 'Run a simulation to see how evenly energy is shared.',
        },
        {
          id: 'co2',
          label: 'CO₂ Offset',
          value: '—',
          bgKey: 'solar',
          icon: '🌱',
          glossaryId: 'co2',
          hint: 'Run a simulation to estimate avoided emissions.',
        },
        {
          id: 'time',
          label: 'Compute Time',
          value: '—',
          bgKey: 'grid',
          icon: '⏱️',
          glossaryId: 'computeTime',
          hint: 'Run a simulation to see how fast the greedy model computes.',
        },
      ];

  const trendTotal = savingsTrend.reduce((a, b) => a + b, 0);
  const runLabel = runMeta?.created_at
    ? new Date(runMeta.created_at).toLocaleString()
    : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-sk-ink">
            Good morning, <em className="text-sk-accent not-italic">{operatorName}</em>
          </h2>
          <p className="text-sm text-sk-ink-muted mt-1">
            {sim ? (
              <>
                Latest simulation:{' '}
                <strong className="text-emerald-800">{formatCurrency(sim.monthly_savings_php)}/mo</strong>
                {runLabel && (
                  <span className="text-sk-ink-muted"> · saved {runLabel}</span>
                )}
              </>
            ) : (
              <>
                No simulation yet — open <strong className="text-sk-ink">Simulation</strong> and run{' '}
                <GlossaryTerm id="greedy">greedy sharing</GlossaryTerm> to populate these metrics.
              </>
            )}
          </p>
        </div>
        <LiveStatusBadge data={data} />
      </div>

      {simLoading && !sim && (
        <p className="text-xs text-sk-ink-muted">Loading latest simulation…</p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {stats.map((stat) => (
          <StatTile
            key={stat.id}
            label={stat.label}
            value={stat.value}
            bgKey={stat.bgKey}
            icon={stat.icon}
            hint={stat.hint}
            glossaryId={stat.glossaryId}
          />
        ))}
      </div>

      <Card>
        <BatteryOrganism data={data} />
      </Card>

      <Card title="Battery Clustering — Charge / Discharge">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className={`inline-flex items-center gap-1.5 text-xs ${liveActive ? 'text-emerald-800' : 'text-sk-ink-muted'}`}>
            <span className={`w-2 h-2 rounded-full ${liveActive ? 'bg-emerald-600 animate-pulse' : 'bg-stone-400'}`} />
            {liveActive ? 'Live House A & B on chart (green ring)' : 'CSV dataset only — power ESP32s for live overlay'}
          </span>
        </div>
        <p className="text-xs text-sk-ink-muted mb-4">
          Gray dots: <GlossaryTerm id="kmeans">K-means</GlossaryTerm> on merged dataset ({clusterData?.households?.length ?? 15} households).
          Pulsing dots: live <GlossaryTerm id="mqtt">MQTT</GlossaryTerm> from your ESP32s — charge / discharge / balanced from{' '}
          <GlossaryTerm id="surplus">SURPLUS</GlossaryTerm>/<GlossaryTerm id="deficit">DEFICIT</GlossaryTerm> and solar watts.
        </p>
        {clusterError && (
          <p className="text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3">
            {clusterError} — start the backend with <code className="text-xs">npm run dev:backend</code>.
          </p>
        )}
        {clusterLoading && !clusterData ? (
          <p className="text-sm text-sk-ink-muted py-16 text-center">Loading clustering…</p>
        ) : (
          <>
            <ClusterScatterPlot
              households={clusterData?.households ?? []}
              liveHouseholds={liveHouseholds}
            />
            <ClusterMetrics metrics={clusterData?.metrics} summary={clusterData?.summary} />
            {clusterData?.summary && (
              <p className="text-xs text-sk-ink-muted mt-3 text-center">
                {clusterData.total_rows} CSV rows · {clusterData.households?.length} households clustered
              </p>
            )}
          </>
        )}
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title="Savings Over Time">
          <div className="flex justify-end gap-1 mb-3">
            {['week', 'month'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setChartPeriod(p)}
                className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${
                  chartPeriod === p ? 'bg-sk-accent text-white' : 'bg-sk-placeholder text-sk-ink-muted'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          {sim ? (
            <>
              <SimpleLineChart data={savingsTrend} height={120} />
              <p className="text-xs text-emerald-800 mt-2 font-semibold">
                Total this {chartPeriod}: {formatCurrency(trendTotal)}
                {sim.grid_reduction_pct != null && ` · ${sim.grid_reduction_pct}% less grid`}
              </p>
            </>
          ) : (
            <p className="text-sm text-sk-ink-muted py-10 text-center">
              Run a simulation to chart projected daily savings.
            </p>
          )}
        </Card>

        <Card title="Peak Hour Savings">
          <p className="text-xs text-sk-ink-muted mb-3">6 PM – 9 PM · Avoided ₱15/kWh peak</p>
          {sim ? (
            <>
              <SimpleDualBarChart
                withoutData={peakChart.without}
                withData={peakChart.withSharing}
                labels={peakChart.labels}
              />
              <p className="text-xs text-sk-ink-muted mt-2">
                Bars scaled from latest run&apos;s {sim.grid_reduction_pct}% grid reduction.
              </p>
            </>
          ) : (
            <p className="text-sm text-sk-ink-muted py-10 text-center">
              Run a simulation to compare peak-hour grid draw with vs. without sharing.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
