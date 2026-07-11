import { useEffect, useRef, useState } from 'react';

interface FreqPoint {
  freq: number;
  amp: number;
}

interface Props {
  data: FreqPoint[];
}

/**
 * SVG bar chart for the frequency spectrum. Blue bars scaled to the peak
 * amplitude, with frequency labels along the X axis on a dark canvas.
 */
export default function FrequencyChart({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const height = 160;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(e.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const bars = data;
  const maxAmp = bars.length ? Math.max(...bars.map((b) => b.amp), 0.001) : 1;
  const padTop = 8;
  const padBottom = 20; // room for frequency labels
  const plotH = height - padTop - padBottom;
  const barW = bars.length ? width / bars.length : width;
  const gap = Math.max(1, barW * 0.12);

  // Label roughly every Nth bar to avoid crowding.
  const labelStep = Math.max(1, Math.ceil(bars.length / 8));

  return (
    <div className="panel">
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid #1e2d45' }}>
        <span className="text-xs font-semibold text-slate-200 tracking-wide">FREQUENCY SPECTRUM</span>
        <span className="text-[10px] text-slate-500">Hz</span>
      </div>
      <div ref={containerRef} className="chart-bg" style={{ height }}>
        <svg width={width} height={height} className="block">
          {[0.25, 0.5, 0.75].map((f, i) => (
            <line key={`hg${i}`} x1={0} y1={padTop + plotH * f} x2={width} y2={padTop + plotH * f} className="chart-grid-line" />
          ))}
          {bars.map((b, i) => {
            const h = (b.amp / maxAmp) * plotH;
            const x = i * barW + gap / 2;
            const y = padTop + plotH - h;
            const w = Math.max(1, barW - gap);
            return <rect key={i} x={x} y={y} width={w} height={Math.max(0, h)} fill="#3b82f6" rx={1} />;
          })}
          {bars.map((b, i) =>
            i % labelStep === 0 ? (
              <text
                key={`l${i}`}
                x={i * barW + barW / 2}
                y={height - 6}
                textAnchor="middle"
                style={{ fontSize: 9, fill: '#64748b', fontFamily: 'inherit' }}
              >
                {b.freq}
              </text>
            ) : null
          )}
        </svg>
      </div>
    </div>
  );
}
