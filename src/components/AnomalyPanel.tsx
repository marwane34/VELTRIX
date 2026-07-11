import { Activity, AlertTriangle, ShieldCheck, Wrench, Thermometer, Zap, Clock, Lightbulb } from 'lucide-react';
import { useMonitoring } from '../contexts/MonitoringContext';

const COLORS = {
  bg: '#080d14',
  border: '#1e2d45',
  text: '#94a3b8',
  grid: '#1a2540',
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
  blue: '#3b82f6',
  cyan: '#06b6d4',
  orange: '#f97316',
};

function healthColor(score: number) {
  if (score > 70) return COLORS.green;
  if (score >= 40) return COLORS.yellow;
  return COLORS.red;
}

function statusBadge(status: string) {
  const map: Record<string, { color: string; label: string }> = {
    healthy: { color: COLORS.green, label: 'HEALTHY' },
    warning: { color: COLORS.yellow, label: 'WARNING' },
    critical: { color: COLORS.red, label: 'CRITICAL' },
  };
  const s = map[status] ?? map.healthy;
  return (
    <span
      className="px-2 py-0.5 text-[10px] font-bold tracking-wider"
      style={{ color: s.color, border: `1px solid ${s.color}`, background: `${s.color}15` }}
    >
      {s.label}
    </span>
  );
}

function MetricBar({ icon: Icon, label, value, color }: { icon: typeof Wrench; label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="flex items-center gap-1.5 text-[10px]" style={{ color: COLORS.text }}>
          <Icon size={11} />
          {label}
        </span>
        <span className="text-[11px] font-bold" style={{ color }}>
          {value}%
        </span>
      </div>
      <div style={{ height: 4, background: COLORS.grid, borderRadius: 2, overflow: 'hidden' }}>
        <div
          style={{
            width: `${Math.min(100, Math.max(0, value))}%`,
            height: '100%',
            background: color,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
}

export default function AnomalyPanel() {
  const { aiAnalysis } = useMonitoring();

  if (!aiAnalysis) {
    return (
      <div className="panel" style={{ background: COLORS.bg, padding: 12 }}>
        <span className="text-[10px] font-semibold tracking-wider" style={{ color: COLORS.text }}>
          AI ANOMALY DETECTION
        </span>
        <div className="flex items-center justify-center py-8 text-[11px]" style={{ color: COLORS.text }}>
          No data available
        </div>
      </div>
    );
  }

  const {
    healthScore,
    status,
    bearingWear,
    overheatRisk,
    failureRisk,
    rulHours,
    anomalies,
    recommendation,
  } = aiAnalysis;

  const hc = healthColor(healthScore);

  return (
    <div className="panel" style={{ background: COLORS.bg, padding: 0 }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-1.5"
        style={{ borderBottom: `1px solid ${COLORS.border}` }}
      >
        <span className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wider" style={{ color: COLORS.text }}>
          <Activity size={11} style={{ color: COLORS.cyan }} />
          AI ANOMALY DETECTION
        </span>
        {statusBadge(status)}
      </div>

      <div className="p-3 space-y-3">
        {/* Health Score */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center"
            style={{
              width: 56,
              height: 56,
              border: `2px solid ${hc}`,
              borderRadius: '50%',
              background: `${hc}10`,
              boxShadow: `0 0 12px ${hc}40`,
            }}
          >
            <span className="text-xl font-bold" style={{ color: hc }}>
              {healthScore}
            </span>
          </div>
          <div className="flex-1">
            <div className="text-[9px] tracking-wider" style={{ color: COLORS.text }}>
              HEALTH SCORE
            </div>
            <div className="text-[10px]" style={{ color: hc }}>
              {status === 'healthy' ? 'Optimal condition' : status === 'warning' ? 'Attention required' : 'Critical state'}
            </div>
            <div className="flex items-center gap-1 mt-1 text-[9px]" style={{ color: COLORS.text }}>
              <ShieldCheck size={10} style={{ color: hc }} />
              {healthScore > 70 ? 'No anomalies detected' : `${anomalies.length} anomaly(ies) detected`}
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="space-y-2">
          <MetricBar icon={Wrench} label="Bearing Wear" value={bearingWear} color={COLORS.orange} />
          <MetricBar icon={Thermometer} label="Overheat Risk" value={overheatRisk} color={COLORS.red} />
          <MetricBar icon={Zap} label="Failure Risk" value={failureRisk} color={COLORS.red} />
        </div>

        {/* RUL */}
        <div
          className="flex items-center justify-between px-2 py-1.5"
          style={{ background: COLORS.grid, border: `1px solid ${COLORS.border}` }}
        >
          <span className="flex items-center gap-1.5 text-[10px]" style={{ color: COLORS.text }}>
            <Clock size={11} style={{ color: COLORS.cyan }} />
            Remaining Useful Life
          </span>
          <span className="text-[12px] font-bold" style={{ color: COLORS.cyan }}>
            {rulHours.toLocaleString()} h
          </span>
        </div>

        {/* Anomalies */}
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold mb-1.5" style={{ color: COLORS.text }}>
            <AlertTriangle size={11} style={{ color: COLORS.yellow }} />
            ANOMALIES
          </div>
          {anomalies.length === 0 ? (
            <div className="text-[10px] px-2 py-1.5" style={{ color: COLORS.green, background: `${COLORS.green}10` }}>
              No anomalies detected
            </div>
          ) : (
            <div style={{ maxHeight: 100, overflowY: 'auto' }}>
              {anomalies.map((a, i) => (
                <div
                  key={i}
                  className="anomaly-log-item flex items-start gap-1.5"
                  style={{ color: COLORS.text }}
                >
                  <span style={{ color: COLORS.yellow }}>•</span>
                  <span>{a}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recommendation */}
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold mb-1.5" style={{ color: COLORS.text }}>
            <Lightbulb size={11} style={{ color: COLORS.blue }} />
            RECOMMENDATION
          </div>
          <div
            className="text-[10px] leading-relaxed px-2 py-1.5"
            style={{
              color: COLORS.text,
              background: `${COLORS.blue}08`,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            {recommendation}
          </div>
        </div>
      </div>
    </div>
  );
}
