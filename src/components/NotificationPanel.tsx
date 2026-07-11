import { useEffect, useRef } from 'react';
import { X, Bell, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { useMonitoring } from '../contexts/MonitoringContext';
import type { AlertSeverity } from '../types';

interface Props {
  onClose: () => void;
}

const severityConfig: Record<AlertSeverity, { color: string; Icon: typeof Info }> = {
  info: { color: '#3b82f6', Icon: Info },
  warning: { color: '#eab308', Icon: AlertTriangle },
  critical: { color: '#ef4444', Icon: AlertCircle },
};

function fmtTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

const typeLabels: Record<string, string> = {
  bearing_wear: 'Bearing Wear',
  overheating: 'Overheating',
  abnormal_vibration: 'Abnormal Vibration',
  current_spike: 'Current Spike',
  rpm_anomaly: 'RPM Anomaly',
};

/**
 * Slide-in notification panel anchored to the right edge. Lists recent alerts
 * with severity icons, type, message and timestamp, and marks them read on
 * open via `markAlertsRead`.
 */
export default function NotificationPanel({ onClose }: Props) {
  const { recentAlerts, markAlertsRead } = useMonitoring();
  const markedRef = useRef(false);

  useEffect(() => {
    if (markedRef.current) return;
    markedRef.current = true;
    markAlertsRead();
  }, [markAlertsRead]);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 z-50 flex flex-col"
        style={{
          width: 360,
          maxWidth: '90vw',
          height: '100vh',
          background: '#0e1726',
          borderLeft: '1px solid #1e2d45',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.6)',
          animation: 'panel-slide-in 0.25s ease',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #1e2d45', background: 'linear-gradient(180deg,#151f33 0%,#0f1726 100%)' }}>
          <div className="flex items-center gap-2">
            <Bell size={14} className="text-blue-400" />
            <span className="text-xs font-semibold text-slate-200 tracking-wide">NOTIFICATIONS</span>
            {recentAlerts.length > 0 && (
              <span className="px-1.5 py-0.5 text-[9px] font-semibold text-slate-300" style={{ background: '#1a2540', border: '1px solid #2a3f60' }}>
                {recentAlerts.length}
              </span>
            )}
          </div>
          <button onClick={onClose}><X size={14} className="text-slate-500 hover:text-slate-300" /></button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {recentAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <Bell size={24} className="text-slate-600" />
              <span className="text-xs text-slate-500">No alerts</span>
            </div>
          ) : (
            <div className="flex flex-col">
              {recentAlerts.map((a, i) => {
                const cfg = severityConfig[a.severity] ?? severityConfig.info;
                return (
                  <div
                    key={a.id}
                    className="flex items-start gap-2.5 px-3 py-2.5"
                    style={{ borderBottom: '1px solid #141e30', background: i % 2 === 0 ? 'transparent' : 'rgba(30,45,69,0.2)' }}
                  >
                    <div className="flex-shrink-0 mt-0.5" style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${cfg.color}1a`, border: `1px solid ${cfg.color}40` }}>
                      <cfg.Icon size={12} style={{ color: cfg.color }} />
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold tracking-wide" style={{ color: cfg.color }}>
                          {typeLabels[a.type] ?? a.type}
                        </span>
                        {!a.is_read && <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />}
                      </div>
                      <span className="text-[11px] text-slate-300 leading-snug">{a.message}</span>
                      <span className="text-[9px] text-slate-500">{fmtTime(a.created_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5" style={{ borderTop: '1px solid #1e2d45', background: '#0d1220' }}>
          <button className="btn-secondary w-full" onClick={onClose}>Close</button>
        </div>
      </div>
    </>
  );
}
