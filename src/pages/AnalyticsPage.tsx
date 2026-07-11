import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Download, Thermometer, Zap, Activity, Cpu, Gauge, Clock, TriangleAlert as AlertTriangle } from 'lucide-react';
import { useMonitoring } from '../contexts/MonitoringContext';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Machine, SensorSnapshot, MachineStatus } from '../types';

const STATUS_COLORS: Record<MachineStatus, string> = {
  online: '#22c55e',
  offline: '#64748b',
  warning: '#eab308',
  critical: '#ef4444',
};

export function AnalyticsPage() {
  const { machines } = useMonitoring();
  const { user } = useAuth();
  const [snapshots, setSnapshots] = useState<SensorSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMachineId, setSelectedMachineId] = useState<string>('all');

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    let query = supabase
      .from('sensor_snapshots')
      .select('*')
      .eq('user_id', user.id)
      .order('recorded_at', { ascending: false })
      .limit(500);
    if (selectedMachineId !== 'all') {
      query = query.eq('machine_id', selectedMachineId);
    }
    query.then(({ data }) => {
      setSnapshots((data as SensorSnapshot[]) ?? []);
      setLoading(false);
    });
  }, [user, selectedMachineId]);

  // KPI calculations
  const kpis = useMemo(() => {
    if (snapshots.length === 0) {
      return { avgTemp: 0, avgCurrent: 0, avgVib: 0, avgRpm: 0, maxTemp: 0, maxCurrent: 0, maxVib: 0, totalReadings: 0 };
    }
    const temps = snapshots.map((s) => s.temperature);
    const currents = snapshots.map((s) => s.current);
    const vibs = snapshots.map((s) => s.vibration_rms);
    const rpms = snapshots.map((s) => s.rpm);
    return {
      avgTemp: temps.reduce((a, b) => a + b, 0) / temps.length,
      avgCurrent: currents.reduce((a, b) => a + b, 0) / currents.length,
      avgVib: vibs.reduce((a, b) => a + b, 0) / vibs.length,
      avgRpm: rpms.reduce((a, b) => a + b, 0) / rpms.length,
      maxTemp: Math.max(...temps),
      maxCurrent: Math.max(...currents),
      maxVib: Math.max(...vibs),
      totalReadings: snapshots.length,
    };
  }, [snapshots]);

  // Trend data (reversed for chronological order)
  const trendData = useMemo(() => {
    return [...snapshots].reverse().slice(-100);
  }, [snapshots]);

  // Machine health summary
  const machineHealth = useMemo(() => {
    return machines.map((m) => {
      const mSnaps = snapshots.filter((s) => s.machine_id === m.id);
      if (mSnaps.length === 0) {
        return { machine: m, avgTemp: 0, avgCurrent: 0, avgVib: 0, readings: 0, lastReading: null };
      }
      const sorted = [...mSnaps].sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
      return {
        machine: m,
        avgTemp: mSnaps.reduce((a, s) => a + s.temperature, 0) / mSnaps.length,
        avgCurrent: mSnaps.reduce((a, s) => a + s.current, 0) / mSnaps.length,
        avgVib: mSnaps.reduce((a, s) => a + s.vibration_rms, 0) / mSnaps.length,
        readings: mSnaps.length,
        lastReading: sorted[0]?.recorded_at ?? null,
      };
    });
  }, [machines, snapshots]);

  function exportCSV() {
    if (snapshots.length === 0) return;
    const headers = ['machine_id', 'temperature', 'vibration_rms', 'current', 'rpm', 'voltage', 'recorded_at'];
    const rows = snapshots.map((s) =>
      [s.machine_id, s.temperature, s.vibration_rms, s.current, s.rpm, s.voltage, s.recorded_at].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `veltrix_analytics_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', borderBottom: '1px solid #1e2d45',
        background: 'linear-gradient(180deg, #0d1220 0%, #080d14 100%)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <TrendingUp size={18} color="#3b82f6" />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', letterSpacing: '1px' }}>
            ANALYTICS & REPORTS
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={selectedMachineId}
            onChange={(e) => setSelectedMachineId(e.target.value)}
            style={{
              background: '#060b14', border: '1px solid #1e2d45', color: '#e2e8f0',
              padding: '5px 10px', borderRadius: 4, fontSize: 11, outline: 'none',
            }}
          >
            <option value="all">All Machines</option>
            {machines.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <button className="btn-monitor" onClick={exportCSV} disabled={snapshots.length === 0} style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: snapshots.length === 0 ? 0.5 : 1 }}>
            <Download size={13} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#64748b', fontSize: 13, padding: 40 }}>Loading analytics data...</div>
        ) : snapshots.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#64748b', fontSize: 13, padding: 40 }}>
            <TrendingUp size={32} color="#1e2d45" style={{ margin: '0 auto 12px', display: 'block' }} />
            No sensor data available yet. Start monitoring to collect data.
          </div>
        ) : (
          <>
            {/* KPI Summary Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 12, marginBottom: 16,
            }}>
              <KPICard icon={Thermometer} color="#f97316" label="Avg Temperature" value={`${kpis.avgTemp.toFixed(1)}°C`} sub={`Max: ${kpis.maxTemp.toFixed(1)}°C`} />
              <KPICard icon={Zap} color="#eab308" label="Avg Current" value={`${kpis.avgCurrent.toFixed(2)}A`} sub={`Max: ${kpis.maxCurrent.toFixed(2)}A`} />
              <KPICard icon={Activity} color="#3b82f6" label="Avg Vibration" value={`${kpis.avgVib.toFixed(3)}`} sub={`Max: ${kpis.maxVib.toFixed(3)}`} />
              <KPICard icon={Gauge} color="#06b6d4" label="Avg RPM" value={`${Math.round(kpis.avgRpm)}`} sub="RPM" />
              <KPICard icon={Clock} color="#22c55e" label="Total Readings" value={kpis.totalReadings.toLocaleString()} sub="records" />
              <KPICard icon={Cpu} color="#8b5cf6" label="Active Machines" value={String(machines.length)} sub="configured" />
            </div>

            {/* Trend Charts */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16,
            }}>
              <TrendChart title="TEMPERATURE TREND" data={trendData.map((s, i) => ({ t: i, v: s.temperature }))} color="#f97316" unit="°C" />
              <TrendChart title="CURRENT TREND" data={trendData.map((s, i) => ({ t: i, v: s.current }))} color="#eab308" unit="A" />
              <TrendChart title="VIBRATION TREND" data={trendData.map((s, i) => ({ t: i, v: s.vibration_rms }))} color="#3b82f6" unit="" />
            </div>

            {/* Machine Health Table */}
            <div className="panel" style={{ borderRadius: 6, overflow: 'hidden' }}>
              <div style={{
                padding: '8px 12px', borderBottom: '1px solid #1e2d45',
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'linear-gradient(180deg, #111827 0%, #0d1220 100%)',
              }}>
                <Cpu size={13} color="#3b82f6" />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '1px' }}>
                  MACHINE HEALTH SUMMARY
                </span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1e2d45' }}>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: '#94a3b8', fontWeight: 600, fontSize: 10, letterSpacing: '0.5px' }}>MACHINE</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: '#94a3b8', fontWeight: 600, fontSize: 10, letterSpacing: '0.5px' }}>STATUS</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', color: '#f97316', fontWeight: 600, fontSize: 10, letterSpacing: '0.5px' }}>AVG TEMP</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', color: '#eab308', fontWeight: 600, fontSize: 10, letterSpacing: '0.5px' }}>AVG CURRENT</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', color: '#3b82f6', fontWeight: 600, fontSize: 10, letterSpacing: '0.5px' }}>AVG VIBRATION</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', color: '#94a3b8', fontWeight: 600, fontSize: 10, letterSpacing: '0.5px' }}>READINGS</th>
                  </tr>
                </thead>
                <tbody>
                  {machineHealth.map(({ machine, avgTemp, avgCurrent, avgVib, readings, lastReading }) => {
                    const statusColor = STATUS_COLORS[machine.status];
                    const tempExceeded = avgTemp > machine.temp_max * 0.8;
                    const vibExceeded = avgVib > machine.rms_max * 0.8;
                    return (
                      <tr key={machine.id} style={{ borderBottom: '1px solid #111827' }}>
                        <td style={{ padding: '7px 12px', color: '#e2e8f0', fontWeight: 600 }}>{machine.name}</td>
                        <td style={{ padding: '7px 12px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: statusColor, fontSize: 10, fontWeight: 600 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} />
                            {machine.status.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '7px 12px', textAlign: 'right', color: tempExceeded ? '#ef4444' : '#fb923c', fontWeight: 600 }}>
                          {tempExceeded && <AlertTriangle size={9} style={{ display: 'inline', marginRight: 4 }} />}
                          {avgTemp.toFixed(1)}°C
                        </td>
                        <td style={{ padding: '7px 12px', textAlign: 'right', color: '#facc15', fontWeight: 600 }}>{avgCurrent.toFixed(2)}A</td>
                        <td style={{ padding: '7px 12px', textAlign: 'right', color: vibExceeded ? '#ef4444' : '#60a5fa', fontWeight: 600 }}>
                          {vibExceeded && <AlertTriangle size={9} style={{ display: 'inline', marginRight: 4 }} />}
                          {avgVib.toFixed(3)}
                        </td>
                        <td style={{ padding: '7px 12px', textAlign: 'right', color: '#94a3b8' }}>{readings}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function KPICard({ icon: Icon, color, label, value, sub }: {
  icon: typeof TrendingUp; color: string; label: string; value: string; sub: string;
}) {
  return (
    <div className="panel" style={{ borderRadius: 6, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 5,
          background: `${color}15`, border: `1px solid ${color}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={14} color={color} />
        </div>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.5px' }}>
          {label.toUpperCase()}
        </span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function TrendChart({ title, data, color, unit }: {
  title: string; data: { t: number; v: number }[]; color: string; unit: string;
}) {
  const WIDTH = 400;
  const HEIGHT = 160;
  const PADDING = { top: 22, right: 8, bottom: 18, left: 36 };
  const innerW = WIDTH - PADDING.left - PADDING.right;
  const innerH = HEIGHT - PADDING.top - PADDING.bottom;

  if (data.length === 0) {
    return (
      <div className="panel chart-bg" style={{ height: HEIGHT, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 11 }}>
        {title} — No data
      </div>
    );
  }

  const minV = Math.min(...data.map((d) => d.v));
  const maxV = Math.max(...data.map((d) => d.v));
  const range = maxV - minV || 1;
  const pad = range * 0.15;
  const yMin = minV - pad;
  const yMax = maxV + pad;
  const yRange = yMax - yMin || 1;

  const xScale = (i: number) => PADDING.left + (i / Math.max(1, data.length - 1)) * innerW;
  const yScale = (v: number) => PADDING.top + innerH - ((v - yMin) / yRange) * innerH;

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i).toFixed(1)} ${yScale(d.v).toFixed(1)}`).join(' ');
  const areaPath = `M ${xScale(0).toFixed(1)} ${(PADDING.top + innerH).toFixed(1)} ${data.map((d, i) => `L ${xScale(i).toFixed(1)} ${yScale(d.v).toFixed(1)}`).join(' ')} L ${xScale(data.length - 1).toFixed(1)} ${(PADDING.top + innerH).toFixed(1)} Z`;
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => PADDING.top + f * innerH);
  const gradId = `grad-${title.replace(/\s+/g, '')}`;

  return (
    <div className="panel chart-bg" style={{ height: HEIGHT, borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 10px', borderBottom: '1px solid #1e2d45' }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', color: '#94a3b8' }}>{title}</span>
        <span style={{ fontSize: 9, color }}>● {unit}</span>
      </div>
      <svg width="100%" height={HEIGHT - 22} viewBox={`0 0 ${WIDTH} ${HEIGHT - 22}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {gridLines.map((y, i) => (
          <line key={i} x1={PADDING.left} y1={y} x2={WIDTH - PADDING.right} y2={y} className="chart-grid-line" />
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
          <text key={i} x={PADDING.left - 4} y={PADDING.top + f * innerH + 3} textAnchor="end" fontSize={8} fill="#64748b">
            {(yMax - f * yRange).toFixed(1)}
          </text>
        ))}
        <path d={areaPath} fill={`url(#${gradId})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth={1.5} />
      </svg>
    </div>
  );
}

export default AnalyticsPage;
