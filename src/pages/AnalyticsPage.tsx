import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TrendingUp, Download, Cpu, Bell, Activity, AlertOctagon,
  Thermometer, Zap, Loader2, RefreshCw,
} from 'lucide-react';
import { useMonitoring } from '../contexts/MonitoringContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import type { MachineHealth, SensorSnapshot, HealthStatus, ExportType } from '../types';
import { exportCSV, downloadBlob, saveReportRecord, timestamp, sanitizeFilename } from '../lib/exportUtils';

interface AnalyticsPageProps {
  onNavigate: (page: string) => void;
}

interface Snapshot extends SensorSnapshot { machines?: { name: string } | null }

const statusColor: Record<HealthStatus, string> = { healthy: '#22c55e', warning: '#eab308', critical: '#ef4444' };
const statusLabel: Record<HealthStatus, string> = { healthy: 'HEALTHY', warning: 'WARNING', critical: 'CRITICAL' };

const cardStyle: React.CSSProperties = {
  background: '#0e1726', border: '1px solid #1e2d45', borderRadius: 4,
  padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6,
};

/**
 * AnalyticsPage — analytics & reports page with KPI summary, SVG trend charts
 * from sensor_snapshots, and a machine health table.
 */
export function AnalyticsPage({ onNavigate }: AnalyticsPageProps) {
  const { machines, recentAlerts, aiAnalysis } = useMonitoring();
  const { user } = useAuth();
  const { toast } = useToast();

  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [healthRecords, setHealthRecords] = useState<(MachineHealth & { machines?: { name: string } | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [snapRes, healthRes] = await Promise.all([
        supabase.from('sensor_snapshots').select('*, machines:machine_id(name)').eq('user_id', user.id).order('recorded_at', { ascending: false }).limit(200),
        supabase.from('machine_health').select('*, machines:machine_id(name)').eq('user_id', user.id).order('updated_at', { ascending: false }),
      ]);
      if (snapRes.data) setSnapshots(snapRes.data as Snapshot[]);
      if (healthRes.data) setHealthRecords(healthRes.data as (MachineHealth & { machines?: { name: string } | null })[]);
    } catch (err) {
      toast('Failed to load analytics: ' + (err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // KPI summary
  const kpis = useMemo(() => {
    const totalMachines = machines.length;
    const totalAlerts = recentAlerts.length;
    const criticalCount = recentAlerts.filter((a) => a.severity === 'critical').length;
    const avgHealth = healthRecords.length > 0
      ? Math.round(healthRecords.reduce((sum, h) => sum + h.health_score, 0) / healthRecords.length)
      : aiAnalysis?.healthScore ?? 100;
    return { totalMachines, totalAlerts, criticalCount, avgHealth };
  }, [machines, recentAlerts, healthRecords, aiAnalysis]);

  // Build trend series from snapshots (reverse to chronological)
  const trends = useMemo(() => {
    const chrono = [...snapshots].reverse();
    return {
      temperature: chrono.map((s, i) => ({ t: i, v: s.temperature })),
      current: chrono.map((s, i) => ({ t: i, v: s.current })),
      vibration: chrono.map((s, i) => ({ t: i, v: s.vibration_rms })),
    };
  }, [snapshots]);

  function renderTrendSVG(data: { t: number; v: number }[], color: string, w: number, h: number, label: string, unit: string) {
    if (data.length < 2) {
      return (
        <div className="flex items-center justify-center" style={{ height: h, color: '#64748b', fontSize: 11 }}>
          No data available
        </div>
      );
    }
    const pad = { top: 20, right: 12, bottom: 24, left: 44 };
    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;
    const vals = data.map((d) => d.v);
    const minV = Math.min(...vals);
    const maxV = Math.max(...vals);
    const range = maxV - minV || 1;
    const stepX = plotW / Math.max(data.length - 1, 1);
    let path = '';
    let areaPath = '';
    data.forEach((d, i) => {
      const x = pad.left + i * stepX;
      const y = pad.top + (1 - (d.v - minV) / range) * plotH;
      if (i === 0) { path = `M${x},${y}`; areaPath = `M${x},${pad.top + plotH} L${x},${y}`; }
      else { path += ` L${x},${y}`; areaPath += ` L${x},${y}`; }
      if (i === data.length - 1) areaPath += ` L${x},${pad.top + plotH} Z`;
    });
    const gradId = `grad_${color.replace('#', '')}`;
    const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => {
      const y = pad.top + f * plotH;
      return <line key={f} x1={pad.left} y1={y} x2={pad.left + plotW} y2={y} stroke="#1e2d45" strokeWidth={0.5} strokeDasharray="3,3" />;
    });
    const yLabels = [0, 0.5, 1].map((f) => {
      const v = maxV - f * range;
      const y = pad.top + f * plotH;
      return <text key={f} x={pad.left - 6} y={y + 3} fill="#64748b" fontSize={9} textAnchor="end">{v.toFixed(1)}</text>;
    });
    return (
      <svg width={w} height={h} style={{ display: 'block' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {gridLines}
        {yLabels}
        <text x={pad.left} y={12} fill="#94a3b8" fontSize={10} fontWeight={600}>{label} ({unit})</text>
        <path d={areaPath} fill={`url(#${gradId})`} />
        <path d={path} fill="none" stroke={color} strokeWidth={1.5} />
      </svg>
    );
  }

  async function handleExportCSV() {
    if (snapshots.length === 0) { toast('No data to export', 'error'); return; }
    setExporting(true);
    try {
      const rows: string[][] = [];
      rows.push(['VELTRIX Analytics — Sensor Snapshots Export']);
      rows.push([`Operator,${user?.email ?? 'Unknown'}`]);
      rows.push([`Export Time,${new Date().toLocaleString()}`]);
      rows.push([]);
      rows.push(['Machine', 'Temperature (°C)', 'Vibration RMS (g)', 'Current (A)', 'RPM', 'Voltage (V)', 'Recorded At']);
      snapshots.forEach((s) => {
        rows.push([
          s.machines?.name ?? s.machine_id,
          String(s.temperature.toFixed(2)), String(s.vibration_rms.toFixed(3)),
          String(s.current.toFixed(2)), String(s.rpm), String(s.voltage),
          new Date(s.recorded_at).toLocaleString(),
        ]);
      });
      const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const filename = `analytics_${timestamp()}.csv`;
      downloadBlob(blob, filename);
      await saveReportRecord({
        reportName: filename, machineId: null, exportType: 'csv' as ExportType,
        createdBy: user?.email ?? 'Unknown', filePath: filename, fileSize: blob.size,
      });
      toast('CSV exported successfully', 'success');
    } catch (err) {
      toast('Export failed: ' + (err as Error).message, 'error');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col" style={{ height: '100%', background: '#060b14' }}>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ padding: '12px 16px', borderBottom: '1px solid #1e2d45', flexShrink: 0 }}>
        <div className="flex items-center gap-3">
          <TrendingUp size={20} style={{ color: '#3b82f6' }} />
          <span className="font-bold tracking-wider" style={{ fontSize: 14, color: '#e2e8f0' }}>ANALYTICS & REPORTS</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} disabled={loading} className="btn-secondary flex items-center gap-1.5" style={{ padding: '5px 12px', opacity: loading ? 0.5 : 1 }}>
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={handleExportCSV} disabled={exporting} className="btn-secondary flex items-center gap-1.5" style={{ padding: '5px 12px', opacity: exporting ? 0.5 : 1 }}>
            {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} Export CSV
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {loading ? (
          <div className="flex flex-col items-center justify-center" style={{ height: '100%', gap: 12 }}>
            <Loader2 size={32} className="animate-spin" style={{ color: '#3b82f6' }} />
            <span style={{ fontSize: 12, color: '#64748b' }}>Loading analytics data...</span>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* KPI Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <div style={cardStyle}>
                <div className="flex items-center gap-2">
                  <Cpu size={14} style={{ color: '#3b82f6' }} />
                  <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.5px', color: '#64748b' }}>TOTAL MACHINES</span>
                </div>
                <span className="font-bold val-blue" style={{ fontSize: 24 }}>{kpis.totalMachines}</span>
              </div>
              <div style={cardStyle}>
                <div className="flex items-center gap-2">
                  <Bell size={14} style={{ color: '#eab308' }} />
                  <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.5px', color: '#64748b' }}>TOTAL ALERTS</span>
                </div>
                <span className="font-bold val-yellow" style={{ fontSize: 24 }}>{kpis.totalAlerts}</span>
              </div>
              <div style={cardStyle}>
                <div className="flex items-center gap-2">
                  <Activity size={14} style={{ color: '#22c55e' }} />
                  <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.5px', color: '#64748b' }}>AVG HEALTH SCORE</span>
                </div>
                <span className="font-bold val-green" style={{ fontSize: 24 }}>{kpis.avgHealth}</span>
              </div>
              <div style={cardStyle}>
                <div className="flex items-center gap-2">
                  <AlertOctagon size={14} style={{ color: '#ef4444' }} />
                  <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.5px', color: '#64748b' }}>CRITICAL COUNT</span>
                </div>
                <span className="font-bold val-red" style={{ fontSize: 24 }}>{kpis.criticalCount}</span>
              </div>
            </div>

            {/* Trend Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div className="panel flex flex-col">
                <div style={{ padding: '6px 10px', borderBottom: '1px solid #1e2d45', background: 'linear-gradient(180deg,#0d1525 0%,#0b1220 100%)' }}>
                  <span className="flex items-center gap-1.5" style={{ fontSize: 10, fontWeight: 600, color: '#c8d6ea', letterSpacing: '0.5px' }}>
                    <Thermometer size={11} className="val-orange" /> TEMPERATURE TREND
                  </span>
                </div>
                <div style={{ padding: 8, background: '#080d14' }}>
                  {renderTrendSVG(trends.temperature, '#fb923c', 320, 180, 'Temperature', '°C')}
                </div>
              </div>
              <div className="panel flex flex-col">
                <div style={{ padding: '6px 10px', borderBottom: '1px solid #1e2d45', background: 'linear-gradient(180deg,#0d1525 0%,#0b1220 100%)' }}>
                  <span className="flex items-center gap-1.5" style={{ fontSize: 10, fontWeight: 600, color: '#c8d6ea', letterSpacing: '0.5px' }}>
                    <Zap size={11} className="val-yellow" /> CURRENT TREND
                  </span>
                </div>
                <div style={{ padding: 8, background: '#080d14' }}>
                  {renderTrendSVG(trends.current, '#facc15', 320, 180, 'Current', 'A')}
                </div>
              </div>
              <div className="panel flex flex-col">
                <div style={{ padding: '6px 10px', borderBottom: '1px solid #1e2d45', background: 'linear-gradient(180deg,#0d1525 0%,#0b1220 100%)' }}>
                  <span className="flex items-center gap-1.5" style={{ fontSize: 10, fontWeight: 600, color: '#c8d6ea', letterSpacing: '0.5px' }}>
                    <Activity size={11} className="val-cyan" /> VIBRATION TREND
                  </span>
                </div>
                <div style={{ padding: 8, background: '#080d14' }}>
                  {renderTrendSVG(trends.vibration, '#22d3ee', 320, 180, 'Vibration RMS', 'g')}
                </div>
              </div>
            </div>

            {/* Machine Health Table */}
            <div className="panel flex flex-col">
              <div style={{ padding: '8px 12px', borderBottom: '1px solid #1e2d45', background: 'linear-gradient(180deg,#0d1525 0%,#0b1220 100%)' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#c8d6ea', letterSpacing: '0.5px' }}>MACHINE HEALTH TABLE</span>
              </div>
              {healthRecords.length === 0 ? (
                <div className="flex items-center justify-center" style={{ padding: 32 }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>No health records available.</span>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead>
                      <tr style={{ background: '#0a1220' }}>
                        {['Machine', 'Health', 'Status', 'Temp (°C)', 'Current (A)', 'RPM', 'RMS X (g)', 'RMS Y (g)', 'Updated'].map((h) => (
                          <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#94a3b8', fontSize: 10, letterSpacing: '0.3px', borderBottom: '1px solid #1e2d45' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {healthRecords.map((h, i) => (
                        <tr key={h.machine_id + i} style={{ background: i % 2 === 0 ? 'transparent' : '#0a12201a' }}>
                          <td style={{ padding: '6px 10px', color: '#e2e8f0', fontWeight: 600, borderBottom: '1px solid #1a2540' }}>{h.machines?.name ?? h.machine_id}</td>
                          <td style={{ padding: '6px 10px', borderBottom: '1px solid #1a2540' }}>
                            <span className="font-bold" style={{ color: statusColor[h.status] }}>{h.health_score}</span>
                          </td>
                          <td style={{ padding: '6px 10px', borderBottom: '1px solid #1a2540' }}>
                            <span style={{ fontSize: 9, fontWeight: 700, color: statusColor[h.status], padding: '1px 6px', border: `1px solid ${statusColor[h.status]}40`, borderRadius: 3, background: `${statusColor[h.status]}10` }}>{statusLabel[h.status]}</span>
                          </td>
                          <td className="val-orange" style={{ padding: '6px 10px', borderBottom: '1px solid #1a2540' }}>{h.temperature.toFixed(1)}</td>
                          <td className="val-yellow" style={{ padding: '6px 10px', borderBottom: '1px solid #1a2540' }}>{h.current.toFixed(2)}</td>
                          <td className="val-cyan" style={{ padding: '6px 10px', borderBottom: '1px solid #1a2540' }}>{h.rpm}</td>
                          <td className="val-blue" style={{ padding: '6px 10px', borderBottom: '1px solid #1a2540' }}>{h.rms_x.toFixed(3)}</td>
                          <td className="val-blue" style={{ padding: '6px 10px', borderBottom: '1px solid #1a2540' }}>{h.rms_y.toFixed(3)}</td>
                          <td style={{ padding: '6px 10px', color: '#64748b', fontSize: 10, borderBottom: '1px solid #1a2540' }}>{new Date(h.updated_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AnalyticsPage;
