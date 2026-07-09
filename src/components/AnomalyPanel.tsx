import { AlertTriangle, CheckCircle, List } from 'lucide-react';
import { useMonitoring } from '../contexts/MonitoringContext';

export function AnomalyPanel() {
  const { aiAnalysis, recentAlerts, machines } = useMonitoring();

  function machineName(id: string) { return machines.find((m) => m.id === id)?.name ?? 'Machine'; }
  function formatTime(ts: string) {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
  }

  const isWarning = aiAnalysis?.status === 'warning';
  const isCritical = aiAnalysis?.status === 'critical';
  const hasAnomaly = isWarning || isCritical;

  return (
    <div
      className="flex flex-col"
      style={{ width: 250, minWidth: 250, borderLeft: '1px solid #1e2d45', background: '#0e1420' }}
    >
      {/* Main anomaly detection section */}
      <div className="px-3 py-2" style={{ borderBottom: '1px solid #1e2d45' }}>
        <div className="text-sm font-semibold text-slate-200 mb-2">Anomaly Detection</div>

        {/* Status box */}
        <div
          className="flex items-center gap-2 px-2 py-2 mb-3"
          style={hasAnomaly ? {
            background: isCritical ? 'linear-gradient(135deg,#1a0000 0%,#2a0a0a 100%)' : 'linear-gradient(135deg,#1a1500 0%,#2a1f00 100%)',
            border: `1px solid ${isCritical ? '#7f1d1d' : '#ca8a04'}`,
            borderLeft: `3px solid ${isCritical ? '#ef4444' : '#eab308'}`,
          } : {
            background: 'linear-gradient(135deg,#001a00 0%,#0a1a0a 100%)',
            border: '1px solid #14532d',
            borderLeft: '3px solid #22c55e',
          }}
        >
          <AlertTriangle
            size={14}
            className={isCritical ? 'text-red-400 shrink-0' : isWarning ? 'text-yellow-400 shrink-0' : 'text-green-400 shrink-0'}
          />
          <span
            className="text-xs font-semibold"
            style={{ color: isCritical ? '#fca5a5' : isWarning ? '#fde047' : '#86efac' }}
          >
            {isCritical ? 'CRITICAL: Immediate Action Required'
              : isWarning ? `Warning: ${aiAnalysis?.anomalies[0] ?? 'Anomaly Detected'}`
              : 'System Operating Normally'}
          </span>
        </div>

        {/* Status details */}
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Status:</span>
            {hasAnomaly
              ? <><AlertTriangle size={11} className={isCritical ? 'text-red-400' : 'text-yellow-400'} />
                <span className="font-semibold" style={{ color: isCritical ? '#f87171' : '#facc15' }}>
                  {isCritical ? 'Critical' : 'Warning'}
                </span></>
              : <><CheckCircle size={11} className="text-green-400" /><span className="text-green-400 font-semibold">Healthy</span></>
            }
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Vibration Alert:</span>
            <span className="text-slate-200 font-medium">
              {aiAnalysis && aiAnalysis.bearingWear > 35 ? '2x RPM Detected' : 'Normal'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Temperature:</span>
            <span
              className="font-medium"
              style={{ color: aiAnalysis && aiAnalysis.overheatRisk > 30 ? '#f87171' : '#4ade80' }}
            >
              {aiAnalysis && aiAnalysis.overheatRisk > 30 ? 'Elevated' : 'Normal'}
            </span>
          </div>
          {aiAnalysis && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Health:</span>
              <span className="font-bold" style={{ color: aiAnalysis.healthScore >= 70 ? '#4ade80' : aiAnalysis.healthScore >= 40 ? '#facc15' : '#f87171' }}>
                {aiAnalysis.healthScore}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Anomaly log */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-3 py-1.5" style={{ borderBottom: '1px solid #1e2d45' }}>
          <span className="text-xs font-semibold text-slate-200">Anomaly Detection</span>
          <List size={12} className="text-slate-500" />
        </div>

        <div className="flex-1 overflow-y-auto">
          {recentAlerts.length === 0 ? (
            <div className="px-3 py-4 text-xs text-slate-600 text-center">No recent events</div>
          ) : (
            recentAlerts.slice(0, 10).map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-1.5 px-2 py-1.5"
                style={{ borderBottom: '1px solid #1a2540' }}
              >
                <span className="text-slate-500 shrink-0 mt-0.5" style={{ fontSize: 9 }}>{formatTime(alert.created_at)}</span>
                {alert.severity === 'critical'
                  ? <AlertTriangle size={10} className="text-red-400 mt-0.5 shrink-0" />
                  : alert.severity === 'warning'
                  ? <AlertTriangle size={10} className="text-yellow-400 mt-0.5 shrink-0" />
                  : <CheckCircle size={10} className="text-green-400 mt-0.5 shrink-0" />}
                <span style={{ fontSize: 10 }} className="text-slate-300">
                  <span className="font-medium">{machineName(alert.machine_id)}:</span>{' '}
                  <span className="text-slate-400">{alert.message.length > 25 ? alert.message.slice(0, 25) + '...' : alert.message}</span>
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
