import { useMemo } from 'react';

interface CurrentChartProps {
  data: { t: number; v: number }[];
}

const WIDTH = 100;
const HEIGHT = 160;
const PADDING = { top: 16, right: 8, bottom: 18, left: 32 };
const PLOT_W = WIDTH - PADDING.left - PADDING.right;
const PLOT_H = HEIGHT - PADDING.top - PADDING.bottom;

/**
 * CurrentChart — SVG line chart with yellow line and gradient area fill.
 * Title "CURRENT TREND". Dark background.
 */
export default function CurrentChart({ data }: CurrentChartProps) {
  const { linePath, areaPath, gridY, yLabels, latest } = useMemo(() => {
    const slice = data.slice(-60);
    if (slice.length === 0) {
      return { linePath: '', areaPath: '', gridY: [], yLabels: [], latest: null as number | null };
    }

    let minV = Infinity;
    let maxV = -Infinity;
    for (const p of slice) {
      if (p.v < minV) minV = p.v;
      if (p.v > maxV) maxV = p.v;
    }
    const range = maxV - minV || 1;
    minV = minV - range * 0.1;
    maxV = maxV + range * 0.1;

    const n = Math.max(1, slice.length - 1);
    const xToPx = (i: number) => PADDING.left + (i / n) * PLOT_W;
    const vToPy = (v: number) => PADDING.top + (1 - (v - minV) / (maxV - minV)) * PLOT_H;

    let linePath = '';
    slice.forEach((p, i) => {
      const cmd = i === 0 ? 'M' : 'L';
      linePath += `${cmd}${xToPx(i).toFixed(2)},${vToPy(p.v).toFixed(2)} `;
    });

    const baseY = PADDING.top + PLOT_H;
    const areaPath = `${linePath} L${xToPx(slice.length - 1).toFixed(2)},${baseY} L${xToPx(0).toFixed(2)},${baseY} Z`;

    const gridY: number[] = [];
    const yLabels: { y: number; label: string }[] = [];
    const steps = 4;
    for (let s = 0; s <= steps; s++) {
      const py = PADDING.top + (s / steps) * PLOT_H;
      gridY.push(py);
      const val = maxV - (s / steps) * (maxV - minV);
      yLabels.push({ y: py, label: val.toFixed(1) });
    }

    return { linePath, areaPath, gridY, yLabels, latest: slice[slice.length - 1].v };
  }, [data]);

  return (
    <div className="panel chart-bg" style={{ height: HEIGHT, padding: 0, overflow: 'hidden', borderRadius: 0 }}>
      <div className="flex items-center justify-between px-3" style={{ height: 22, borderBottom: '1px solid #1a2540', flexShrink: 0 }}>
        <span className="text-[10px] font-semibold tracking-wider" style={{ color: '#94a3b8' }}>CURRENT TREND</span>
        <span className="text-[9px] val-yellow font-semibold">{latest != null ? `${latest.toFixed(2)}A` : '—'}</span>
      </div>
      <svg width="100%" height={HEIGHT - 22} viewBox={`0 0 ${WIDTH} ${HEIGHT - 22}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="currAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#eab308" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#eab308" stopOpacity="0" />
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

        {/* Area fill */}
        {areaPath && <path d={areaPath} fill="url(#currAreaGrad)" stroke="none" />}
        {/* Line */}
        {linePath && <path d={linePath} fill="none" stroke="#eab308" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />}
      </svg>
    </div>
  );
}
