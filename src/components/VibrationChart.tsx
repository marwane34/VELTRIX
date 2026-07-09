import { useMemo } from 'react';
import type { VibrationPoint } from '../hooks/useSimulatedData';

interface Props {
  data: VibrationPoint[];
}

const W = 440;
const H = 160;
const PAD = { top: 8, right: 8, bottom: 12, left: 38 };
const YMIN = -3.5;
const YMAX = 5.0;
const TMIN = 0;
const TMAX = 6;

function scaleX(t: number) {
  return PAD.left + ((t - TMIN) / (TMAX - TMIN)) * (W - PAD.left - PAD.right);
}
function scaleY(v: number) {
  return PAD.top + ((YMAX - v) / (YMAX - YMIN)) * (H - PAD.top - PAD.bottom);
}
function toPath(data: VibrationPoint[], key: 'x' | 'y' | 'z') {
  return data
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${scaleX(p.t).toFixed(1)},${scaleY(p[key]).toFixed(1)}`)
    .join(' ');
}

const Y_TICKS = [4.5, 2.0, 0, -2.5];
const T_LABELS = ['1.0', '2.0', '3.0', '4.0', '5.0'];

export function VibrationChart({ data }: Props) {
  const pathX = useMemo(() => toPath(data, 'x'), [data]);
  const pathY = useMemo(() => toPath(data, 'y'), [data]);
  const pathZ = useMemo(() => toPath(data, 'z'), [data]);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      style={{ display: 'block' }}
    >
      <rect x={PAD.left} y={PAD.top} width={W - PAD.left - PAD.right} height={H - PAD.top - PAD.bottom} fill="#070c14" />

      {/* Grid lines */}
      {Y_TICKS.map((v) => {
        const y = scaleY(v);
        return (
          <g key={v}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#1a2540" strokeWidth={0.8} strokeDasharray="4,4" />
            <text x={PAD.left - 3} y={y + 3} textAnchor="end" fontSize={8} fill="#4a5f7a">{v}</text>
          </g>
        );
      })}
      {T_LABELS.map((label) => {
        const t = parseFloat(label);
        const x = scaleX(t);
        return (
          <g key={label}>
            <line x1={x} y1={PAD.top} x2={x} y2={H - PAD.bottom} stroke="#1a2540" strokeWidth={0.8} strokeDasharray="4,4" />
          </g>
        );
      })}

      {/* Y axis label */}
      <text
        x={10}
        y={H / 2}
        textAnchor="middle"
        fontSize={8}
        fill="#4a5f7a"
        transform={`rotate(-90, 10, ${H / 2})`}
      >
        Amplitude
      </text>

      {/* Waveforms */}
      <path d={pathX} fill="none" stroke="#3b82f6" strokeWidth={1.2} opacity={0.9} />
      <path d={pathY} fill="none" stroke="#22c55e" strokeWidth={1.2} opacity={0.9} />
      <path d={pathZ} fill="none" stroke="#eab308" strokeWidth={1.1} opacity={0.85} />

      {/* Border */}
      <rect x={PAD.left} y={PAD.top} width={W - PAD.left - PAD.right} height={H - PAD.top - PAD.bottom} fill="none" stroke="#1e2d45" strokeWidth={0.8} />

      {/* X axis tick labels */}
      {T_LABELS.map((label) => {
        const t = parseFloat(label);
        const x = scaleX(t);
        return (
          <text key={label} x={x} y={H - 1} textAnchor="middle" fontSize={8} fill="#4a5f7a">{label}</text>
        );
      })}
    </svg>
  );
}
