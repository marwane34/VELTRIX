import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Download, Activity, Thermometer, Zap, Gauge } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useMonitoring } from '../contexts/MonitoringContext';
import type { MachineHealth } from '../types';

/* ---------- helpers ---------- */

function timeLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/* ---------- chart sub-component ---------- */

function TrendChart({
  title, icon, data, dataKey, color, unit,
}: {
  title: string;
  icon: React.ReactNode;
  data: { recorded_at: string; [k: string]: any }[];
  dataKey: string;
  color: string;
  unit: string;
}) {
  const width = 520;
  const height = 160;
  const padL = 40;
  const padR = 12;
  const padT = 12;
  const padB = 22;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  const values = data.map((d) => Number(d[dataKey]) || 0);
  const minVal = values.length ? Math.min(...values) : 0;
  const maxVal = values.length ? Math.max(...values) : 1;
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => {
    const x = padL + (data.length > 1 ? (i / (data.length - 1)) * chartW : chartW / 2);
    const y = padT + chartH - ((Number(d[dataKey]) - minVal) / range) * chartH;
    return { x, y, val: Number(d[dataKey]) || 0, label: timeLabel(d.recorded_at) };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${padT + chartH} L ${points[0].x.toFixed(1)} ${padT + chartH} Z`
    : '';

  // Y-axis labels
  const yLabels = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    y: padT + chartH - t * chartH,
    val: minVal + t * range,
  }));

  return (
    <div className="panel" style={{ borderRadius: 4, overflow: 'hidden' }}>
      <div
        className="flex items-center justify-between px-3 py-1.5"
        style={{ background: 'linear-gradient(180deg,#151f33 0%,#0f1726 100%)', borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-1.5">
          <span style={{ color }}>{icon}</span>
          <span className="text-xs font-semibold text-slate-200">{title}</span>
        </div>
        <span className="text-xs text-slate-500">Last 24h</span>
      </div>
      <div style={{ background: '#080d14', padding: 4 }}>
        {data.length === 0 ? (
          <div className="flex items-center justify-center" style={{ height }}>
            <span className="text-xs text-slate-600">No data available</span>
          </div>
        ) : (
          <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
            {/* grid lines */}
            {yLabels.map((yl, i) => (
              <g key={i}>
                <line x1={padL} y1={yl.y} x2={width - padR} y2={yl.y} stroke="#1a2540" strokeWidth={1} strokeDasharray="4,4" />
                <text x={padL - 4} y={yl.y + 3} textAnchor="end" fontSize={9} fill="#64748b" fontFamily="monospace">
                  {yl.val.toFixed(1)}
                </text>
              </g>
            ))}
            {/* area */}
            {areaD && <path d={areaD} fill={color} opacity={0.08} />}
            {/* line */}
            <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} style={{ filter: `drop-shadow(0 0 3px ${color}60)` }} />
            {/* points */}
            {points.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r={2} fill={color} />
                {i === points.length - 1 && (
                  <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize={9} fill={color} fontFamily="monospace" fontWeight={600}>
                    {p.val.toFixed(1)}{unit}
                  </text>
                )}
              </g>
            ))}
            {/* x-axis labels (first, middle, last) */}
            {points.length > 0 && (
              <>
                <text x={points[0].x} y={height - 6} textAnchor="middle" fontSize={8} fill="#64748b" fontFamily="monospace">
                  {points[0].label}
                </text>
                {points.length > 2 && (
                  <text x={points[Math.floor(points.length / 2)].x} y={height - 6} textAnchor="middle" fontSize={8} fill="#64748b" fontFamily="monospace">
                    {points[Math.floor(points.length / 2)].label}
                  </text>
                )}
                <text x={points[points.length - 1].x} y={height - 6} textAnchor="middle" fontSize={8} fill="#64748b" fontFamily="monospace">
                  {points[points.length - 1].label}
                </text>
              </>
            )}
          </svg>
        )}
      </div>
    </div>
  );
}

/* ---------- KPI card ---------- */

function KpiCard({
  icon, label, value, sublabel, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel?: string;
  color: string;
}) {
  return (
    <div className="panel flex items-center gap-3 px-3 py-3" style={{ borderRadius: 4 }}>
      <div
        className="flex items-center justify-center"
        style={{ width: 40, height: 40, background: `${color}15`, border: `1px solid ${color}40`, borderRadius: 4, color, flexShrink: 0 }}
      >
        {icon}
      </div>
      <div className="flex flex-col">
        <span style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0', lineHeight: 1.1 }}>{value}</span>
        <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
        {sublabel && <span style={{ fontSize: 9, color, marginTop: 1 }}>{sublabel}</span>}
      </div>
    </div>
  );
}

/* ---------- main component ---------- */

export function AnalyticsPage() {
  const { machines, aiAnalysis } = useMonitoring();

  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [healthRecords, setHealthRecords] = useState<MachineHealth[]>([]);
  const [loading, setLoading] = useState(true);

  /* ----- fetch data ----- */
  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      // Fetch last 24h of sensor_snapshots (aggregate across machines)
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: snapData } = await supabase
        .from('sensor_snapshots')
        .select('temperature, vibration_rms, current, rpm, voltage, recorded_at')
        .gte('recorded_at', cutoff)
        .order('recorded_at', { ascending: true });

      // Group by hour and average
      if (snapData && snapData.length > 0) {
        const hourly: Record<string, any> = {};
        for (const row of snapData) {
          const d = new Date(row.recorded_at);
          const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}:00`;
          if (!hourly[key]) {
            hourly[key] = { recorded_at: row.recorded_at, temperature: 0, vibration_rms: 0, current: 0, rpm: 0, voltage: 0, count: 0 };
          }
          hourly[key].temperature += row.temperature || 0;
          hourly[key].vibration_rms += row.vibration_rms || 0;
          hourly[key].current += row.current || 0;
          hourly[key].rpm += row.rpm || 0;
          hourly[key].voltage += row.voltage || 0;
          hourly[key].count += 1;
        }
        const averaged = Object.values(hourly).map((h: any) => ({
          recorded_at: h.recorded_at,
          temperature: h.temperature / h.count,
          vibration_rms: h.vibration_rms / h.count,
          current: h.current / h.count,
          rpm: h.rpm / h.count,
          voltage: h.voltage / h.count,
        }));
        setSnapshots(averaged);
      } else {
        setSnapshots([]);
      }

      // Fetch machine_health records
      const { data: healthData } = await supabase
        .from('machine_health')
        .select('machine_id, user_id, rms_x, rms_y, temperature, current, rpm, voltage, health_score, status, updated_at')
        .order('updated_at', { ascending: false });

      setHealthRecords((healthData as MachineHealth[]) ?? []);
      setLoading(false);
    }
    fetchData();
  }, []);

  /* ----- KPIs ----- */
  const totalMachines = machines.length;
  const criticalMachines = machines.filter((m) => m.status === 'critical').length;
  const avgHealth = aiAnalysis ? Math.round(aiAnalysis.healthScore) : 0;
  const totalAlerts = machines.filter((m) => m.status === 'warning' || m.status === 'critical').length;

  /* ----- machine name lookup ----- */
  const machineNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of machines) map[m.id] = m.name;
    return map;
  }, [machines]);

  /* ----- unique machine health (latest per machine) ----- */
  const uniqueHealth = useMemo(() => {
    const seen = new Set<string>();
    const result: MachineHealth[] = [];
    for (const h of healthRecords) {
      if (!seen.has(h.machine_id)) {
        seen.add(h.machine_id);
        result.push(h);
      }
    }
    return result;
  }, [healthRecords]);

  /* ----- export ----- */
  function handleExport() {
    const rows: string[] = [];
    rows.push('Machine,Status,Health Score,Bearing Wear,Temperature (°C),Current (A),RPM,Updated At');
    for (const h of uniqueHealth) {
      const name = machineNames[h.machine_id] ?? h.machine_id;
      rows.push(`${name},${h.status},${h.health_score.toFixed(1)},${(h.rms_x + h.rms_y).toFixed(2)},${h.temperature.toFixed(1)},${h.current.toFixed(2)},${h.rpm},${new Date(h.updated_at).toISOString()}`);
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `veltrix-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const healthColor = (score: number) => (score >= 80 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444');
  const statusColor = (status: string) =>
    status === 'healthy' ? '#22c55e' : status === 'warning' ? '#eab308' : '#ef4444';

  /* ---------- render ---------- */

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ background: 'linear-gradient(180deg,#0d1525 0%,#080d14 100%)', borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-3">
          <TrendingUp size={20} style={{ color: 'var(--accent-cyan)' }} />
          <span className="text-sm font-semibold text-slate-200 tracking-wide">ANALYTICS &amp; REPORTS</span>
        </div>
        <button
          onClick={handleExport}
          className="btn-secondary flex items-center gap-1.5"
          style={{ fontSize: 11, padding: '5px 12px' }}
        >
          <Download size={13} /> Export CSV
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* KPI summary cards */}
        <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          <KpiCard icon={<Activity size={20} />} label="Total Machines" value={String(totalMachines)} color="#3b82f6" />
          <KpiCard icon={<TrendingUp size={20} />} label="Total Alerts" value={String(totalAlerts)} color="#eab308" />
          <KpiCard
            icon={<Gauge size={20} />}
            label="Avg Health Score"
            value={avgHealth > 0 ? `${avgHealth}%` : 'N/A'}
            sublabel={avgHealth >= 80 ? 'Healthy' : avgHealth >= 50 ? 'Warning' : 'Critical'}
            color={healthColor(avgHealth)}
          />
          <KpiCard icon={<Zap size={20} />} label="Critical Machines" value={String(criticalMachines)} color="#ef4444" />
        </div>

        {/* Charts */}
        <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(540px, 1fr))' }}>
          <TrendChart
            title="Temperature Trend"
            icon={<Thermometer size={13} />}
            data={snapshots}
            dataKey="temperature"
            color="#fb923c"
            unit="°C"
          />
          <TrendChart
            title="Current Trend"
            icon={<Zap size={13} />}
            data={snapshots}
            dataKey="current"
            color="#60a5fa"
            unit="A"
          />
          <TrendChart
            title="Vibration RMS Trend"
            icon={<Activity size={13} />}
            data={snapshots}
            dataKey="vibration_rms"
            color="#22d3ee"
            unit="g"
          />
        </div>

        {/* Machine health table */}
        <div className="panel" style={{ borderRadius: 4, overflow: 'hidden' }}>
          <div
            className="flex items-center justify-between px-3 py-1.5"
            style={{ background: 'linear-gradient(180deg,#151f33 0%,#0f1726 100%)', borderBottom: '1px solid var(--border-subtle)' }}
          >
            <span className="text-xs font-semibold text-slate-200">Machine Health Report</span>
            <span className="text-xs text-slate-500">{uniqueHealth.length} machines</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <span className="animate-spin" style={{ display: 'inline-block', width: 20, height: 20, border: '2px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%' }} />
            </div>
          ) : uniqueHealth.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-xs text-slate-600">
              No health data available. Start monitoring to collect data.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              {/* Table header */}
              <div
                className="flex items-center gap-3 px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide"
                style={{ background: '#0a1020', borderBottom: '1px solid var(--border-subtle)', minWidth: 800 }}
              >
                <span style={{ width: 160 }}>Machine</span>
                <span style={{ width: 80, textAlign: 'center' }}>Status</span>
                <span style={{ width: 90, textAlign: 'right' }}>Health Score</span>
                <span style={{ width: 90, textAlign: 'right' }}>Bearing Wear</span>
                <span style={{ width: 90, textAlign: 'right' }}>Temp (°C)</span>
                <span style={{ width: 80, textAlign: 'right' }}>Current (A)</span>
                <span style={{ width: 80, textAlign: 'right' }}>RPM</span>
                <span style={{ flex: 1, textAlign: 'right' }}>Updated</span>
              </div>

              {/* Rows */}
              {uniqueHealth.map((h) => {
                const name = machineNames[h.machine_id] ?? h.machine_id.slice(0, 8);
                const bearingWear = (h.rms_x + h.rms_y) / 2;
                return (
                  <div
                    key={h.machine_id}
                    className="flex items-center gap-3 px-3 py-2 text-xs"
                    style={{ borderBottom: '1px solid #0d1525', minWidth: 800 }}
                  >
                    <span style={{ width: 160 }} className="text-slate-200 font-medium truncate">{name}</span>
                    <span style={{ width: 80, textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: 9, padding: '2px 6px', borderRadius: 2,
                          background: `${statusColor(h.status)}15`, color: statusColor(h.status),
                          fontWeight: 600, textTransform: 'uppercase',
                        }}
                      >
                        {h.status}
                      </span>
                    </span>
                    <span style={{ width: 90, textAlign: 'right', fontFamily: 'monospace', color: healthColor(h.health_score), fontWeight: 600 }}>
                      {h.health_score.toFixed(1)}%
                    </span>
                    <span style={{ width: 90, textAlign: 'right', fontFamily: 'monospace', color: '#22d3ee' }}>
                      {bearingWear.toFixed(2)} g
                    </span>
                    <span style={{ width: 90, textAlign: 'right', fontFamily: 'monospace', color: '#fb923c' }}>
                      {h.temperature.toFixed(1)}
                    </span>
                    <span style={{ width: 80, textAlign: 'right', fontFamily: 'monospace', color: '#60a5fa' }}>
                      {h.current.toFixed(2)}
                    </span>
                    <span style={{ width: 80, textAlign: 'right', fontFamily: 'monospace', color: '#4ade80' }}>
                      {h.rpm}
                    </span>
                    <span style={{ flex: 1, textAlign: 'right', color: '#64748b' }}>
                      {new Date(h.updated_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AnalyticsPage;
