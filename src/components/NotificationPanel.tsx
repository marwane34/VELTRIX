import { CheckCircle, AlertTriangle, X, Bell } from 'lucide-react';
import { useMonitoring } from '../contexts/MonitoringContext';

interface Props {
  onClose: () => void;
}

export function NotificationPanel({ onClose }: Props) {
  const { recentAlerts, machines, markAlertsRead, unreadCount } = useMonitoring();

  function machineName(id: string) {
    return machines.find((m) => m.id === id)?.name ?? 'Machine';
  }

  function formatTime(ts: string) {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />
      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
        style={{
          width: 340,
          background: '#0e1726',
          borderLeft: '1px solid #1e2d45',
          boxShadow: '-8px 0 30px rgba(0,0,0,0.6)',
          animation: 'panel-slide-in 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: '1px solid #1e2d45', background: 'linear-gradient(180deg,#151f33 0%,#0f1726 100%)' }}
        >
          <div className="flex items-center gap-2">
            <Bell size={14} className="text-blue-400" />
            <span className="text-sm font-semibold text-slate-200">Notifications</span>
            {unreadCount > 0 && (
              <span
                className="text-xs px-1.5 py-0.5"
                style={{ background: '#7f1d1d', border: '1px solid #ef4444', color: '#fca5a5' }}
              >
                {unreadCount} unread
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X size={16} />
          </button>
        </div>

        {/* Mark all read */}
        {unreadCount > 0 && (
          <div className="px-4 py-2 shrink-0" style={{ borderBottom: '1px solid #1e2d45' }}>
            <button
              onClick={() => markAlertsRead()}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Mark all as read
            </button>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {recentAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <CheckCircle size={32} className="text-slate-700" />
              <span className="text-xs text-slate-600">No notifications</span>
            </div>
          ) : (
            recentAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-2.5 px-4 py-3"
                style={{
                  borderBottom: '1px solid #1a2540',
                  background: alert.is_read ? 'transparent' : 'rgba(59,130,246,0.04)',
                }}
              >
                {alert.severity === 'critical' ? (
                  <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
                ) : alert.severity === 'warning' ? (
                  <AlertTriangle size={14} className="text-yellow-400 mt-0.5 shrink-0" />
                ) : (
                  <CheckCircle size={14} className="text-green-400 mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-200">{machineName(alert.machine_id)}</span>
                    {!alert.is_read && (
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{alert.message}</p>
                  <span className="text-xs text-slate-600 mt-1 block">{formatTime(alert.created_at)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
