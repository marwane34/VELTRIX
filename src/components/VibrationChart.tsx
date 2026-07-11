interface VibrationPoint { t: number; x: number; y: number; }

interface VibrationChartProps {
  data: VibrationPoint[];
}

const WIDTH = 600;
const HEIGHT = 150;
const PADDING = { top: 8, right: 8, bottom: 18, left: 32 };
const MAX_POINTS = 200;

const COLORS = {
  bg: '#080d14',
  border: '#1e2d45',
  text: '#94a3b8',
  grid: '#1a2540',
  lineX: '#3b82f6',
  lineY: '#06b6d4',
};

export default function VibrationChart({ data }: VibrationChartProps) {
  const points = data.slice(-MAX_POINTS);
  const plotW = WIDTH - PADDING.left - PADDING.right;
  const plotH = HEIGHT - PADDING.top - PADDING.bottom;

  // Y range: symmetric around 0 based on max absolute value
  const maxAbs = Math.max(1, ...points.map((p) => Math.max(Math.abs(p.x), Math.abs(p.y))));
  const yMax = Math.ceil(maxAbs * 1.2);
  const yMin = -yMax;

  const xScale = (i: number) => PADDING.left + (points.length <= 1 ? 0 : (i / (points.length - 1)) * plotW);
  const yScale = (v: number) => PADDING.top + ((yMax - v) / (yMax - yMin)) * plotH;

  const buildPath = (key: 'x' | 'y') =>
    points.length === 0
      ? ''
      : points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(i).toFixed(1)},${yScale(p[key]).toFixed(1)}`).join(' ');

  const gridLines = 4;
  const yTicks = Array.from({ length: gridLines + 1 }, (_, i) => yMin + ((yMax - yMin) * i) / gridLines);

  return (
    <div className="panel chart-bg" style={{ padding: 0 }}>
      <div
        className="flex items-center justify-between px-3 py-1.5"
        style={{ borderBottom: `1px solid ${COLORS.border}` }}
      >
        <span className="text-[10px] font-semibold tracking-wider" style={{ color: COLORS.text }}>
          VIBRATION ANALYSIS
        </span>
        <div className="flex items-center gap-3 text-[9px]">
          <span className="flex items-center gap-1" style={{ color: COLORS.text }}>
            <span style={{ display: 'inline-block', width: 8, height: 2, background: COLORS.lineX }} />
            X
          </span>
          <span className="flex items-center gap-1" style={{ color: COLORS.text }}>
            <span style={{ display: 'inline-block', width: 8, height: 2, background: COLORS.lineY }} />
            Y
          </span>
        </div>
      </div>
      <svg width="100%" height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        {/* Grid lines */}
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={PADDING.left}
              x2={WIDTH - PADDING.right}
              y1={yScale(tick)}
              y2={yScale(tick)}
              stroke={COLORS.grid}
              strokeWidth={1}
              strokeDasharray="4,4"
            />
            <text x={4} y={yScale(tick) + 3} fontSize={8} fill={COLORS.text}>
              {tick.toFixed(1)}
            </text>
          </g>
        ))}
        {/* Vertical grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
          <line
            key={`v${i}`}
            x1={PADDING.left + f * plotW}
            x2={PADDING.left + f * plotW}
            y1={PADDING.top}
            y2={HEIGHT - PADDING.bottom}
            stroke={COLORS.grid}
            strokeWidth={1}
            strokeDasharray="4,4"
          />
        ))}
        {/* Zero line */}
        <line
          x1={PADDING.left}
          x2={WIDTH - PADDING.right}
          y1={yScale(0)}
          y2={yScale(0)}
          stroke={COLORS.border}
          strokeWidth={1}
        />
        {/* X line */}
        <path d={buildPath('x')} fill="none" stroke={COLORS.lineX} strokeWidth={1.5} strokeLinejoin="round" />
        {/* Y line */}
        <path d={buildPath('y')} fill="none" stroke={COLORS.lineY} strokeWidth={1.5} strokeLinejoin="round" />
      </svg>
    </div>
  );
}
