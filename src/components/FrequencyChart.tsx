interface FreqBar { freq: number; amp: number; }

interface FrequencyChartProps {
  data: FreqBar[];
}

const WIDTH = 600;
const HEIGHT = 150;
const PADDING = { top: 8, right: 8, bottom: 18, left: 32 };

const COLORS = {
  bg: '#080d14',
  border: '#1e2d45',
  text: '#94a3b8',
  grid: '#1a2540',
  bar: '#3b82f6',
};

export default function FrequencyChart({ data }: FrequencyChartProps) {
  const bars = data.slice(-32);
  const plotW = WIDTH - PADDING.left - PADDING.right;
  const plotH = HEIGHT - PADDING.top - PADDING.bottom;

  const maxAmp = Math.max(0.1, ...bars.map((b) => b.amp));
  const barGap = 2;
  const barWidth = bars.length > 0 ? (plotW / bars.length) - barGap : 0;

  const yScale = (v: number) => PADDING.top + (1 - v / maxAmp) * plotH;

  const gridLines = 4;
  const yTicks = Array.from({ length: gridLines + 1 }, (_, i) => (maxAmp * i) / gridLines);

  return (
    <div className="panel chart-bg" style={{ padding: 0 }}>
      <div
        className="flex items-center justify-between px-3 py-1.5"
        style={{ borderBottom: `1px solid ${COLORS.border}` }}
      >
        <span className="text-[10px] font-semibold tracking-wider" style={{ color: COLORS.text }}>
          FREQUENCY SPECTRUM
        </span>
        <span className="text-[9px]" style={{ color: COLORS.text }}>
          Hz
        </span>
      </div>
      <svg width="100%" height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        {/* Horizontal grid lines */}
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
              {tick.toFixed(2)}
            </text>
          </g>
        ))}
        {/* Bars */}
        {bars.map((b, i) => {
          const x = PADDING.left + i * (barWidth + barGap);
          const y = yScale(b.amp);
          const h = PADDING.top + plotH - y;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={Math.max(0, barWidth)}
              height={Math.max(0, h)}
              fill={COLORS.bar}
              opacity={0.85}
            />
          );
        })}
        {/* X axis labels (first, middle, last) */}
        {bars.length > 0 && (
          <>
            <text x={PADDING.left} y={HEIGHT - 5} fontSize={8} fill={COLORS.text}>
              {bars[0].freq}
            </text>
            <text x={PADDING.left + plotW / 2 - 10} y={HEIGHT - 5} fontSize={8} fill={COLORS.text}>
              {bars[Math.floor(bars.length / 2)]?.freq}
            </text>
            <text x={WIDTH - PADDING.right - 24} y={HEIGHT - 5} fontSize={8} fill={COLORS.text}>
              {bars[bars.length - 1].freq}
            </text>
          </>
        )}
      </svg>
    </div>
  );
}
