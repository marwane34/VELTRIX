import { X, Bell, TriangleAlert as AlertTriangle, CircleAlert as AlertCircle, Info } from 'lucide-react';
import { useMonitoring } from '../contexts/MonitoringContext';
import type { Alert, AlertSeverity } from '../types';

interface NotificationPanelProps {
  onClose: () => void;
}

const COLORS = {
  border: '#1e2d45',
  text: '#94a3b8',
  grid: '#1a2540',
};

function severityIcon(severity: AlertSeverity) {
  if (severity === 'critical') return AlertCircle;
  if (severity === 'warning') return AlertTriangle;
  return Info;
}

function severityColor(severity: AlertSeverity) {
  if (severity === 'critical') return '#ef4444';
  if (severity === 'warning') return '#eab308';
  return '#3b82f6';
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
}

function AlertRow({ alert }: { alert: Alert }) {
  const Icon = severityIcon(alert.severity);
  const color = severityColor(alert.severity);

  return (
    <div
      className="flex items-start gap-2 px-3 py-2.5"
      style={{ borderBottom: `1px solid ${COLORS.grid}` }}
    >
      <div
        className="flex-shrink-0 flex items-center justify-center"
        style={{ width: 24, height: 24, background: `${color}15`, border: `1px solid ${color}40` }}
      >
        <Icon size={12} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold tracking-wide uppercase" style={{ color }}>
            {alert.severity}
          </span>
          <span className="text-[9px]" style={{ color: COLORS.text }}>
            {formatTime(alert.created_at)}
          </span>
        </div>
        <div className="text-[11px] mt-0.5" style={{ color: '#c8d6ea' }}>
          {alert.message}
        </div>
        <div className="text-[9px] mt-0.5" style={{ color: COLORS.text }}>
          {alert.type.replace(/_/g, ' ')}
        </div>
      </div>
      {!alert.is_read && (
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, marginTop: 4, flexShrink: 0 }} />
      )}
    </div>
  );
}

export default function NotificationPanel({ onClose }: NotificationPanelProps) {
  const { recentAlerts, unreadCount } = useMonitoring();

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div
        className="h-full"
        style={{
          width: 360,
          maxWidth: '90vw',
          background: '#0e1726',
          border: `1px solid ${COLORS.border}`,
          boxShadow: '-8px 0 40px rgba(0,0,0,0.8)',
          animation: 'panel-slide-in 0.3s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{
            borderBottom: `1px solid ${COLORS.border}`,
            background: 'linear-gradient(180deg,#151f33 0%,#0f1726 100%)',
          }}
        >
          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 tracking-wide">
            <Bell size={13} className="text-slate-400" />
            NOTIFICATIONS
            {unreadCount > 0 && (
              <span
                className="px-1.5 py-0.5 text-[9px] font-bold"
                style={{ background: '#ef4444', color: '#fff', borderRadius: 8 }}
              >
                {unreadCount}
              </span>
            )}
          </span>
          <button onClick={onClose}>
            <X size={14} className="text-slate-500 hover:text-slate-300" />
          </button>
        </div>

        {/* Content */}
        <div style={{ maxHeight: 'calc(100vh - 52px)', overflowY: 'auto' }}>
          {recentAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Bell size={28} style={{ color: COLORS.text, opacity: 0.4 }} />
              <span className="text-[11px]" style={{ color: COLORS.text }}>
                No alerts
              </span>
              <span className="text-[9px]" style={{ color: COLORS.text, opacity: 0.6 }}>
                System is running normally
              </span>
            </div>
          ) : (
            recentAlerts.map((alert) => <AlertRow key={alert.id} alert={alert} />)
          )}
        </div>
      </div>
    </div>
  );
}
