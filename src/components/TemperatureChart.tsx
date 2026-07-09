import { useMemo } from 'react';
import type { TrendPoint } from '../hooks/useSimulatedData';

interface Props {
  data: TrendPoint[];
  temperature: number;
}

const W = 320;
const H = 160;
const PAD = { top: 8, right: 8, bottom: 28, left: 8 };
const TEMP_MIN = 76.5;
const TEMP_MAX = 82.0;

function scaleX(t: number, total: number) {
  return PAD.left + (t / (total - 1)) * (W - PAD.left - PAD.right);
}
function scaleY(v: number) {
  return PAD.top + ((TEMP_MAX - v) / (TEMP_MAX - TEMP_MIN)) * (H - PAD.top - PAD.bottom);
}

export function TemperatureChart({ data, temperature }: Props) {
  const linePath = useMemo(() => {
    if (!data.length) return '';
    return data
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${scaleX(i, data.length).toFixed(1)},${scaleY(p.value).toFixed(1)}`)
      .join(' ');
  }, [data]);

  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const zoneH = chartH / 4;

  // Dot positions (evenly spaced subset)
  const dotPoints = data.filter((_, i) => i % 4 === 0);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      style={{ display: 'block' }}
    >
      <defs>
        <clipPath id="chartClip">
          <rect x={PAD.left} y={PAD.top} width={chartW} height={chartH} />
        </clipPath>
      </defs>

      {/* Heat zone background */}
      <rect x={PAD.left} y={PAD.top} width={chartW} height={zoneH} fill="#dc2626" opacity={0.75} />
      <rect x={PAD.left} y={PAD.top + zoneH} width={chartW} height={zoneH} fill="#f97316" opacity={0.7} />
      <rect x={PAD.left} y={PAD.top + zoneH * 2} width={chartW} height={zoneH} fill="#eab308" opacity={0.65} />
      <rect x={PAD.left} y={PAD.top + zoneH * 3} width={chartW} height={zoneH} fill="#16a34a" opacity={0.6} />

      {/* Grid overlay */}
      {[0.25, 0.5, 0.75].map((f) => {
        const y = PAD.top + chartH * f;
        return <line key={f} x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="rgba(255,255,255,0.12)" strokeWidth={0.8} strokeDasharray="4,4" />;
      })}

      {/* Trend line */}
      <path d={linePath} fill="none" stroke="#fbbf24" strokeWidth={2} clipPath="url(#chartClip)" />

      {/* Dots on line */}
      {dotPoints.map((p, i) => {
        const idx = data.indexOf(p);
        const x = scaleX(idx, data.length);
        const y = scaleY(p.value);
        return (
          <circle key={i} cx={x} cy={y} r={3} fill="#fbbf24" clipPath="url(#chartClip)" />
        );
      })}

      {/* Border */}
      <rect x={PAD.left} y={PAD.top} width={chartW} height={chartH} fill="none" stroke="#1e2d45" strokeWidth={0.8} />

      {/* Y axis labels */}
      <text x={W - PAD.right + 2} y={PAD.top + 6} fontSize={7} fill="#9ca3af" textAnchor="start">High</text>
      <text x={W - PAD.right + 2} y={PAD.top + zoneH * 2 + 6} fontSize={7} fill="#9ca3af" textAnchor="start">High</text>
      <text x={W - PAD.right + 2} y={PAD.top + zoneH * 3 + 6} fontSize={7} fill="#9ca3af" textAnchor="start">{temperature.toFixed(1)}</text>

      {/* X axis label */}
      <text x={W / 2} y={H - 2} textAnchor="middle" fontSize={8} fill="#4a5f7a">Time</text>
    </svg>
  );
}
