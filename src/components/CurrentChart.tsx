import { useMemo } from 'react';

interface CurrentChartProps {
  data: { t: number; v: number }[];
}

const WIDTH = 600;
const HEIGHT = 160;
const PADDING = { top: 22, right: 8, bottom: 18, left: 36 };
const MAX_POINTS = 200;
const COLOR = '#eab308';

export default function CurrentChart({ data }: CurrentChartProps) {
  const points = useMemo(() => data.slice(-MAX_POINTS), [data]);

  const innerW = WIDTH - PADDING.left - PADDING.right;
  const innerH = HEIGHT - PADDING.top - PADDING.bottom;

  const minV = useMemo(() => {
    if (points.length === 0) return 0;
    return Math.min(...points.map((p) => p.v));
  }, [points]);
  const maxV = useMemo(() => {
    if (points.length === 0) return 5;
    return Math.max(...points.map((p) => p.v));
  }, [points]);
  const range = maxV - minV || 1;
  const padRange = range * 0.15;
  const yMin = minV - padRange;
  const yMax = maxV + padRange;
  const yRange = yMax - yMin || 1;

  const xScale = (i: number) => PADDING.left + (i / Math.max(1, MAX_POINTS - 1)) * innerW;
  const yScale = (v: number) => PADDING.top + innerH - ((v - yMin) / yRange) * innerH;

  const linePath = useMemo(() => {
    if (points.length === 0) return '';
    return points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i).toFixed(1)} ${yScale(p.v).toFixed(1)}`)
      .join(' ');
  }, [points, xScale, yScale]);

  const areaPath = useMemo(() => {
    if (points.length === 0) return '';
    const first = `M ${xScale(0).toFixed(1)} ${(PADDING.top + innerH).toFixed(1)}`;
    const linePts = points.map((p, i) => `L ${xScale(i).toFixed(1)} ${yScale(p.v).toFixed(1)}`).join(' ');
    const last = `L ${xScale(points.length - 1).toFixed(1)} ${(PADDING.top + innerH).toFixed(1)} Z`;
    return `${first} ${linePts} ${last}`;
  }, [points, xScale, yScale, innerH]);

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => PADDING.top + f * innerH);

  return (
    <div className="panel chart-bg" style={{ height: HEIGHT, borderRadius: 4, overflow: 'hidden' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '4px 10px', borderBottom: '1px solid #1e2d45',
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', color: '#94a3b8' }}>
          CURRENT TREND
        </span>
        <span style={{ fontSize: 9, color: COLOR }}>● A</span>
      </div>
      <svg width="100%" height={HEIGHT - 22} viewBox={`0 0 ${WIDTH} ${HEIGHT - 22}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="currentAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLOR} stopOpacity={0.35} />
            <stop offset="100%" stopColor={COLOR} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {/* Grid */}
        {gridLines.map((y, i) => (
          <line key={`h${i}`} x1={PADDING.left} y1={y} x2={WIDTH - PADDING.right} y2={y}
            className="chart-grid-line" />
        ))}
        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
          <text key={`yl${i}`} x={PADDING.left - 4} y={PADDING.top + f * innerH + 3}
            textAnchor="end" fontSize={8} fill="#64748b">
            {(yMax - f * yRange).toFixed(1)}
          </text>
        ))}
        {/* Area fill */}
        <path d={areaPath} fill="url(#currentAreaGrad)" />
        {/* Line */}
        <path d={linePath} fill="none" stroke={COLOR} strokeWidth={1.5} />
      </svg>
    </div>
  );
}
