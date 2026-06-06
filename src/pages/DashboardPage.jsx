import React, { useState } from 'react';
import Card from '../components/ui/Card';
import StatTile from '../components/ui/StatTile';
import BatteryOrganism from '../components/energy/BatteryOrganism';
import SimpleLineChart from '../components/charts/SimpleLineChart';
import SimpleDualBarChart from '../components/charts/SimpleDualBarChart';
import ClusterScatterPlot from '../components/clustering/ClusterScatterPlot';
import { useClustering } from '../hooks/useClustering';
import { useLiveData } from '../hooks/useLiveData';

export default function DashboardPage({ operatorName = 'Barangay Operator' }) {
  const data = useLiveData();
  const { data: clusterData, loading: clusterLoading, error: clusterError } = useClustering();
  const [chartPeriod, setChartPeriod] = useState('week');
  const savingsData = [20, 35, 45, 60, 80, 110, 140];
  const hourWithout = [8, 7, 6, 5];
  const hourWith = [3, 2, 1.5, 1];
  const hourLabels = ['6PM', '7PM', '8PM', '9PM'];

  const stats = [
    { id: 'savings', label: 'Total Savings', value: `₱${data.savings.toLocaleString()}`, bgKey: 'savings', icon: '💰' },
    { id: 'grid', label: 'Grid Reduction', value: `${data.gridRed}%`, bgKey: 'grid', icon: '⚡' },
    { id: 'gini', label: 'Fairness Score', value: String(data.gini), bgKey: 'battery', icon: '⚖️' },
    { id: 'co2', label: 'CO₂ Offset', value: `${data.co2} kg`, bgKey: 'solar', icon: '🌱' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-sk-ink">
            Good morning, <em className="text-sk-accent not-italic">{operatorName}</em>
          </h2>
          <p className="text-sm text-sk-ink-muted mt-1">
            Community savings this month: <strong className="text-emerald-800">₱{data.savings.toLocaleString()}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-sk-ink-muted">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
          Live · {new Date().toLocaleTimeString()}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <StatTile key={stat.id} label={stat.label} value={stat.value} bgKey={stat.bgKey} icon={stat.icon} />
        ))}
      </div>

      <Card>
        <BatteryOrganism data={data} />
      </Card>

      <Card title="Battery Clustering — Charge / Discharge (merged dataset)">
        <p className="text-xs text-sk-ink-muted mb-4">
          K-means on <code className="text-[10px]">data/csvmerged2 (1).txt</code> (15 households
          expanded from PVGIS hourly rows). Blue = charge, amber = discharge, gray = balanced.
        </p>
        {clusterError && (
          <p className="text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3">
            {clusterError} — start the backend with <code className="text-xs">npm run dev:backend</code>.
          </p>
        )}
        {clusterLoading ? (
          <p className="text-sm text-sk-ink-muted py-16 text-center">Loading clustering…</p>
        ) : (
          <>
            <ClusterScatterPlot households={clusterData?.households ?? []} />
            {clusterData?.summary && (
              <p className="text-[10px] text-sk-ink-muted mt-3 text-center">
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
                className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                  chartPeriod === p ? 'bg-sk-accent text-white' : 'bg-sk-placeholder text-sk-ink-muted'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <SimpleLineChart data={savingsData} height={120} />
          <p className="text-xs text-emerald-800 mt-2 font-semibold">Total this week: ₱680 (+32%)</p>
        </Card>

        <Card title="Peak Hour Savings">
          <p className="text-xs text-sk-ink-muted mb-3">6 PM – 9 PM · Avoided ₱15/kWh peak</p>
          <SimpleDualBarChart withoutData={hourWithout} withData={hourWith} labels={hourLabels} />
        </Card>
      </div>
    </div>
  );
}
