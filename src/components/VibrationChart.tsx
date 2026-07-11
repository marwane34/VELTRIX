import { useEffect, useRef, useState } from 'react';

interface VibrationPoint {
  t: number;
  x: number;
  y: number;
}

interface Props {
  data: VibrationPoint[];
}

/**
 * Dual-line SVG waveform chart for X (blue) and Y (cyan) vibration axes.
 * Renders the most recent 200 samples over a dashed grid on a dark canvas.
 */
export default function VibrationChart({ data }: Props) {
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

  const pts = data.slice(-200);
  const padTop = 10;
  const padBottom = 10;
  const plotH = height - padTop - padBottom;
  const midY = padTop + plotH / 2;
  // Vibration values hover around zero with magnitude up to ~1.5; fixed symmetric range.
  const vRange = 1.5;
  const mapY = (v: number) => midY - (v / vRange) * (plotH / 2);
  const mapX = (i: number) => (pts.length > 1 ? (i / (pts.length - 1)) * width : 0);

  const xPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${mapX(i).toFixed(2)} ${mapY(p.x).toFixed(2)}`).join(' ');
  const yPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${mapX(i).toFixed(2)} ${mapY(p.y).toFixed(2)}`).join(' ');

  const hGridYs = [padTop, midY, height - padBottom];

  return (
    <div className="panel">
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid #1e2d45' }}>
        <span className="text-xs font-semibold text-slate-200 tracking-wide">VIBRATION WAVEFORM</span>
        <div className="flex items-center gap-3 text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <span style={{ width: 10, height: 2, background: '#3b82f6', display: 'inline-block' }} />
            X
          </span>
          <span className="flex items-center gap-1">
            <span style={{ width: 10, height: 2, background: '#06b6d4', display: 'inline-block' }} />
            Y
          </span>
        </div>
      </div>
      <div ref={containerRef} className="chart-bg" style={{ height }}>
        <svg width={width} height={height} className="block">
          {hGridYs.map((y, i) => (
            <line key={`h${i}`} x1={0} y1={y} x2={width} y2={y} className="chart-grid-line" />
          ))}
          {[0.25, 0.5, 0.75].map((f, i) => (
            <line key={`v${i}`} x1={width * f} y1={padTop} x2={width * f} y2={height - padBottom} className="chart-grid-line" />
          ))}
          <path d={xPath} fill="none" stroke="#3b82f6" strokeWidth={1.5} strokeLinejoin="round" />
          <path d={yPath} fill="none" stroke="#06b6d4" strokeWidth={1.5} strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
