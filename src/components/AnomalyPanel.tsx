import { useMemo } from 'react';
import { Activity, TriangleAlert as AlertTriangle, OctagonAlert as AlertOctagon, CircleCheck as CheckCircle, Wrench, Clock } from 'lucide-react';
import { useMonitoring } from '../contexts/MonitoringContext';

export default function AnomalyPanel() {
  const { aiAnalysis } = useMonitoring();

  const gaugeColor = useMemo(() => {
    if (!aiAnalysis) return '#64748b';
    if (aiAnalysis.healthScore > 70) return '#22c55e';
    if (aiAnalysis.healthScore >= 40) return '#eab308';
    return '#ef4444';
  }, [aiAnalysis]);

  const statusBadge = useMemo(() => {
    if (!aiAnalysis) return { text: 'NO DATA', color: '#64748b', icon: Activity };
    switch (aiAnalysis.status) {
      case 'healthy':
        return { text: 'HEALTHY', color: '#22c55e', icon: CheckCircle };
      case 'warning':
        return { text: 'WARNING', color: '#eab308', icon: AlertTriangle };
      case 'critical':
        return { text: 'CRITICAL', color: '#ef4444', icon: AlertOctagon };
      default:
        return { text: 'UNKNOWN', color: '#64748b', icon: Activity };
    }
  }, [aiAnalysis]);

  // Gauge arc calculation
  const gaugeAngle = aiAnalysis ? (aiAnalysis.healthScore / 100) * 180 : 0;
  const gaugeRadius = 50;
  const cx = 70;
  const cy = 55;

  const polarToCartesian = (centerX: number, centerY: number, r: number, angleDeg: number) => {
    const rad = (angleDeg - 180) * (Math.PI / 180);
    return { x: centerX + r * Math.cos(rad), y: centerY + r * Math.sin(rad) };
  };

  const arcPath = useMemo(() => {
    const start = polarToCartesian(cx, cy, gaugeRadius, 0);
    const end = polarToCartesian(cx, cy, gaugeRadius, gaugeAngle);
    const largeArc = gaugeAngle > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${gaugeRadius} ${gaugeRadius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  }, [gaugeAngle]);

  const bgArcPath = useMemo(() => {
    const start = polarToCartesian(cx, cy, gaugeRadius, 0);
    const end = polarToCartesian(cx, cy, gaugeRadius, 180);
    return `M ${start.x} ${start.y} A ${gaugeRadius} ${gaugeRadius} 0 1 1 ${end.x} ${end.y}`;
  }, []);

  const StatusIcon = statusBadge.icon;

  return (
    <div className="panel" style={{ borderRadius: 4, overflow: 'hidden', height: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 12px', borderBottom: '1px solid #1e2d45',
        background: 'linear-gradient(180deg, #111827 0%, #0d1220 100%)',
      }}>
        <Activity size={14} color="#06b6d4" />
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', color: '#94a3b8' }}>
          AI HEALTH ANALYSIS
        </span>
      </div>

      {!aiAnalysis ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 12 }}>
          No machine selected
        </div>
      ) : (
        <div style={{ padding: '12px' }}>
          {/* Health Score Gauge */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <svg width={140} height={70} viewBox="0 0 140 70">
              {/* Background arc */}
              <path d={bgArcPath} fill="none" stroke="#1a2540" strokeWidth={8} strokeLinecap="round" />
              {/* Value arc */}
              <path d={arcPath} fill="none" stroke={gaugeColor} strokeWidth={8} strokeLinecap="round" />
              {/* Score text */}
              <text x={cx} y={cy + 2} textAnchor="middle" fontSize={22} fontWeight={700} fill={gaugeColor}>
                {aiAnalysis.healthScore}
              </text>
              <text x={cx} y={cy + 16} textAnchor="middle" fontSize={8} fill="#64748b">
                HEALTH SCORE
              </text>
            </svg>

            {/* Status Badge */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 4,
                background: `${statusBadge.color}15`,
                border: `1px solid ${statusBadge.color}`,
                color: statusBadge.color,
                fontSize: 11, fontWeight: 700, letterSpacing: '0.5px',
              }}>
                <StatusIcon size={12} />
                {statusBadge.text}
              </div>
              <div style={{ fontSize: 9, color: '#64748b' }}>
                System Status
              </div>
            </div>
          </div>

          {/* Risk Metrics */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8,
            marginTop: 14,
          }}>
            <RiskCard label="Bearing Wear" value={aiAnalysis.bearingWear} unit="%" color="#f97316" />
            <RiskCard label="Overheat Risk" value={aiAnalysis.overheatRisk} unit="%" color="#ef4444" />
            <RiskCard label="Failure Risk" value={aiAnalysis.failureRisk} unit="%" color="#dc2626" />
          </div>

          {/* RUL */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginTop: 12, padding: '8px 10px',
            background: '#080d14', borderRadius: 4,
            border: '1px solid #1e2d45',
          }}>
            <Clock size={14} color="#3b82f6" />
            <span style={{ fontSize: 10, color: '#94a3b8' }}>Remaining Useful Life:</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#60a5fa' }}>
              {aiAnalysis.rulHours.toLocaleString()} h
            </span>
          </div>

          {/* Anomalies List */}
          <div style={{ marginTop: 12 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 10, fontWeight: 600, color: '#94a3b8',
              marginBottom: 6, letterSpacing: '0.5px',
            }}>
              <AlertTriangle size={12} color="#eab308" />
              DETECTED ANOMALIES
            </div>
            <div style={{
              background: '#080d14', borderRadius: 4,
              border: '1px solid #1e2d45', maxHeight: 100, overflowY: 'auto',
            }}>
              {aiAnalysis.anomalies.length === 0 ? (
                <div style={{ padding: '8px 10px', fontSize: 10, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle size={12} />
                  No anomalies detected
                </div>
              ) : (
                aiAnalysis.anomalies.map((anomaly, i) => (
                  <div key={i} className="anomaly-log-item" style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                    <span style={{ color: '#eab308', fontSize: 10 }}>⚠</span>
                    <span style={{ color: '#cbd5e1', fontSize: 10.5, lineHeight: 1.3 }}>{anomaly}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recommendation */}
          <div style={{
            marginTop: 12, padding: '10px',
            background: `${gaugeColor}08`,
            border: `1px solid ${gaugeColor}40`,
            borderRadius: 4,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 10, fontWeight: 600, color: gaugeColor,
              marginBottom: 4, letterSpacing: '0.5px',
            }}>
              <Wrench size={12} />
              RECOMMENDATION
            </div>
            <div style={{ fontSize: 10.5, color: '#cbd5e1', lineHeight: 1.4 }}>
              {aiAnalysis.recommendation}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RiskCard({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div style={{
      padding: '8px',
      background: '#080d14',
      borderRadius: 4,
      border: '1px solid #1e2d45',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 9, color: '#64748b', marginBottom: 4, letterSpacing: '0.3px' }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color }}>
        {value}{unit}
      </div>
      <div style={{
        marginTop: 4, height: 3, borderRadius: 2,
        background: '#1a2540', overflow: 'hidden',
      }}>
        <div style={{
          width: `${Math.min(100, value)}%`, height: '100%',
          background: color, borderRadius: 2,
        }} />
      </div>
    </div>
  );
}
