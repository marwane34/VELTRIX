import { useEffect, useState, useMemo } from 'react';
import {
  TrendingUp, Download, Cpu, Bell, Activity, AlertTriangle, Thermometer, Zap, Gauge,
  Loader2,
} from 'lucide-react';
import { useMonitoring } from '../contexts/MonitoringContext';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import type { MachineHealth, SensorSnapshot, HealthStatus } from '../types';

const statusColor: Record<HealthStatus, string> = {
  healthy: '#4ade80',
  warning: '#facc15',
  critical: '#f87171',
};

function fmtTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

interface Props {}

/**
 * Analytics & reports page. Aggregates KPIs from machines/alerts, draws SVG
 * trend charts (temperature, current, vibration) from `sensor_snapshots`, and
 * lists per-machine health from the `machine_health` table. CSV export of all
 * snapshots.
 */
export function AnalyticsPage(_: Props) {
  const { machines, recentAlerts } = useMonitoring();
  const { toast } = useToast();

  const [snapshots, setSnapshots] = useState<SensorSnapshot[]>([]);
  const [healthRows, setHealthRows] = useState<MachineHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [snapRes, healthRes] = await Promise.all([
        supabase.from('sensor_snapshots').select('*').order('recorded_at', { ascending: false }).limit(500),
        supabase.from('machine_health').select('*').order('updated_at', { ascending: false }),
      ]);
      if (cancelled) return;
      if (snapRes.data) setSnapshots(snapRes.data as SensorSnapshot[]);
      if (healthRes.data) setHealthRows(healthRes.data as MachineHealth[]);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const machineName = (id: string) => machines.find((m) => m.id === id)?.name ?? 'Unknown';

  // KPI summary
  const avgHealth = useMemo(() => {
    if (healthRows.length === 0) return 0;
    return Math.round(healthRows.reduce((sum, h) => sum + (h.health_score ?? 100), 0) / healthRows.length);
  }, [healthRows]);
  const criticalCount = healthRows.filter((h) => h.status === 'critical').length;

  // Build per-metric trend series (chronological, last 60 points)
  const tempSeries = useMemo(() => {
    return [...snapshots].reverse().slice(-60).map((s) => ({ t: new Date(s.recorded_at).getTime(), v: s.temperature }));
  }, [snapshots]);
  const currSeries = useMemo(() => {
    return [...snapshots].reverse().slice(-60).map((s) => ({ t: new Date(s.recorded_at).getTime(), v: s.current }));
  }, [snapshots]);
  const vibSeries = useMemo(() => {
    return [...snapshots].reverse().slice(-60).map((s) => ({ t: new Date(s.recorded_at).getTime(), v: s.vibration_rms }));
  }, [snapshots]);

  function renderTrend(data: { t: number; v: number }[], color: string, height: number, unit: string) {
    const width = 600;
    const padTop = 8; const padBottom = 8; const padL = 28;
    const plotH = height - padTop - padBottom;
    const pts = data;
    if (pts.length === 0) {
      return (
        <div className="flex items-center justify-center" style={{ height, color: '#64748b', fontSize: 11 }}>
          No data
        </div>
      );
    }
    let minV = Math.min(...pts.map((p) => p.v));
    let maxV = Math.max(...pts.map((p) => p.v));
    if (minV === maxV) { minV -= 1; maxV += 1; }
    const pad = (maxV - minV) * 0.1; minV -= pad; maxV += pad;
    const range = maxV - minV || 1;
    const plotW = width - padL;
    const mapX = (i: number) => pts.length > 1 ? padL + (i / (pts.length - 1)) * plotW : padL;
    const mapY = (v: number) => padTop + plotH - ((v - minV) / range) * plotH;
    const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${mapX(i).toFixed(2)} ${mapY(p.v).toFixed(2)}`).join(' ');
    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="block">
        {[0, 0.5, 1].map((f, i) => (
          <line key={i} x1={padL} y1={padTop + plotH * f} x2={width} y2={padTop + plotH * f} className="chart-grid-line" />
        ))}
        <text x={2} y={padTop + 4} style={{ fontSize: 8, fill: '#64748b' }}>{maxV.toFixed(1)}</text>
        <text x={2} y={padTop + plotH + 2} style={{ fontSize: 8, fill: '#64748b' }}>{minV.toFixed(1)}</text>
        <path d={linePath} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
        {pts.length > 0 && (
          <circle cx={mapX(pts.length - 1)} cy={mapY(pts[pts.length - 1].v)} r={2.5} fill={color} />
        )}
      </svg>
    );
  }

  async function handleExportCSV() {
    setExporting(true);
    try {
      const { data } = await supabase.from('sensor_snapshots').select('*').order('recorded_at', { ascending: false }).limit(5000);
      const rows = (data ?? []) as SensorSnapshot[];
      if (rows.length === 0) { toast('No data to export', 'info'); setExporting(false); return; }
      const headers = ['id', 'machine_id', 'temperature', 'vibration_rms', 'current', 'rpm', 'voltage', 'recorded_at'];
      const lines = [headers.join(',')];
      for (const s of rows) {
        const cells = [s.id, s.machine_id, s.temperature, s.vibration_rms, s.current, s.rpm, s.voltage, s.recorded_at]
          .map((v) => { const c = String(v ?? ''); return c.includes(',') || c.includes('"') ? `"${c.replace(/"/g, '""')}"` : c; });
        lines.push(cells.join(','));
      }
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'veltrix_analytics.csv'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast(`Exported ${rows.length} records`, 'success');
    } catch (err) {
      toast('Export failed', 'error');
    }
    setExporting(false);
  }

  const kpis = [
    { label: 'TOTAL MACHINES', value: machines.length, color: '#60a5fa', Icon: Cpu },
    { label: 'TOTAL ALERTS', value: recentAlerts.length, color: '#facc15', Icon: Bell },
    { label: 'AVG HEALTH', value: avgHealth, unit: '', color: statusColor[avgHealth > 70 ? 'healthy' : avgHealth >= 40 ? 'warning' : 'critical'], Icon: Activity },
    { label: 'CRITICAL', value: criticalCount, color: '#f87171', Icon: AlertTriangle },
  ];

  const trendCards = [
    { title: 'TEMPERATURE TREND', data: tempSeries, color: '#f97316', unit: '°C', Icon: Thermometer },
    { title: 'CURRENT TREND', data: currSeries, color: '#eab308', unit: 'A', Icon: Zap },
    { title: 'VIBRATION TREND', data: vibSeries, color: '#06b6d4', unit: 'mm/s', Icon: Activity },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: '#0b0f1a' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid #1e2d45', background: 'linear-gradient(180deg,#0d1525 0%,#080d14 100%)' }}>
        <TrendingUp size={18} className="text-blue-400" />
        <span className="text-sm font-bold text-slate-100 tracking-wide">ANALYTICS &amp; REPORTS</span>
        <button className="btn-monitor flex items-center gap-1.5 ml-auto" style={{ height: 30, opacity: exporting ? 0.7 : 1 }} onClick={handleExportCSV} disabled={exporting}>
          {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} Export CSV
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-blue-400" />
            <span className="text-xs text-slate-400 ml-2">Loading analytics…</span>
          </div>
        ) : (
          <>
            {/* KPI summary */}
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              {kpis.map((k) => (
                <div key={k.label} className="panel p-3 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <k.Icon size={13} style={{ color: k.color }} />
                    <span className="text-[10px] text-slate-400 tracking-wide">{k.label}</span>
                  </div>
                  <span className="text-2xl font-bold" style={{ color: k.color }}>{k.value}{k.unit ?? ''}</span>
                </div>
              ))}
            </div>

            {/* Trend charts */}
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {trendCards.map((c) => (
                <div key={c.title} className="panel flex flex-col">
                  <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid #1e2d45' }}>
                    <c.Icon size={12} style={{ color: c.color }} />
                    <span className="text-xs font-semibold text-slate-200 tracking-wide">{c.title}</span>
                    <span className="ml-auto text-[10px] text-slate-500">{c.unit}</span>
                  </div>
                  <div className="chart-bg">{renderTrend(c.data, c.color, 140, c.unit)}</div>
                </div>
              ))}
            </div>

            {/* Machine health table */}
            <div className="panel flex flex-col">
              <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid #1e2d45' }}>
                <Gauge size={13} className="text-blue-400" />
                <span className="text-xs font-semibold text-slate-200 tracking-wide">MACHINE HEALTH</span>
                <span className="ml-auto text-[10px] text-slate-500">{healthRows.length} entries</span>
              </div>
              {healthRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <Gauge size={26} className="text-slate-600" />
                  <span className="text-xs text-slate-500">No health records yet.</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#0f1726' }}>
                        {['MACHINE', 'HEALTH', 'STATUS', 'TEMP', 'CURRENT', 'RPM', 'VIBRATION', 'UPDATED'].map((h) => (
                          <th key={h} className="text-left px-3 py-2 text-[10px] font-semibold text-slate-400 tracking-wide" style={{ borderBottom: '1px solid #1e2d45' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {healthRows.map((h, i) => {
                        const color = statusColor[h.status] ?? statusColor.healthy;
                        return (
                          <tr key={h.machine_id + i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(30,45,69,0.18)' }}>
                            <td className="px-3 py-2 text-[11px] text-slate-200" style={{ borderBottom: '1px solid #141e30' }}>{machineName(h.machine_id)}</td>
                            <td className="px-3 py-2" style={{ borderBottom: '1px solid #141e30' }}>
                              <span className="text-[11px] font-bold" style={{ color }}>{h.health_score ?? 100}</span>
                            </td>
                            <td className="px-3 py-2" style={{ borderBottom: '1px solid #141e30' }}>
                              <span className="px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide" style={{ background: `${color}1a`, color, border: `1px solid ${color}40` }}>{h.status}</span>
                            </td>
                            <td className="px-3 py-2 text-[11px] val-orange" style={{ borderBottom: '1px solid #141e30' }}>{h.temperature?.toFixed(1)}°</td>
                            <td className="px-3 py-2 text-[11px] val-yellow" style={{ borderBottom: '1px solid #141e30' }}>{h.current?.toFixed(2)}A</td>
                            <td className="px-3 py-2 text-[11px] val-cyan" style={{ borderBottom: '1px solid #141e30' }}>{h.rpm}</td>
                            <td className="px-3 py-2 text-[11px] val-cyan" style={{ borderBottom: '1px solid #141e30' }}>{(((h.rms_x ?? 0) + (h.rms_y ?? 0)) / 2).toFixed(2)}</td>
                            <td className="px-3 py-2 text-[10px] text-slate-500" style={{ borderBottom: '1px solid #141e30' }}>{fmtTime(h.updated_at)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AnalyticsPage;
