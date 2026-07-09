import type { FreqBar } from '../hooks/useSimulatedData';

interface Props {
  bars: FreqBar[];
}

const W = 440;
const H = 160;
const PAD = { top: 8, right: 8, bottom: 28, left: 30 };
const FREQ_MIN = 0.7;
const FREQ_MAX = 5.9;
const AMP_MAX = 1.0;

function scaleX(f: number) {
  return PAD.left + ((f - FREQ_MIN) / (FREQ_MAX - FREQ_MIN)) * (W - PAD.left - PAD.right);
}
function scaleY(v: number) {
  return PAD.top + (1 - v / AMP_MAX) * (H - PAD.top - PAD.bottom);
}

const AMP_TICKS = [0.8, 0.6, 0.4, 0.2];
const FREQ_LABELS = ['1.0', '2.0', '3.0', '4.0', '5.0'];
const BAR_WIDTH = 10;

const ANNOTATIONS = [
  { freq: 1.0, label: '1x RPM', dx: -4, dy: -4 },
  { freq: 2.0, label: '2x RPM', dx: -6, dy: -4 },
  { freq: 5.0, label: 'Bearing Fault', dx: -28, dy: -4 },
];

export function FrequencyChart({ bars }: Props) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      style={{ display: 'block' }}
    >
      <rect x={PAD.left} y={PAD.top} width={W - PAD.left - PAD.right} height={H - PAD.top - PAD.bottom} fill="#070c14" />

      {/* Grid */}
      {AMP_TICKS.map((v) => {
        const y = scaleY(v);
        return (
          <g key={v}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#1a2540" strokeWidth={0.7} strokeDasharray="3,3" />
            <text x={PAD.left - 3} y={y + 3} textAnchor="end" fontSize={7} fill="#4a5f7a">{v}</text>
          </g>
        );
      })}

      {/* Bars */}
      {bars.map((bar, i) => {
        const x = scaleX(bar.freq);
        const barH = (H - PAD.top - PAD.bottom) * bar.amplitude;
        const y = H - PAD.bottom - barH;
        const baseColor = bar.isRed ? '#ef4444' : bar.amplitude > 0.35 ? '#9ca3af' : '#6b7280';
        const topColor = bar.isRed ? '#f87171' : bar.amplitude > 0.35 ? '#e5e7eb' : '#9ca3af';
        return (
          <g key={i}>
            <defs>
              <linearGradient id={`bg${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={topColor} stopOpacity={0.9} />
                <stop offset="100%" stopColor={baseColor} stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <rect
              x={x - BAR_WIDTH / 2}
              y={y}
              width={BAR_WIDTH}
              height={barH}
              fill={`url(#bg${i})`}
            />
          </g>
        );
      })}

      {/* Annotation arrows for labeled peaks */}
      {ANNOTATIONS.map((ann) => {
        const bar = bars.find((b) => Math.abs(b.freq - ann.freq) < 0.15);
        if (!bar) return null;
        const x = scaleX(bar.freq);
        const barH = (H - PAD.top - PAD.bottom) * bar.amplitude;
        const y = H - PAD.bottom - barH;
        return (
          <g key={ann.label}>
            <text
              x={x + ann.dx}
              y={y + ann.dy - 2}
              fontSize={7.5}
              fill="#c8d6ea"
            >
              {ann.label}
            </text>
            {ann.label === 'Bearing Fault' && (
              <line
                x1={x + ann.dx + 22}
                y1={y + ann.dy + 2}
                x2={x}
                y2={y}
                stroke="#ef4444"
                strokeWidth={1}
                markerEnd="url(#arrow)"
              />
            )}
          </g>
        );
      })}

      <defs>
        <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#ef4444" />
        </marker>
      </defs>

      {/* Axes */}
      <rect x={PAD.left} y={PAD.top} width={W - PAD.left - PAD.right} height={H - PAD.top - PAD.bottom} fill="none" stroke="#1e2d45" strokeWidth={0.8} />

      {/* Freq labels */}
      {FREQ_LABELS.map((label) => {
        const f = parseFloat(label);
        const x = scaleX(f);
        return (
          <text key={label} x={x} y={H - 14} textAnchor="middle" fontSize={7.5} fill="#4a5f7a">{label}</text>
        );
      })}

      {/* Axis labels */}
      <text x={W / 2} y={H - 2} textAnchor="middle" fontSize={8} fill="#4a5f7a">Frequency (Hz)</text>
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
    </svg>
  );
}
