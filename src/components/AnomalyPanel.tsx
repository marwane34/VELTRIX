import { Activity, ShieldCheck, AlertTriangle, AlertOctagon, Thermometer, Wrench, Cpu } from 'lucide-react';
import { useMonitoring } from '../contexts/MonitoringContext';

const RADIUS = 34;
const STROKE = 7;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Circular gauge rendering the health score (green >70, yellow 40-70, red <40). */
function HealthGauge({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const color = score > 70 ? '#22c55e' : score > 40 ? '#eab308' : '#ef4444';
  const offset = CIRCUMFERENCE - (clamped / 100) * CIRCUMFERENCE;
  const size = (RADIUS + STROKE) * 2 + 4;
  const center = size / 2;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={center} cy={center} r={RADIUS} fill="none" stroke="#1a2540" strokeWidth={STROKE} />
        <circle cx={center} cy={center} r={RADIUS} fill="none" stroke={color} strokeWidth={STROKE}
          strokeDasharray={CIRCUMFERENCE} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }} />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-bold leading-none" style={{ fontSize: 22, color }}>{Math.round(clamped)}</span>
        <span className="text-[8px] tracking-wider" style={{ color: '#64748b', marginTop: 2 }}>SCORE</span>
      </div>
    </div>
  );
}

function StatPill({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: typeof Activity; color: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-2 py-2" style={{ background: '#0a1220', border: '1px solid #1a2540', flex: 1, minWidth: 0 }}>
      <Icon size={12} style={{ color, marginBottom: 4 }} />
      <span className="font-bold leading-none" style={{ fontSize: 13, color }}>{value}</span>
      <span className="text-[8px] tracking-wider text-center truncate w-full" style={{ color: '#64748b', marginTop: 3 }}>{label}</span>
    </div>
  );
}

/**
 * AnomalyPanel — AI health analysis panel.
 * Shows circular gauge, status badge, bearing wear %, overheat risk %,
 * failure risk %, RUL hours, anomalies list, and recommendation.
 */
export default function AnomalyPanel() {
  const { aiAnalysis } = useMonitoring();

  const statusConfig = aiAnalysis
    ? aiAnalysis.status === 'healthy'
      ? { label: 'HEALTHY', icon: ShieldCheck, color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: '#22c55e' }
      : aiAnalysis.status === 'warning'
      ? { label: 'WARNING', icon: AlertTriangle, color: '#eab308', bg: 'rgba(234,179,8,0.12)', border: '#eab308' }
      : { label: 'CRITICAL', icon: AlertOctagon, color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: '#ef4444' }
    : null;

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="flex items-center justify-between px-3" style={{ height: 28, borderBottom: '1px solid #1e2d45', background: 'linear-gradient(180deg,#151f33 0%,#0f1726 100%)', flexShrink: 0 }}>
        <div className="flex items-center gap-2">
          <Cpu size={13} style={{ color: '#3b82f6' }} />
          <span className="text-[11px] font-semibold tracking-wider" style={{ color: '#c8d6ea' }}>AI HEALTH ANALYSIS</span>
        </div>
        {statusConfig && (
          <span className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold tracking-wider"
            style={{ color: statusConfig.color, background: statusConfig.bg, border: `1px solid ${statusConfig.border}40`, borderRadius: 2 }}>
            <statusConfig.icon size={10} /> {statusConfig.label}
          </span>
        )}
      </div>

      {!aiAnalysis ? (
        <div className="flex flex-col items-center justify-center gap-2" style={{ flex: 1, padding: 24 }}>
          <Activity size={28} className="text-slate-600" />
          <span className="text-xs text-slate-500 text-center">No machine selected.<br />Select a machine to view AI analysis.</span>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }} className="flex flex-col gap-3">
          {/* Gauge + metrics */}
          <div className="flex items-center gap-4">
            <HealthGauge score={aiAnalysis.healthScore} />
            <div className="flex flex-col gap-1.5" style={{ flex: 1 }}>
              <div className="flex flex-col">
                <span className="text-[9px] tracking-wider" style={{ color: '#64748b' }}>REMAINING USEFUL LIFE</span>
                <span className="font-bold val-blue" style={{ fontSize: 16 }}>{aiAnalysis.rulHours.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">hrs</span></span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] tracking-wider" style={{ color: '#64748b' }}>STATUS</span>
                <span className="font-semibold text-[11px]" style={{ color: statusConfig!.color }}>{statusConfig!.label}</span>
              </div>
            </div>
          </div>

          {/* Risk stat pills */}
          <div className="flex gap-2">
            <StatPill label="BEARING WEAR" value={`${aiAnalysis.bearingWear}%`} icon={Wrench} color={aiAnalysis.bearingWear > 60 ? '#ef4444' : aiAnalysis.bearingWear > 30 ? '#eab308' : '#22c55e'} />
            <StatPill label="OVERHEAT RISK" value={`${aiAnalysis.overheatRisk}%`} icon={Thermometer} color={aiAnalysis.overheatRisk > 60 ? '#ef4444' : aiAnalysis.overheatRisk > 30 ? '#eab308' : '#22c55e'} />
            <StatPill label="FAILURE RISK" value={`${aiAnalysis.failureRisk}%`} icon={AlertOctagon} color={aiAnalysis.failureRisk > 60 ? '#ef4444' : aiAnalysis.failureRisk > 30 ? '#eab308' : '#22c55e'} />
          </div>

          {/* Anomalies */}
          <div className="flex flex-col" style={{ flex: '0 0 auto' }}>
            <span className="text-[9px] font-semibold tracking-wider mb-1.5" style={{ color: '#94a3b8' }}>DETECTED ANOMALIES</span>
            {aiAnalysis.anomalies.length === 0 ? (
              <div className="flex items-center gap-1.5 px-2 py-2" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <ShieldCheck size={11} style={{ color: '#22c55e' }} />
                <span className="text-[10px]" style={{ color: '#4ade80' }}>No anomalies detected</span>
              </div>
            ) : (
              <div style={{ background: '#0a1220', border: '1px solid #1a2540', maxHeight: 120, overflowY: 'auto' }}>
                {aiAnalysis.anomalies.map((a, i) => (
                  <div key={i} className="anomaly-log-item flex items-start gap-2">
                    <AlertTriangle size={10} style={{ color: '#eab308', marginTop: 1, flexShrink: 0 }} />
                    <span className="text-slate-300" style={{ lineHeight: 1.3 }}>{a}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recommendation */}
          <div className="flex flex-col" style={{ flex: '0 0 auto' }}>
            <span className="text-[9px] font-semibold tracking-wider mb-1.5" style={{ color: '#94a3b8' }}>RECOMMENDATION</span>
            <div className="flex items-start gap-2 px-2.5 py-2"
              style={{ background: statusConfig!.color === '#22c55e' ? 'rgba(34,197,94,0.06)' : statusConfig!.color === '#eab308' ? 'rgba(234,179,8,0.06)' : 'rgba(239,68,68,0.06)',
                border: `1px solid ${statusConfig!.color}30`, borderRadius: 2 }}>
              <Wrench size={12} style={{ color: statusConfig!.color, marginTop: 1, flexShrink: 0 }} />
              <span className="text-[10.5px]" style={{ color: '#c8d6ea', lineHeight: 1.4 }}>{aiAnalysis.recommendation}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
