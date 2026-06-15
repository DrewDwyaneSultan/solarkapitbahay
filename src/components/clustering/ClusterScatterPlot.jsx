import React, { useMemo } from 'react';
import { actionStyle } from '../../constants/clustering';

const PAD = { left: 48, right: 16, top: 16, bottom: 40 };
const W = 520;
const H = 280;

export default function ClusterScatterPlot({ households = [], liveHouseholds = [], height = H }) {
  const allForScale = useMemo(
    () => [...households, ...liveHouseholds],
    [households, liveHouseholds],
  );

  const plot = useMemo(() => {
    if (!allForScale.length) return null;

    const xs = allForScale.map((h) => h.scatter_x ?? h.net_load_kwh);
    const ys = allForScale.map((h) => h.scatter_y ?? h.battery_soc_pct);
    const xMin = Math.min(...xs, 0) - 0.05;
    const xMax = Math.max(...xs, 0) + 0.05;
    const yMin = Math.max(0, Math.min(...ys) - 5);
    const yMax = Math.min(100, Math.max(...ys) + 5);

    const innerW = W - PAD.left - PAD.right;
    const innerH = height - PAD.top - PAD.bottom;

    const sx = (v) => PAD.left + ((v - xMin) / (xMax - xMin + 1e-9)) * innerW;
    const sy = (v) => PAD.top + innerH - ((v - yMin) / (yMax - yMin + 1e-9)) * innerH;

    const mapPoint = (h) => ({
      ...h,
      cx: sx(h.scatter_x ?? h.net_load_kwh),
      cy: sy(h.scatter_y ?? h.battery_soc_pct),
      color: h.action_color ?? actionStyle(h.action).color,
    });

    const points = households.map(mapPoint);
    const livePoints = liveHouseholds.map(mapPoint);

    const yMid = sy(50);
    const xZero = sx(0);

    return { points, livePoints, xMin, xMax, yMin, yMax, yMid, xZero, innerW, innerH };
  }, [households, liveHouseholds, allForScale, height]);

  if (!plot) {
    return (
      <p className="text-sm text-sk-ink-muted py-12 text-center">No clustering data yet.</p>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${height}`} className="w-full min-w-[320px]" style={{ height }}>
        <line
          x1={PAD.left}
          y1={plot.yMid}
          x2={W - PAD.right}
          y2={plot.yMid}
          stroke="#e8dfd0"
          strokeDasharray="4 4"
        />
        <line
          x1={plot.xZero}
          y1={PAD.top}
          x2={plot.xZero}
          y2={height - PAD.bottom}
          stroke="#e8dfd0"
          strokeDasharray="4 4"
        />

        {plot.points.map((p) => (
          <g key={p.household_id} opacity={liveHouseholds.length ? 0.45 : 1}>
            <circle
              cx={p.cx}
              cy={p.cy}
              r={7}
              fill={p.color}
              fillOpacity={0.85}
              stroke="#fff"
              strokeWidth={1.5}
            >
              <title>
                {p.household_id} · {p.action_label ?? p.action} · SOC {p.battery_soc_pct}%
              </title>
            </circle>
            <text
              x={p.cx}
              y={p.cy - 11}
              textAnchor="middle"
              fontSize="8"
              fill="#6b5d54"
              fontWeight="600"
            >
              {p.household_id}
            </text>
          </g>
        ))}

        {plot.livePoints.map((p) => (
          <g key={p.household_id}>
            <circle cx={p.cx} cy={p.cy} r={12} fill="none" stroke="#059669" strokeWidth={2} opacity={0.7}>
              <animate attributeName="r" values="10;14;10" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle
              cx={p.cx}
              cy={p.cy}
              r={9}
              fill={p.color}
              fillOpacity={0.95}
              stroke="#059669"
              strokeWidth={2}
            >
              <title>
                {p.head_name} · {p.action_label} · {p.wattage_w}W · {p.mqtt_status} · SOC {p.battery_soc_pct}% (live)
              </title>
            </circle>
            <text
              x={p.cx}
              y={p.cy - 14}
              textAnchor="middle"
              fontSize="9"
              fill="#047857"
              fontWeight="700"
            >
              {p.head_name}
            </text>
          </g>
        ))}

        <text x={W / 2} y={height - 8} textAnchor="middle" fontSize="10" fill="#6b5d54" fontWeight="600">
          Net load (kWh) → charge side
        </text>
        <text
          x={14}
          y={height / 2}
          textAnchor="middle"
          fontSize="10"
          fill="#6b5d54"
          fontWeight="600"
          transform={`rotate(-90 14 ${height / 2})`}
        >
          Battery SOC (%)
        </text>
      </svg>

      <div className="flex flex-wrap gap-3 justify-center mt-2 text-[11px] font-semibold">
        {['charge', 'discharge', 'balanced'].map((key) => {
          const s = actionStyle(key);
          const csvCount = households.filter((h) => h.action === key).length;
          const liveCount = liveHouseholds.filter((h) => h.action === key).length;
          return (
            <span key={key} className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label} ({csvCount}
              {liveCount > 0 ? ` + ${liveCount} live` : ''})
            </span>
          );
        })}
        {liveHouseholds.length > 0 && (
          <span className="inline-flex items-center gap-1.5 text-emerald-800">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
            Live ESP32 updating
          </span>
        )}
      </div>
    </div>
  );
}
