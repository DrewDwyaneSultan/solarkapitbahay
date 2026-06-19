import React, { useMemo, useState } from 'react';
import Card from '../../components/ui/Card';
import StatTile from '../../components/ui/StatTile';
import BatteryOrganism from '../../components/energy/BatteryOrganism';
import BatteryActionIndicator from '../../components/clustering/BatteryActionIndicator';
import SimpleLineChart from '../../components/charts/SimpleLineChart';
import SimpleDualBarChart from '../../components/charts/SimpleDualBarChart';
import { CIRCUIT_HOUSES, resolveCircuit } from '../../constants/circuits';
import { useHouseholdCluster } from '../../hooks/useClustering';
import {
  buildPeakHourChart,
  buildSavingsTrend,
  useLatestSimulation,
} from '../../hooks/useLatestSimulation';
import { getHouseCards, getMemberHouse, useLiveData } from '../../hooks/useLiveData';
import LiveStatusBadge from '../../components/ui/LiveStatusBadge';

function formatCurrency(value) {
  return `₱${Number(value || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;
}

export default function HouseholdDashboardPage({ memberName = 'User', householdId = 'HH-01' }) {
  const data = useLiveData();
  const { results: sim } = useLatestSimulation();
  const circuit = resolveCircuit(householdId);
  const myHouse = getMemberHouse(data, householdId);
  const houseCards = getHouseCards(data);
  const { record: cluster, loading: clusterLoading, error: clusterError } = useHouseholdCluster(
    householdId,
  );
  const [chartPeriod, setChartPeriod] = useState('week');

  const savingsTrend = useMemo(() => buildSavingsTrend(sim, chartPeriod), [sim, chartPeriod]);
  const peakChart = useMemo(() => buildPeakHourChart(sim), [sim]);
  const householdShare = sim?.household_comparison?.find((h) => h.id === householdId)?.share;
  const shareFactor = householdShare != null ? householdShare / 100 : 0.25;
  const yourSavings = sim ? Math.round(sim.total_savings_php * shareFactor) : null;
  const yourMonthly = sim ? Math.round((sim.monthly_savings_php ?? 0) * shareFactor) : null;

  const liveSolar = myHouse.online ? `${myHouse.solar} W` : '—';
  const liveSoc = myHouse.online
    ? `${Math.round(myHouse.battery_percent ?? data.battery)}%`
    : '—';

  const stats = [
    {
      id: 'savings',
      label: 'Your Savings',
      value: yourSavings != null ? formatCurrency(yourSavings) : '—',
      bgKey: 'savings',
      hint: sim ? 'Your share from the latest community simulation.' : 'Run a simulation as operator first.',
    },
    {
      id: 'solar',
      label: 'Solar (live)',
      value: liveSolar,
      bgKey: 'solar',
      hint: myHouse.online ? 'Instantaneous watts from your ESP32.' : 'No live ESP data.',
    },
    {
      id: 'battery',
      label: 'Battery SOC',
      value: liveSoc,
      bgKey: 'battery',
      hint: myHouse.online ? 'State of charge from MQTT.' : 'Offline until ESP connects.',
    },
    {
      id: 'grid',
      label: 'Grid Reduction',
      value: sim ? `${sim.grid_reduction_pct}%` : '—',
      bgKey: 'grid',
      hint: sim ? 'Community-wide from latest simulation.' : undefined,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-sk-ink">
            Welcome, <em className="text-sk-accent not-italic">{memberName}</em>
          </h2>
          <p className="text-sm text-sk-ink-muted mt-1">
            {circuit.name} ·{' '}
            {yourMonthly != null ? (
              <>
                projected share: <strong className="text-emerald-800">{formatCurrency(yourMonthly)}/mo</strong>
              </>
            ) : (
              <>live solar: <strong className="text-sk-ink">{liveSolar}</strong></>
            )}
          </p>
        </div>
        <LiveStatusBadge data={data} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <StatTile
            key={stat.id}
            label={stat.label}
            value={stat.value}
            bgKey={stat.bgKey}
            hint={stat.hint}
          />
        ))}
      </div>

      {clusterLoading && (
        <p className="text-sm text-sk-ink-muted">Loading your battery action indicator…</p>
      )}
      {clusterError && (
        <p className="text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {clusterError}
        </p>
      )}
      {cluster && (
        <BatteryActionIndicator
          action={cluster.action}
          label={cluster.action_label}
          description={cluster.action_description}
          size="lg"
        />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-1">
          <BatteryOrganism data={data} />
        </Card>

        <Card title="Savings Over Time" className="xl:col-span-1">
          <div className="flex justify-end gap-1 mb-3">
            {['week', 'month'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setChartPeriod(p)}
                className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                  chartPeriod === p ? 'bg-sk-accent text-white' : 'bg-sk-placeholder text-sk-ink-muted'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          {sim ? (
            <SimpleLineChart data={savingsTrend} height={120} />
          ) : (
            <p className="text-sm text-sk-ink-muted py-10 text-center">No simulation data yet.</p>
          )}
        </Card>

        <Card title="Peak Hour Savings" className="xl:col-span-1">
          <p className="text-xs text-sk-ink-muted mb-3">6 PM – 9 PM · Avoided peak rates</p>
          {sim ? (
            <SimpleDualBarChart
              withoutData={peakChart.without}
              withData={peakChart.withSharing}
              labels={peakChart.labels}
            />
          ) : (
            <p className="text-sm text-sk-ink-muted py-10 text-center">No simulation data yet.</p>
          )}
        </Card>
      </div>

      <Card title="Two-Circuit Network">
        <div className="space-y-3">
          {houseCards.map((h) => {
            const meta = CIRCUIT_HOUSES.find((c) => c.name === h.name);
            const pct = h.online && h.solar + h.load > 0
              ? Math.min(100, Math.round((h.solar / (h.solar + h.load)) * 100))
              : 0;
            return (
              <div key={h.name} className="flex items-center gap-3">
                <span
                  className={`w-9 h-9 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                    h.online ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-stone-100 border-stone-200 text-stone-500'
                  }`}
                >
                  {h.online ? 'ON' : '—'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-sk-ink truncate">
                    {h.name} · {meta?.id ?? '—'}
                  </p>
                  <div className="h-2.5 rounded-full bg-sk-placeholder overflow-hidden mt-1">
                    <div
                      className="h-full bg-sk-accent/70 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-sk-ink-muted mt-0.5">
                    {h.online
                      ? `${h.solar}W solar · ${h.load}W load · ${h.status}`
                      : 'Offline — no ESP data'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
