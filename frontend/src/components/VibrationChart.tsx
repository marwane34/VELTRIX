interface ChartProps { data: number[]; height?: number; }
export default function VibrationChart({ data, height = 160 }: ChartProps) {
  const w = 500, h = height, padding = 20;
  if (!data.length) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 11 }}>No data</div>;
  const max = Math.max(...data, 0.1), min = Math.min(...data, 0), range = max - min || 1;
  const pts = data.map((v, i) => `${padding + (i / (data.length - 1)) * (w - padding * 2)},${h - padding - ((v - min) / range) * (h - padding * 2 - 10)}`).join(' ');
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <text x="10" y="14" fill="var(--text-muted)" fontSize="10" fontFamily="sans-serif">Vibration RMS (g)</text>
      <line x1={padding} y1={h - padding} x2={w - padding} y2={h - padding} stroke="var(--border-primary)" strokeWidth="1" />
      <line x1={padding} y1={padding} x2={padding} y2={h - padding} stroke="var(--border-primary)" strokeWidth="1" />
      <polyline points={pts} fill="none" stroke="var(--accent-blue)" strokeWidth="1.5" />
    </svg>
  );
}
