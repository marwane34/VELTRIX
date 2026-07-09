import { useMemo } from 'react';
import type { TrendPoint } from '../hooks/useSimulatedData';

interface Props {
  data: TrendPoint[];
}

const W = 600;
const H = 160;
const PAD = { top: 10, right: 10, bottom: 28, left: 38 };
const CURRENT_MIN = 0;
const CURRENT_MAX = 4;

function scaleX(t: number, total: number) {
  return PAD.left + (t / (total - 1)) * (W - PAD.left - PAD.right);
}
function scaleY(v: number) {
  return PAD.top + ((CURRENT_MAX - v) / (CURRENT_MAX - CURRENT_MIN)) * (H - PAD.top - PAD.bottom);
}

const Y_TICKS = [4, 3, 2, 1, 0];

export function CurrentChart({ data }: Props) {
  const linePath = useMemo(() => {
    if (!data.length) return '';
    return data
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${scaleX(i, data.length).toFixed(1)},${scaleY(p.value).toFixed(1)}`)
      .join(' ');
  }, [data]);

  const areaPath = useMemo(() => {
    if (!data.length) return '';
    const last = data.length - 1;
    const bottom = scaleY(0);
    return (
      data.map((p, i) => `${i === 0 ? 'M' : 'L'}${scaleX(i, data.length).toFixed(1)},${scaleY(p.value).toFixed(1)}`).join(' ') +
      ` L${scaleX(last, data.length).toFixed(1)},${bottom} L${scaleX(0, data.length).toFixed(1)},${bottom} Z`
    );
  }, [data]);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id="currentGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e2e8f0" stopOpacity={0.12} />
          <stop offset="100%" stopColor="#e2e8f0" stopOpacity={0.0} />
        </linearGradient>
        <clipPath id="currentClip">
          <rect x={PAD.left} y={PAD.top} width={W - PAD.left - PAD.right} height={H - PAD.top - PAD.bottom} />
        </clipPath>
      </defs>

      <rect x={PAD.left} y={PAD.top} width={W - PAD.left - PAD.right} height={H - PAD.top - PAD.bottom} fill="#060b12" />

      {/* Grid */}
      {Y_TICKS.map((v) => {
        const y = scaleY(v);
        return (
          <g key={v}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#1a2540" strokeWidth={0.8} strokeDasharray="5,5" />
            <text x={PAD.left - 4} y={y + 3} textAnchor="end" fontSize={8} fill="#4a5f7a">{v}</text>
          </g>
        );
      })}

      {/* Vertical grid lines */}
      {[0.2, 0.4, 0.6, 0.8].map((f) => {
        const x = PAD.left + f * (W - PAD.left - PAD.right);
        return <line key={f} x1={x} y1={PAD.top} x2={x} y2={H - PAD.bottom} stroke="#1a2540" strokeWidth={0.6} strokeDasharray="5,5" />;
      })}

      {/* Area fill */}
      <path d={areaPath} fill="url(#currentGrad)" clipPath="url(#currentClip)" />

      {/* Line */}
      <path d={linePath} fill="none" stroke="#e2e8f0" strokeWidth={1.5} clipPath="url(#currentClip)" />

      {/* Border */}
      <rect x={PAD.left} y={PAD.top} width={W - PAD.left - PAD.right} height={H - PAD.top - PAD.bottom} fill="none" stroke="#1e2d45" strokeWidth={0.8} />

      {/* Y axis label */}
      <text x={13} y={H / 2} textAnchor="middle" fontSize={8} fill="#4a5f7a" transform={`rotate(-90, 13, ${H / 2})`}>
        Current (A)
      </text>

      {/* X axis label */}
      <text x={W / 2} y={H - 2} textAnchor="middle" fontSize={8} fill="#4a5f7a">Time</text>
    </svg>
  );
}
