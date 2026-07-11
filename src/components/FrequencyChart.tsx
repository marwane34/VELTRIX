import { useMemo } from 'react';

interface FrequencyChartProps {
  data: { freq: number; amp: number }[];
}

const WIDTH = 600;
const HEIGHT = 160;
const PADDING = { top: 22, right: 8, bottom: 18, left: 36 };

export default function FrequencyChart({ data }: FrequencyChartProps) {
  const bars = useMemo(() => data, [data]);

  const innerW = WIDTH - PADDING.left - PADDING.right;
  const innerH = HEIGHT - PADDING.top - PADDING.bottom;

  const maxAmp = useMemo(() => {
    if (bars.length === 0) return 1;
    return Math.max(...bars.map((b) => b.amp), 0.1);
  }, [bars]);

  const barWidth = bars.length > 0 ? innerW / bars.length : innerW;
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => PADDING.top + f * innerH);

  return (
    <div className="panel chart-bg" style={{ height: HEIGHT, borderRadius: 4, overflow: 'hidden' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '4px 10px', borderBottom: '1px solid #1e2d45',
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', color: '#94a3b8' }}>
          FREQUENCY SPECTRUM
        </span>
        <span style={{ fontSize: 9, color: '#3b82f6' }}>● AMP (Hz)</span>
      </div>
      <svg width="100%" height={HEIGHT - 22} viewBox={`0 0 ${WIDTH} ${HEIGHT - 22}`} preserveAspectRatio="none">
        {/* Grid */}
        {gridLines.map((y, i) => (
          <line key={`h${i}`} x1={PADDING.left} y1={y} x2={WIDTH - PADDING.right} y2={y}
            className="chart-grid-line" />
        ))}
        {/* Y-axis labels */}
        {[1, 0.75, 0.5, 0.25, 0].map((v, i) => (
          <text key={`yl${i}`} x={PADDING.left - 4} y={PADDING.top + (1 - v) * innerH + 3}
            textAnchor="end" fontSize={8} fill="#64748b">
            {(v * maxAmp).toFixed(2)}
          </text>
        ))}
        {/* Bars */}
        {bars.map((bar, i) => {
          const barH = (bar.amp / maxAmp) * innerH;
          const x = PADDING.left + i * barWidth;
          const y = PADDING.top + innerH - barH;
          return (
            <rect key={i} x={x + 1} y={y} width={Math.max(1, barWidth - 2)} height={barH}
              fill="#3b82f6" rx={1} opacity={0.85} />
          );
        })}
        {/* X-axis labels */}
        {bars.length > 0 && [0, Math.floor(bars.length / 4), Math.floor(bars.length / 2), Math.floor((bars.length * 3) / 4), bars.length - 1].map((idx, i) => (
          <text key={`xl${i}`} x={PADDING.left + idx * barWidth} y={HEIGHT - 22 - 4}
            textAnchor="middle" fontSize={8} fill="#64748b">
            {bars[idx]?.freq ?? 0}Hz
          </text>
        ))}
      </svg>
    </div>
  );
}
