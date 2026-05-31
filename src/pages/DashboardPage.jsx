import React, { useState } from 'react';
import Card from '../components/ui/Card';
import StatTile from '../components/ui/StatTile';
import BatteryOrganism from '../components/energy/BatteryOrganism';
import SimpleLineChart from '../components/charts/SimpleLineChart';
import SimpleDualBarChart from '../components/charts/SimpleDualBarChart';
import { useLiveData } from '../hooks/useLiveData';

export default function DashboardPage({ operatorName = 'Barangay Operator' }) {
  const data = useLiveData();
  const [chartPeriod, setChartPeriod] = useState('week');
  const savingsData = [20, 35, 45, 60, 80, 110, 140];
  const hourWithout = [8, 7, 6, 5];
  const hourWith = [3, 2, 1.5, 1];
  const hourLabels = ['6PM', '7PM', '8PM', '9PM'];

  const stats = [
    { id: 'savings', label: 'Total Savings', value: `₱${data.savings.toLocaleString()}`, bgKey: 'savings' },
    { id: 'grid', label: 'Grid Reduction', value: `${data.gridRed}%`, bgKey: 'grid' },
    { id: 'gini', label: 'Fairness Score', value: String(data.gini), bgKey: 'battery' },
    { id: 'co2', label: 'CO₂ Offset', value: `${data.co2} kg`, bgKey: 'solar' },
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
          <StatTile key={stat.id} label={stat.label} value={stat.value} bgKey={stat.bgKey} />
        ))}
      </div>

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
          <p className="text-xs text-emerald-800 mt-2 font-semibold">Total this week: ₱680 (+32%)</p>
        </Card>

        <Card title="Peak Hour Savings" className="xl:col-span-1">
          <p className="text-xs text-sk-ink-muted mb-3">6 PM – 9 PM · Avoided ₱15/kWh peak</p>
          <SimpleDualBarChart withoutData={hourWithout} withData={hourWith} labels={hourLabels} />
        </Card>
      </div>
    </div>
  );
}
