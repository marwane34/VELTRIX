import { useEffect } from 'react';
import { X, Bell, Info, AlertTriangle, AlertOctagon, CheckCircle2 } from 'lucide-react';
import { useMonitoring } from '../contexts/MonitoringContext';
import type { Alert, AlertSeverity, AlertType } from '../types';

interface NotificationPanelProps {
  onClose: () => void;
}

const severityConfig: Record<AlertSeverity, { icon: typeof Info; color: string; bg: string; label: string }> = {
  info: { icon: Info, color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', label: 'INFO' },
  warning: { icon: AlertTriangle, color: '#eab308', bg: 'rgba(234,179,8,0.08)', label: 'WARN' },
  critical: { icon: AlertOctagon, color: '#ef4444', bg: 'rgba(239,68,68,0.08)', label: 'CRIT' },
};

const typeLabel: Record<AlertType, string> = {
  bearing_wear: 'Bearing Wear',
  overheating: 'Overheating',
  abnormal_vibration: 'Abnormal Vibration',
  current_spike: 'Current Spike',
  rpm_anomaly: 'RPM Anomaly',
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function AlertRow({ alert }: { alert: Alert }) {
  const cfg = severityConfig[alert.severity];
  return (
    <div className="flex items-start gap-2.5 px-3 py-2.5" style={{ borderBottom: '1px solid #1a2540', background: alert.is_read ? 'transparent' : cfg.bg }}>
      <cfg.icon size={14} style={{ color: cfg.color, marginTop: 1, flexShrink: 0 }} />
      <div className="flex flex-col gap-0.5" style={{ flex: 1, minWidth: 0 }}>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold tracking-wider" style={{ color: cfg.color }}>{cfg.label}</span>
          <span className="text-[9px] text-slate-600">•</span>
          <span className="text-[10px]" style={{ color: '#94a3b8' }}>{typeLabel[alert.type]}</span>
          {!alert.is_read && <span className="ml-auto" style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />}
        </div>
        <span className="text-[11px]" style={{ color: '#c8d6ea', lineHeight: 1.35 }}>{alert.message}</span>
        <span className="text-[9px]" style={{ color: '#64748b' }}>{formatTimestamp(alert.created_at)}</span>
      </div>
    </div>
  );
}

/**
 * NotificationPanel — slide-in panel from the right showing recent alerts.
 * Uses useMonitoring() for recentAlerts and markAlertsRead.
 */
export default function NotificationPanel({ onClose }: NotificationPanelProps) {
  const { recentAlerts, markAlertsRead, unreadCount } = useMonitoring();

  // Mark alerts as read shortly after opening.
  useEffect(() => {
    if (unreadCount > 0) {
      const t = setTimeout(() => { void markAlertsRead(); }, 800);
      return () => clearTimeout(t);
    }
  }, [unreadCount, markAlertsRead]);

  // Close on Escape.
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const critCount = recentAlerts.filter((a) => a.severity === 'critical').length;
  const warnCount = recentAlerts.filter((a) => a.severity === 'warning').length;

  return (
    <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div
        className="absolute top-0 right-0 h-full flex flex-col"
        style={{ width: 340, background: '#0e1726', borderLeft: '1px solid #2a3f60', boxShadow: '-8px 0 40px rgba(0,0,0,0.6)', animation: 'panel-slide-in 0.25s ease' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #1e2d45', background: 'linear-gradient(180deg,#151f33 0%,#0f1726 100%)', flexShrink: 0 }}>
          <div className="flex items-center gap-2">
            <Bell size={14} style={{ color: '#3b82f6' }} />
            <span className="text-xs font-semibold text-slate-200 tracking-wide">NOTIFICATIONS</span>
            {unreadCount > 0 && (
              <span className="text-[9px] font-bold px-1.5 py-0.5" style={{ color: '#fff', background: '#ef4444', borderRadius: 8 }}>{unreadCount}</span>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={14} className="text-slate-500 hover:text-slate-300" />
          </button>
        </div>

        {/* Summary bar */}
        {recentAlerts.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2" style={{ borderBottom: '1px solid #1a2540', background: '#0a1220', flexShrink: 0 }}>
            <span className="flex items-center gap-1 text-[10px]" style={{ color: '#f87171' }}>
              <AlertOctagon size={11} /> {critCount} critical
            </span>
            <span className="flex items-center gap-1 text-[10px]" style={{ color: '#facc15' }}>
              <AlertTriangle size={11} /> {warnCount} warning
            </span>
            <span className="flex items-center gap-1 text-[10px] ml-auto" style={{ color: '#64748b' }}>
              {recentAlerts.length} total
            </span>
          </div>
        )}

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {recentAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2" style={{ height: '100%', padding: 32 }}>
              <CheckCircle2 size={28} style={{ color: '#22c55e', opacity: 0.5 }} />
              <span className="text-xs text-slate-500 text-center">All clear.<br />No alerts to display.</span>
            </div>
          ) : (
            recentAlerts.map((a) => <AlertRow key={a.id} alert={a} />)
          )}
        </div>

        {/* Footer */}
        {recentAlerts.length > 0 && (
          <div className="px-4 py-2.5" style={{ borderTop: '1px solid #1e2d45', background: '#0a1220', flexShrink: 0 }}>
            <button onClick={onClose} className="btn-secondary w-full">Close</button>
          </div>
        )}
      </div>
    </div>
  );
}
