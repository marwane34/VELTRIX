import { useMemo } from 'react';

interface VibrationChartProps {
  data: { t: number; x: number; y: number }[];
}

const WIDTH = 100;
const HEIGHT = 160;
const PADDING = { top: 16, right: 8, bottom: 18, left: 36 };
const PLOT_W = WIDTH - PADDING.left - PADDING.right;
const PLOT_H = HEIGHT - PADDING.top - PADDING.bottom;

/**
 * VibrationChart — SVG dual-line waveform chart.
 * Renders the last 200 vibration data points as two lines:
 *   X-axis (blue #3b82f6) and Y-axis (cyan #06b6d4).
 */
export default function VibrationChart({ data }: VibrationChartProps) {
  const { xPath, yPath, gridY, yLabels, count } = useMemo(() => {
    const slice = data.slice(-200);
    const count = slice.length;

    // Auto-scale: derive a symmetric y-range around the max abs value.
    let maxAbs = 0.5;
    for (const p of slice) {
      if (Math.abs(p.x) > maxAbs) maxAbs = Math.abs(p.x);
      if (Math.abs(p.y) > maxAbs) maxAbs = Math.abs(p.y);
    }
    maxAbs = Math.max(0.5, maxAbs * 1.15);

    const n = Math.max(1, count - 1);
    const xToPx = (i: number) => PADDING.left + (i / n) * PLOT_W;
    const vToPy = (v: number) => PADDING.top + (1 - (v + maxAbs) / (2 * maxAbs)) * PLOT_H;

    let xPath = '';
    let yPath = '';
    slice.forEach((p, i) => {
      const cmd = i === 0 ? 'M' : 'L';
      xPath += `${cmd}${xToPx(i).toFixed(2)},${vToPy(p.x).toFixed(2)} `;
      yPath += `${cmd}${xToPx(i).toFixed(2)},${vToPy(p.y).toFixed(2)} `;
    });

    // Horizontal grid lines (dashed) with labels.
    const gridY: number[] = [];
    const yLabels: { y: number; label: string }[] = [];
    const steps = 4;
    for (let s = 0; s <= steps; s++) {
      const py = PADDING.top + (s / steps) * PLOT_H;
      gridY.push(py);
      const val = maxAbs - (s / steps) * (2 * maxAbs);
      yLabels.push({ y: py, label: val.toFixed(1) });
    }

    return { xPath, yPath, gridY, yLabels, count };
  }, [data]);

  return (
    <div className="panel chart-bg" style={{ height: HEIGHT, padding: 0, overflow: 'hidden', borderRadius: 0 }}>
      <div className="flex items-center justify-between px-3" style={{ height: 22, borderBottom: '1px solid #1a2540', flexShrink: 0 }}>
        <span className="text-[10px] font-semibold tracking-wider" style={{ color: '#94a3b8' }}>VIBRATION WAVEFORM</span>
        <span className="text-[9px]" style={{ color: '#64748b' }}>{count} pts</span>
      </div>
      <svg width="100%" height={HEIGHT - 22} viewBox={`0 0 ${WIDTH} ${HEIGHT - 22}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="vibXGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="vibYGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {gridY.map((gy, i) => (
          <line key={`h-${i}`} x1={PADDING.left} y1={gy} x2={WIDTH - PADDING.right} y2={gy}
            className="chart-grid-line" />
        ))}
        {/* Center line (zero baseline) */}
        <line x1={PADDING.left} y1={PADDING.top + PLOT_H / 2} x2={WIDTH - PADDING.right} y2={PADDING.top + PLOT_H / 2}
          stroke="#2a3f60" strokeWidth="0.8" />

        {/* Y-axis labels */}
        {yLabels.map((yl, i) => (
          <text key={`yl-${i}`} x={PADDING.left - 4} y={yl.y + 2} textAnchor="end"
            fontSize="6" fill="#64748b" fontFamily="monospace">{yl.label}</text>
        ))}

        {/* Y-axis line */}
        <line x1={PADDING.left} y1={PADDING.top} x2={PADDING.left} y2={PADDING.top + PLOT_H}
          stroke="#1e2d45" strokeWidth="0.8" />

        {/* X line */}
        {xPath && (
          <>
            <path d={`${xPath} L${WIDTH - PADDING.right},${PADDING.top + PLOT_H / 2} L${PADDING.left},${PADDING.top + PLOT_H / 2} Z`}
              fill="url(#vibXGlow)" stroke="none" />
            <path d={xPath} fill="none" stroke="#3b82f6" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" />
          </>
        )}
        {/* Y line */}
        {yPath && (
          <>
            <path d={`${yPath} L${WIDTH - PADDING.right},${PADDING.top + PLOT_H / 2} L${PADDING.left},${PADDING.top + PLOT_H / 2} Z`}
              fill="url(#vibYGlow)" stroke="none" />
            <path d={yPath} fill="none" stroke="#06b6d4" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" />
          </>
        )}
      </svg>
    </div>
  );
}
