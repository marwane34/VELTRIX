interface ChartProps { data: number[]; height?: number; }
export default function FrequencyChart({ data, height = 160 }: ChartProps) {
  const w = 500, h = height, padding = 20;
  if (!data.length) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 11 }}>No data</div>;
  const max = Math.max(...data, 0.1), bw = (w - padding * 2) / data.length;
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <text x="10" y="14" fill="var(--text-muted)" fontSize="10" fontFamily="sans-serif">Frequency Spectrum (Hz)</text>
      <line x1={padding} y1={h - padding} x2={w - padding} y2={h - padding} stroke="var(--border-primary)" strokeWidth="1" />
      <line x1={padding} y1={padding} x2={padding} y2={h - padding} stroke="var(--border-primary)" strokeWidth="1" />
      {data.map((v, i) => { const barH = (v / max) * (h - padding * 2 - 10); return <rect key={i} x={padding + i * bw} y={h - padding - barH} width={bw * 0.8} height={barH} fill="var(--accent-cyan)" rx="1" />; })}
    </svg>
  );
}
