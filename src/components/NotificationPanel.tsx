import { Bell, X, TriangleAlert as AlertTriangle, OctagonAlert as AlertOctagon, Info, Check } from 'lucide-react';
import { useMonitoring } from '../contexts/MonitoringContext';
import type { Alert, AlertSeverity } from '../types';

interface NotificationPanelProps {
  onClose: () => void;
}

const SEVERITY_CONFIG: Record<AlertSeverity, { color: string; icon: typeof Info; bg: string }> = {
  info: { color: '#3b82f6', icon: Info, bg: '#3b82f615' },
  warning: { color: '#eab308', icon: AlertTriangle, bg: '#eab30815' },
  critical: { color: '#ef4444', icon: AlertOctagon, bg: '#ef444415' },
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function NotificationPanel({ onClose }: NotificationPanelProps) {
  const { recentAlerts, machines, markAlertsRead } = useMonitoring();

  const machineName = (id: string) => machines.find((m) => m.id === id)?.name ?? 'Unknown Machine';

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 999,
        }}
      />
      {/* Panel */}
      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 400, maxWidth: '90vw',
          background: '#0e1726',
          borderLeft: '1px solid #1e2d45',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          animation: 'panel-slide-in 0.25s ease-out',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', borderBottom: '1px solid #1e2d45',
          background: 'linear-gradient(180deg, #111827 0%, #0d1220 100%)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={16} color="#3b82f6" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.5px' }}>
              NOTIFICATIONS
            </span>
            {recentAlerts.length > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 700, color: '#3b82f6',
                background: '#3b82f620', padding: '2px 6px', borderRadius: 8,
              }}>
                {recentAlerts.length}
              </span>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={18} />
          </button>
        </div>

        {/* Mark all read */}
        {recentAlerts.some((a) => !a.is_read) && (
          <div style={{ padding: '8px 16px', borderBottom: '1px solid #1e2d45' }}>
            <button
              onClick={markAlertsRead}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#3b82f6', fontSize: 11, fontWeight: 600,
              }}
            >
              <Check size={12} />
              Mark All Read
            </button>
          </div>
        )}

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {recentAlerts.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', fontSize: 12, padding: 40 }}>
              <Bell size={32} color="#1e2d45" style={{ margin: '0 auto 12px', display: 'block' }} />
              No notifications
            </div>
          ) : (
            recentAlerts.map((alert: Alert) => {
              const cfg = SEVERITY_CONFIG[alert.severity];
              const Icon = cfg.icon;
              return (
                <div
                  key={alert.id}
                  style={{
                    display: 'flex', gap: 10, padding: '12px 16px',
                    borderBottom: '1px solid #111827',
                    background: alert.is_read ? 'transparent' : cfg.bg,
                    borderLeft: alert.is_read ? '2px solid transparent' : `2px solid ${cfg.color}`,
                  }}
                >
                  <Icon size={16} color={cfg.color} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: cfg.color,
                        textTransform: 'uppercase', letterSpacing: '0.5px',
                      }}>
                        {alert.severity}
                      </span>
                      <span style={{ fontSize: 9.5, color: '#64748b', whiteSpace: 'nowrap' }}>
                        {formatTime(alert.created_at)}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 4, lineHeight: 1.4 }}>
                      {alert.message}
                    </div>
                    <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 4 }}>
                      {machineName(alert.machine_id)}
                    </div>
                  </div>
                  {!alert.is_read && (
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: cfg.color, flexShrink: 0, marginTop: 6,
                    }} />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
