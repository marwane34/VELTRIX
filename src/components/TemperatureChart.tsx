interface TrendPoint { t: number; v: number; }

interface TemperatureChartProps {
  data: TrendPoint[];
}

const WIDTH = 600;
const HEIGHT = 120;
const PADDING = { top: 8, right: 8, bottom: 16, left: 32 };

const COLORS = {
  bg: '#080d14',
  border: '#1e2d45',
  text: '#94a3b8',
  grid: '#1a2540',
  line: '#f97316',
  area: 'rgba(249,115,22,0.15)',
};

export default function TemperatureChart({ data }: TemperatureChartProps) {
  const points = data.slice(-60);
  const plotW = WIDTH - PADDING.left - PADDING.right;
  const plotH = HEIGHT - PADDING.top - PADDING.bottom;

  const values = points.map((p) => p.v);
  const rawMax = values.length > 0 ? Math.max(...values) : 100;
  const rawMin = values.length > 0 ? Math.min(...values) : 0;
  const range = rawMax - rawMin || 1;
  const yMax = rawMax + range * 0.15;
  const yMin = Math.max(0, rawMin - range * 0.15);

  const xScale = (i: number) => PADDING.left + (points.length <= 1 ? 0 : (i / (points.length - 1)) * plotW);
  const yScale = (v: number) => PADDING.top + ((yMax - v) / (yMax - yMin)) * plotH;

  const linePath =
    points.length === 0
      ? ''
      : points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(i).toFixed(1)},${yScale(p.v).toFixed(1)}`).join(' ');

  const areaPath =
    points.length === 0
      ? ''
      : `${linePath} L${xScale(points.length - 1).toFixed(1)},${(PADDING.top + plotH).toFixed(1)} L${xScale(0).toFixed(1)},${(PADDING.top + plotH).toFixed(1)} Z`;

  const gridLines = 3;
  const yTicks = Array.from({ length: gridLines + 1 }, (_, i) => yMin + ((yMax - yMin) * i) / gridLines);

  return (
    <div className="panel chart-bg" style={{ padding: 0 }}>
      <div
        className="flex items-center justify-between px-3 py-1.5"
        style={{ borderBottom: `1px solid ${COLORS.border}` }}
      >
        <span className="text-[10px] font-semibold tracking-wider" style={{ color: COLORS.text }}>
          TEMPERATURE TREND
        </span>
        <span className="text-[9px]" style={{ color: COLORS.text }}>
          °C
        </span>
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
              {tick.toFixed(0)}
            </text>
          </g>
        ))}
        {/* Area fill */}
        {areaPath && <path d={areaPath} fill={COLORS.area} />}
        {/* Line */}
        <path d={linePath} fill="none" stroke={COLORS.line} strokeWidth={1.5} strokeLinejoin="round" />
      </svg>
    </div>
  );
}
