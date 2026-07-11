import { useState, useEffect, useMemo } from 'react';
import { Bell, TriangleAlert as AlertTriangle, OctagonAlert as AlertOctagon, Info, Check, CheckCheck, Search } from 'lucide-react';
import { useMonitoring } from '../contexts/MonitoringContext';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import type { Alert, AlertSeverity, AlertType } from '../types';

type FilterTab = 'all' | 'unread' | 'warning' | 'critical';

const SEVERITY_CONFIG: Record<AlertSeverity, { color: string; icon: typeof Info; bg: string }> = {
  info: { color: '#3b82f6', icon: Info, bg: '#3b82f615' },
  warning: { color: '#eab308', icon: AlertTriangle, bg: '#eab30815' },
  critical: { color: '#ef4444', icon: AlertOctagon, bg: '#ef444415' },
};

const TYPE_LABELS: Record<AlertType, string> = {
  bearing_wear: 'Bearing Wear',
  overheating: 'Overheating',
  abnormal_vibration: 'Abnormal Vibration',
  current_spike: 'Current Spike',
  rpm_anomaly: 'RPM Anomaly',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export function AlertsPage() {
  const { recentAlerts, machines, unreadCount, markAlertsRead, refreshMachines } = useMonitoring();
  const { success, error } = useToast();
  const [filter, setFilter] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    refreshMachines();
  }, [refreshMachines]);

  const machineName = (id: string) => machines.find((m) => m.id === id)?.name ?? 'Unknown';

  const filtered = useMemo(() => {
    return recentAlerts.filter((a) => {
      if (filter === 'unread' && a.is_read) return false;
      if (filter === 'warning' && a.severity !== 'warning') return false;
      if (filter === 'critical' && a.severity !== 'critical') return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return a.message.toLowerCase().includes(q) ||
          TYPE_LABELS[a.type].toLowerCase().includes(q) ||
          machineName(a.machine_id).toLowerCase().includes(q);
      }
      return true;
    });
  }, [recentAlerts, filter, search, machines]);

  const filterTabs: { id: FilterTab; label: string; count: number }[] = [
    { id: 'all', label: 'All Alerts', count: recentAlerts.length },
    { id: 'unread', label: 'Unread', count: recentAlerts.filter((a) => !a.is_read).length },
    { id: 'warning', label: 'Warning', count: recentAlerts.filter((a) => a.severity === 'warning').length },
    { id: 'critical', label: 'Critical', count: recentAlerts.filter((a) => a.severity === 'critical').length },
  ];

  async function handleMarkRead(alert: Alert) {
    if (alert.is_read) return;
    setUpdating(alert.id);
    const { error: updError } = await supabase
      .from('alerts')
      .update({ is_read: true })
      .eq('id', alert.id);
    setUpdating(null);
    if (updError) {
      error(updError.message);
    } else {
      markAlertsRead();
    }
  }

  async function handleMarkAllRead() {
    await markAlertsRead();
    success('All alerts marked as read');
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', borderBottom: '1px solid #1e2d45',
        background: 'linear-gradient(180deg, #0d1220 0%, #080d14 100%)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Bell size={18} color="#3b82f6" />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', letterSpacing: '1px' }}>
            ALERT MANAGEMENT
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, color: '#3b82f6',
            background: '#3b82f620', padding: '2px 8px', borderRadius: 8,
          }}>
            {recentAlerts.length}
          </span>
          {unreadCount > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 700, color: '#ef4444',
              background: '#ef444420', padding: '2px 8px', borderRadius: 8,
            }}>
              {unreadCount} unread
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            className="btn-secondary"
            onClick={handleMarkAllRead}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <CheckCheck size={13} />
            Mark All Read
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px', borderBottom: '1px solid #1e2d45',
        flexShrink: 0,
      }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
          <Search size={13} color="#64748b" style={{ position: 'absolute', left: 8, top: 8 }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search alerts..."
            style={{
              width: '100%', background: '#060b14', border: '1px solid #1e2d45',
              color: '#e2e8f0', padding: '6px 10px 6px 28px', borderRadius: 4,
              fontSize: 12, outline: 'none',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              style={{
                padding: '5px 12px', borderRadius: 4, cursor: 'pointer',
                fontSize: 11, fontWeight: 600,
                background: filter === tab.id ? '#3b82f615' : 'transparent',
                border: '1px solid',
                borderColor: filter === tab.id ? '#3b82f6' : '#1e2d45',
                color: filter === tab.id ? '#60a5fa' : '#94a3b8',
              }}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Alert list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#64748b', fontSize: 13, padding: 40 }}>
            <Bell size={32} color="#1e2d45" style={{ margin: '0 auto 12px', display: 'block' }} />
            No alerts found
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map((alert) => {
              const cfg = SEVERITY_CONFIG[alert.severity];
              const Icon = cfg.icon;
              return (
                <div
                  key={alert.id}
                  className="panel"
                  style={{
                    display: 'flex', alignItems: 'stretch', borderRadius: 6, overflow: 'hidden',
                    background: alert.is_read ? '#111827' : cfg.bg,
                    borderLeft: `3px solid ${cfg.color}`,
                  }}
                >
                  {/* Severity icon */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 14px', background: cfg.bg,
                  }}>
                    <Icon size={20} color={cfg.color} />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, padding: '10px 14px', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: cfg.color,
                        textTransform: 'uppercase', letterSpacing: '0.5px',
                      }}>
                        {alert.severity}
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 600, color: '#94a3b8',
                        background: '#1e2d45', padding: '1px 6px', borderRadius: 3,
                      }}>
                        {TYPE_LABELS[alert.type]}
                      </span>
                      <span style={{ fontSize: 10, color: '#64748b' }}>
                        {machineName(alert.machine_id)}
                      </span>
                      {!alert.is_read && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, color: '#3b82f6',
                          background: '#3b82f620', padding: '1px 6px', borderRadius: 3,
                        }}>
                          NEW
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.4 }}>
                      {alert.message}
                    </div>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
                      {formatTime(alert.created_at)}
                    </div>
                  </div>

                  {/* Action */}
                  <div style={{
                    display: 'flex', alignItems: 'center', padding: '0 12px',
                  }}>
                    {!alert.is_read && (
                      <button
                        onClick={() => handleMarkRead(alert)}
                        disabled={updating === alert.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          background: 'transparent', border: '1px solid #1e2d45',
                          borderRadius: 4, cursor: 'pointer',
                          color: '#94a3b8', fontSize: 10, fontWeight: 600,
                          padding: '4px 8px',
                          opacity: updating === alert.id ? 0.5 : 1,
                        }}
                      >
                        <Check size={11} />
                        Mark Read
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default AlertsPage;
