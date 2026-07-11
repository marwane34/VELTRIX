import { useMemo } from 'react';

interface FrequencyChartProps {
  data: { freq: number; amp: number }[];
}

const WIDTH = 100;
const HEIGHT = 160;
const PADDING = { top: 16, right: 8, bottom: 20, left: 32 };
const PLOT_W = WIDTH - PADDING.left - PADDING.right;
const PLOT_H = HEIGHT - PADDING.top - PADDING.bottom;

/**
 * FrequencyChart — SVG bar chart of the frequency spectrum.
 * Renders blue bars on a dark background. Title "FREQUENCY SPECTRUM".
 */
export default function FrequencyChart({ data }: FrequencyChartProps) {
  const { bars, gridY, yLabels, maxAmp } = useMemo(() => {
    const slice = data.slice(-40);
    let maxAmp = 0.5;
    for (const b of slice) if (b.amp > maxAmp) maxAmp = b.amp;
    maxAmp = Math.max(0.5, maxAmp * 1.1);

    const n = Math.max(1, slice.length);
    const barGap = PLOT_W / n;
    const barW = Math.max(0.8, barGap * 0.7);
    const vToPy = (v: number) => PADDING.top + (1 - v / maxAmp) * PLOT_H;

    const bars = slice.map((b, i) => {
      const x = PADDING.left + i * barGap + (barGap - barW) / 2;
      const y = vToPy(b.amp);
      const h = PADDING.top + PLOT_H - y;
      return { x, y, h, w: barW, freq: b.freq, amp: b.amp };
    });

    const gridY: number[] = [];
    const yLabels: { y: number; label: string }[] = [];
    const steps = 4;
    for (let s = 0; s <= steps; s++) {
      const py = PADDING.top + (s / steps) * PLOT_H;
      gridY.push(py);
      const val = maxAmp - (s / steps) * maxAmp;
      yLabels.push({ y: py, label: val.toFixed(2) });
    }

    return { bars, gridY, yLabels, maxAmp };
  }, [data]);

  return (
    <div className="panel chart-bg" style={{ height: HEIGHT, padding: 0, overflow: 'hidden', borderRadius: 0 }}>
      <div className="flex items-center justify-between px-3" style={{ height: 22, borderBottom: '1px solid #1a2540', flexShrink: 0 }}>
        <span className="text-[10px] font-semibold tracking-wider" style={{ color: '#94a3b8' }}>FREQUENCY SPECTRUM</span>
        <span className="text-[9px]" style={{ color: '#64748b' }}>max {maxAmp.toFixed(2)}</span>
      </div>
      <svg width="100%" height={HEIGHT - 22} viewBox={`0 0 ${WIDTH} ${HEIGHT - 22}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="freqBarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {gridY.map((gy, i) => (
          <line key={`h-${i}`} x1={PADDING.left} y1={gy} x2={WIDTH - PADDING.right} y2={gy}
            className="chart-grid-line" />
        ))}

        {/* Y-axis labels */}
        {yLabels.map((yl, i) => (
          <text key={`yl-${i}`} x={PADDING.left - 4} y={yl.y + 2} textAnchor="end"
            fontSize="6" fill="#64748b" fontFamily="monospace">{yl.label}</text>
        ))}

        {/* Y-axis line */}
        <line x1={PADDING.left} y1={PADDING.top} x2={PADDING.left} y2={PADDING.top + PLOT_H}
          stroke="#1e2d45" strokeWidth="0.8" />

        {/* Bars */}
        {bars.map((b, i) => (
          <rect key={`bar-${i}`} x={b.x} y={b.y} width={b.w} height={Math.max(0.5, b.h)}
            fill="url(#freqBarGrad)" rx="0.4" />
        ))}

        {/* X-axis baseline */}
        <line x1={PADDING.left} y1={PADDING.top + PLOT_H} x2={WIDTH - PADDING.right} y2={PADDING.top + PLOT_H}
          stroke="#1e2d45" strokeWidth="0.8" />
      </svg>
    </div>
  );
}
