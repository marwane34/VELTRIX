import { Activity, AlertTriangle, ShieldCheck, Wrench, Gauge, Flame, Zap, Clock, Lightbulb } from 'lucide-react';
import { useMonitoring } from '../contexts/MonitoringContext';
import type { HealthStatus } from '../types';

const statusConfig: Record<HealthStatus, { label: string; color: string; bg: string; Icon: typeof ShieldCheck }> = {
  healthy: { label: 'HEALTHY', color: '#4ade80', bg: 'rgba(34,197,94,0.12)', Icon: ShieldCheck },
  warning: { label: 'WARNING', color: '#facc15', bg: 'rgba(234,179,8,0.12)', Icon: AlertTriangle },
  critical: { label: 'CRITICAL', color: '#f87171', bg: 'rgba(239,68,68,0.12)', Icon: AlertTriangle },
};

function scoreColor(score: number) {
  if (score > 70) return '#22c55e';
  if (score >= 40) return '#eab308';
  return '#ef4444';
}

/**
 * AI health analysis panel: circular health-score gauge, status badge,
 * bearing/overheat/failure risk metric cards, RUL, anomalies list and a
 * recommendation block. Reads `aiAnalysis` from the monitoring context.
 */
export default function AnomalyPanel() {
  const { aiAnalysis } = useMonitoring();

  if (!aiAnalysis) {
    return (
      <div className="panel flex flex-col items-center justify-center" style={{ height: '100%' }}>
        <Activity size={28} className="text-slate-600 mb-2" />
        <span className="text-xs text-slate-500">Select a machine to view AI analysis</span>
      </div>
    );
  }

  const { healthScore, status, bearingWear, overheatRisk, failureRisk, rulHours, anomalies, recommendation } = aiAnalysis;
  const sc = statusConfig[status];
  const ringColor = scoreColor(healthScore);

  // Circular gauge geometry
  const size = 96;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (healthScore / 100) * c;

  const metrics = [
    { label: 'Bearing Wear', value: bearingWear, unit: '%', Icon: Wrench, color: bearingWear > 60 ? '#f87171' : bearingWear > 40 ? '#facc15' : '#4ade80' },
    { label: 'Overheat Risk', value: overheatRisk, unit: '%', Icon: Flame, color: overheatRisk > 60 ? '#f87171' : overheatRisk > 40 ? '#facc15' : '#4ade80' },
    { label: 'Failure Risk', value: failureRisk, unit: '%', Icon: Zap, color: failureRisk > 60 ? '#f87171' : failureRisk > 40 ? '#facc15' : '#4ade80' },
  ];

  return (
    <div className="panel flex flex-col" style={{ height: '100%' }}>
      <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid #1e2d45' }}>
        <Activity size={13} className="text-blue-400" />
        <span className="text-xs font-semibold text-slate-200 tracking-wide">AI HEALTH ANALYSIS</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {/* Gauge + status */}
        <div className="flex items-center gap-4">
          <div className="relative" style={{ width: size, height: size, flexShrink: 0 }}>
            <svg width={size} height={size}>
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1a2540" strokeWidth={stroke} />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={ringColor}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ transition: 'stroke-dashoffset 0.4s ease, stroke 0.4s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold" style={{ color: ringColor }}>{healthScore}</span>
              <span className="text-[9px] text-slate-500 tracking-wide">SCORE</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1" style={{ background: sc.bg, border: `1px solid ${sc.color}40` }}>
              <sc.Icon size={12} style={{ color: sc.color }} />
              <span className="text-[10px] font-semibold tracking-wide" style={{ color: sc.color }}>{sc.label}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <Clock size={11} className="text-slate-500" />
              <span>RUL:</span>
              <span className="font-semibold val-cyan">{rulHours} h</span>
            </div>
          </div>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-3 gap-2">
          {metrics.map((m) => (
            <div key={m.label} className="p-2" style={{ background: '#0e1726', border: '1px solid #1e2d45' }}>
              <div className="flex items-center gap-1 mb-1">
                <m.Icon size={10} style={{ color: m.color }} />
                <span className="text-[9px] text-slate-400 truncate">{m.label}</span>
              </div>
              <div className="flex items-baseline gap-0.5">
                <span className="text-base font-bold" style={{ color: m.color }}>{m.value}</span>
                <span className="text-[9px] text-slate-500">{m.unit}</span>
              </div>
              <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background: '#1a2540' }}>
                <div style={{ width: `${m.value}%`, height: '100%', background: m.color, transition: 'width 0.4s ease' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Anomalies */}
        <div>
          <div className="flex items-center gap-1 mb-1.5">
            <Gauge size={11} className="text-slate-400" />
            <span className="text-[10px] font-semibold text-slate-300 tracking-wide">DETECTED ANOMALIES</span>
          </div>
          {anomalies.length === 0 ? (
            <div className="text-[10px] text-slate-500 px-2 py-1.5" style={{ background: '#0e1726', border: '1px solid #1e2d45' }}>
              No anomalies detected
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {anomalies.map((a, i) => (
                <div key={i} className="flex items-start gap-1.5 px-2 py-1.5" style={{ background: '#0e1726', border: '1px solid #1e2d45' }}>
                  <AlertTriangle size={10} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                  <span className="text-[10px] text-slate-300 leading-tight">{a}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recommendation */}
        <div>
          <div className="flex items-center gap-1 mb-1.5">
            <Lightbulb size={11} className="text-slate-400" />
            <span className="text-[10px] font-semibold text-slate-300 tracking-wide">RECOMMENDATION</span>
          </div>
          <div className="px-2 py-1.5 text-[10px] leading-relaxed" style={{ background: '#0e1726', border: '1px solid #1e2d45', color: sc.color }}>
            {recommendation}
          </div>
        </div>
      </div>
    </div>
  );
}
