import { useEffect, useId, useRef, useState } from 'react';

interface TrendPoint {
  t: number;
  v: number;
}

interface Props {
  data: TrendPoint[];
}

/**
 * SVG line chart for the temperature trend. Orange line with a translucent
 * gradient area fill, auto-scaled to the visible data on a dark canvas.
 */
export default function TemperatureChart({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const height = 160;
  const gradId = useId();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(e.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pts = data.slice(-200);
  const padTop = 10;
  const padBottom = 10;
  const plotH = height - padTop - padBottom;

  let minV = pts.length ? Math.min(...pts.map((p) => p.v)) : 0;
  let maxV = pts.length ? Math.max(...pts.map((p) => p.v)) : 1;
  if (minV === maxV) {
    minV -= 1;
    maxV += 1;
  }
  const padV = (maxV - minV) * 0.1;
  minV -= padV;
  maxV += padV;
  const range = maxV - minV || 1;

  const mapY = (v: number) => padTop + plotH - ((v - minV) / range) * plotH;
  const mapX = (i: number) => (pts.length > 1 ? (i / (pts.length - 1)) * width : 0);

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${mapX(i).toFixed(2)} ${mapY(p.v).toFixed(2)}`).join(' ');
  const baseY = padTop + plotH;
  const areaPath =
    pts.length > 1
      ? `${linePath} L ${mapX(pts.length - 1).toFixed(2)} ${baseY} L ${mapX(0).toFixed(2)} ${baseY} Z`
      : '';

  return (
    <div className="panel">
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid #1e2d45' }}>
        <span className="text-xs font-semibold text-slate-200 tracking-wide">TEMPERATURE TREND</span>
        <span className="text-[10px] text-slate-500">°C</span>
      </div>
      <div ref={containerRef} className="chart-bg" style={{ height }}>
        <svg width={width} height={height} className="block">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((f, i) => (
            <line key={`h${i}`} x1={0} y1={padTop + plotH * f} x2={width} y2={padTop + plotH * f} className="chart-grid-line" />
          ))}
          {areaPath && <path d={areaPath} fill={`url(#${gradId})`} />}
          <path d={linePath} fill="none" stroke="#f97316" strokeWidth={1.5} strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
