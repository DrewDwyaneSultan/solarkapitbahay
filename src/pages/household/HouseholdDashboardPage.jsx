import React, { useState } from 'react';
import Card from '../../components/ui/Card';
import StatTile from '../../components/ui/StatTile';
import BatteryOrganism from '../../components/energy/BatteryOrganism';
import BatteryActionIndicator from '../../components/clustering/BatteryActionIndicator';
import SimpleLineChart from '../../components/charts/SimpleLineChart';
import SimpleDualBarChart from '../../components/charts/SimpleDualBarChart';
import { resolveCircuit } from '../../constants/circuits';
import { useHouseholdCluster } from '../../hooks/useClustering';
import { getMemberHouse, useLiveData } from '../../hooks/useLiveData';
import LiveStatusBadge from '../../components/ui/LiveStatusBadge';
import { householdMemberRows } from '../../constants/mockSimulation';

export default function HouseholdDashboardPage({ memberName = 'User', householdId = 'HH-01' }) {
  const data = useLiveData();
  const circuit = resolveCircuit(householdId);
  const myHouse = getMemberHouse(data, householdId);
  const { record: cluster, loading: clusterLoading, error: clusterError } = useHouseholdCluster(
    householdId,
  );
  const [chartPeriod, setChartPeriod] = useState('week');
  const savingsData = [12, 18, 22, 28, 35, 42, 48];
  const hourWithout = [6, 5.5, 5, 4.5];
  const hourWith = [2.5, 2, 1.5, 1];
  const hourLabels = ['6PM', '7PM', '8PM', '9PM'];

  const stats = [
    { id: 'savings', label: 'Your Savings', value: `₱${Math.round(data.savings / 4).toLocaleString()}`, bgKey: 'savings' },
    { id: 'solar', label: 'Solar Generated', value: `${myHouse.solar} W`, bgKey: 'solar' },
    { id: 'battery', label: 'Battery SOC', value: `${Math.round(data.battery)}%`, bgKey: 'battery' },
    { id: 'grid', label: 'Grid Reduction', value: `${data.gridRed}%`, bgKey: 'grid' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-sk-ink">
            Welcome, <em className="text-sk-accent not-italic">{memberName}</em>
          </h2>
          <p className="text-sm text-sk-ink-muted mt-1">
            {circuit.name} · share this month:{' '}
            <strong className="text-emerald-800">₱{Math.round(data.savings / 2).toLocaleString()}</strong>
          </p>
        </div>
        <LiveStatusBadge data={data} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <StatTile key={stat.id} label={stat.label} value={stat.value} bgKey={stat.bgKey} />
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
          <SimpleLineChart data={savingsData} height={120} />
        </Card>

        <Card title="Peak Hour Savings" className="xl:col-span-1">
          <p className="text-xs text-sk-ink-muted mb-3">6 PM – 9 PM · Avoided peak rates</p>
          <SimpleDualBarChart withoutData={hourWithout} withData={hourWith} labels={hourLabels} />
        </Card>
      </div>

      <Card title="Two-Circuit Network">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-4">
          <div className="space-y-3">
            {householdMemberRows.map((r) => (
              <div key={r.id} className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-sk-placeholder border border-sk-card-border" />
                <div className="flex-1">
                  <div className="h-2.5 rounded-full bg-sk-placeholder overflow-hidden">
                    <div
                      className="h-full bg-sk-accent/70"
                      style={{ width: r.ok ? '78%' : '42%' }}
                    />
                  </div>
                </div>
                <span className="w-10 flex justify-center text-sm font-bold">
                  {r.ok ? (
                    <span className="text-emerald-700">✓</span>
                  ) : (
                    <span className="text-rose-600">✕</span>
                  )}
                </span>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {householdMemberRows.map((r) => (
              <div
                key={r.id}
                className="text-[10px] uppercase tracking-widest text-sk-ink-muted text-right leading-9"
              >
                {r.id}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
