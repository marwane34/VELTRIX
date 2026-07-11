import { useMemo } from 'react';

interface VibrationChartProps {
  data: { t: number; x: number; y: number }[];
}

const WIDTH = 600;
const HEIGHT = 160;
const PADDING = { top: 22, right: 8, bottom: 18, left: 36 };
const MAX_POINTS = 200;

export default function VibrationChart({ data }: VibrationChartProps) {
  const points = useMemo(() => data.slice(-MAX_POINTS), [data]);

  const innerW = WIDTH - PADDING.left - PADDING.right;
  const innerH = HEIGHT - PADDING.top - PADDING.bottom;

  const xScale = (i: number) => PADDING.left + (i / Math.max(1, MAX_POINTS - 1)) * innerW;
  const yScale = (v: number) => PADDING.top + innerH / 2 - (v / 2) * innerH;

  const linePath = (key: 'x' | 'y') => {
    if (points.length === 0) return '';
    return points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i).toFixed(1)} ${yScale(p[key]).toFixed(1)}`)
      .join(' ');
  };

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => PADDING.top + f * innerH);

  return (
    <div className="panel chart-bg" style={{ height: HEIGHT, borderRadius: 4, overflow: 'hidden' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '4px 10px', borderBottom: '1px solid #1e2d45',
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', color: '#94a3b8' }}>
          VIBRATION WAVEFORM
        </span>
        <div style={{ display: 'flex', gap: 12, fontSize: 9, color: '#64748b' }}>
          <span style={{ color: '#3b82f6' }}>● X-AXIS</span>
          <span style={{ color: '#06b6d4' }}>● Y-AXIS</span>
        </div>
      </div>
      <svg width="100%" height={HEIGHT - 22} viewBox={`0 0 ${WIDTH} ${HEIGHT - 22}`} preserveAspectRatio="none">
        {/* Grid */}
        {gridLines.map((y, i) => (
          <line key={`h${i}`} x1={PADDING.left} y1={y} x2={WIDTH - PADDING.right} y2={y}
            className="chart-grid-line" />
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
          <line key={`v${i}`} x1={PADDING.left + f * innerW} y1={PADDING.top}
            x2={PADDING.left + f * innerW} y2={HEIGHT - 22 - PADDING.bottom}
            className="chart-grid-line" />
        ))}
        {/* Y-axis labels */}
        {[1, 0.5, 0, -0.5, -1].map((v, i) => (
          <text key={`yl${i}`} x={PADDING.left - 4} y={yScale(v) + 3}
            textAnchor="end" fontSize={8} fill="#64748b">
            {v.toFixed(1)}
          </text>
        ))}
        {/* X line */}
        <path d={linePath('x')} fill="none" stroke="#3b82f6" strokeWidth={1.5} />
        {/* Y line */}
        <path d={linePath('y')} fill="none" stroke="#06b6d4" strokeWidth={1.5} />
      </svg>
    </div>
  );
}
