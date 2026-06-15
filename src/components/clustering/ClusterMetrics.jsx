import React from 'react';

function MetricChip({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-sk-card-border/60 bg-sk-placeholder/40 px-3 py-2 min-w-[7rem]">
      <p className="text-[10px] font-bold uppercase tracking-widest text-sk-ink-muted">{label}</p>
      <p className="text-lg font-semibold text-sk-ink tabular-nums mt-0.5">{value}</p>
      {hint && <p className="text-[10px] text-sk-ink-muted mt-0.5 leading-snug">{hint}</p>}
    </div>
  );
}

export default function ClusterMetrics({ metrics, summary }) {
  if (!metrics) return null;

  const silhouette = metrics.silhouette_score;
  const silhouetteDisplay =
    silhouette != null ? silhouette.toFixed(3) : '—';

  const charge = summary?.charge ?? 0;
  const discharge = summary?.discharge ?? 0;
  const balanced = summary?.balanced ?? 0;

  return (
    <div className="mt-4 space-y-3 border-t border-sk-card-border/50 pt-4">
      <div className="flex flex-wrap gap-2">
        <MetricChip
          label="Silhouette"
          value={silhouetteDisplay}
          hint="−1 to 1 · higher = clearer groups"
        />
        <MetricChip
          label="Inertia (WCSS)"
          value={metrics.inertia_wcss?.toFixed(3) ?? '—'}
          hint="Lower = tighter clusters"
        />
        <MetricChip label="Clusters (k)" value={String(metrics.k ?? '—')} />
        <MetricChip label="Households" value={String(metrics.sample_count ?? '—')} />
      </div>

      <p className="text-xs text-sk-ink-muted leading-relaxed">
        <strong className="text-sk-ink font-medium">Interpretation:</strong>{' '}
        {metrics.silhouette_interpretation}
        {' '}
        K-means on normalized net load, battery SOC, and grid import assigned{' '}
        <span className="text-blue-700">{charge} Charge</span>,{' '}
        <span className="text-amber-700">{discharge} Discharge</span>, and{' '}
        <span className="text-stone-600">{balanced} Balanced</span>.
      </p>

      <p className="text-[10px] text-sk-ink-muted">
        {metrics.algorithm} · seed {metrics.seed} · {metrics.scaling} · features:{' '}
        {(metrics.features ?? []).join(', ')}
      </p>
    </div>
  );
}
