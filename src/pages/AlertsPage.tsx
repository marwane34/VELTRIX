import { useState, useEffect, useMemo } from 'react';
import {
  Bell, Search, Info, AlertTriangle, AlertOctagon, CheckCircle2,
  CheckCheck, X, Loader2, Wrench, Check,
} from 'lucide-react';
import { useMonitoring } from '../contexts/MonitoringContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import type { Alert, AlertSeverity, AlertType, Machine } from '../types';

interface AlertsPageProps {
  onNavigate: (page: string) => void;
}

const severityConfig: Record<AlertSeverity, { icon: typeof Info; color: string; bg: string; label: string }> = {
  info: { icon: Info, color: '#3b82f6', bg: 'rgba(59,130,246,0.06)', label: 'INFO' },
  warning: { icon: AlertTriangle, color: '#eab308', bg: 'rgba(234,179,8,0.06)', label: 'WARN' },
  critical: { icon: AlertOctagon, color: '#ef4444', bg: 'rgba(239,68,68,0.06)', label: 'CRIT' },
};

const typeLabel: Record<AlertType, string> = {
  bearing_wear: 'Bearing Wear', overheating: 'Overheating',
  abnormal_vibration: 'Abnormal Vibration', current_spike: 'Current Spike',
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
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const inputStyle: React.CSSProperties = {
  background: '#0a1220', border: '1px solid #1e2d45', color: '#e2e8f0',
  fontSize: 12, padding: '6px 10px', outline: 'none', width: '100%',
};

/**
 * AlertsPage — alert management with severity filters, search, mark-as-read, and resolve.
 */
export function AlertsPage({ onNavigate }: AlertsPageProps) {
  const { recentAlerts, unreadCount, machines, markAlertsRead } = useMonitoring();
  const { user } = useAuth();
  const { toast } = useToast();

  const [alerts, setAlerts] = useState<Alert[]>(recentAlerts);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | AlertSeverity>('all');
  const [markingAll, setMarkingAll] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);

  useEffect(() => { setAlerts(recentAlerts); }, [recentAlerts]);

  const machineMap = useMemo(() => {
    const map: Record<string, Machine> = {};
    machines.forEach((m) => { map[m.id] = m; });
    return map;
  }, [machines]);

  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      if (filter === 'unread' && a.is_read) return false;
      if (filter !== 'all' && filter !== 'unread' && a.severity !== filter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const machineName = machineMap[a.machine_id]?.name.toLowerCase() ?? '';
        if (!a.message.toLowerCase().includes(q) && !a.type.toLowerCase().includes(q) && !machineName.includes(q)) return false;
      }
      return true;
    });
  }, [alerts, filter, search, machineMap]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: alerts.length, unread: 0, info: 0, warning: 0, critical: 0 };
    alerts.forEach((a) => { if (!a.is_read) c.unread++; c[a.severity]++; });
    return c;
  }, [alerts]);

  async function handleMarkAllRead() {
    setMarkingAll(true);
    try {
      await markAlertsRead();
      setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true })));
      toast('All alerts marked as read', 'success');
    } catch (err) {
      toast('Failed: ' + (err as Error).message, 'error');
    } finally {
      setMarkingAll(false);
    }
  }

  async function handleResolve(alert: Alert) {
    setResolving(alert.id);
    try {
      const { error } = await supabase.from('alerts').update({ resolved_at: new Date().toISOString() }).eq('id', alert.id);
      if (error) throw error;
      setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
      toast('Alert resolved', 'success');
    } catch (err) {
      toast('Failed to resolve: ' + (err as Error).message, 'error');
    } finally {
      setResolving(null);
    }
  }

  async function handleMarkRead(alert: Alert) {
    try {
      const { error } = await supabase.from('alerts').update({ is_read: true }).eq('id', alert.id);
      if (error) throw error;
      setAlerts((prev) => prev.map((a) => (a.id === alert.id ? { ...a, is_read: true } : a)));
    } catch (err) {
      toast('Failed: ' + (err as Error).message, 'error');
    }
  }

  return (
    <div className="flex flex-col" style={{ height: '100%', background: '#060b14' }}>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ padding: '12px 16px', borderBottom: '1px solid #1e2d45', flexShrink: 0 }}>
        <div className="flex items-center gap-3">
          <Bell size={20} style={{ color: '#3b82f6' }} />
          <span className="font-bold tracking-wider" style={{ fontSize: 14, color: '#e2e8f0' }}>ALERT MANAGEMENT</span>
          <span className="flex items-center justify-center font-bold" style={{ minWidth: 24, height: 22, padding: '0 8px', fontSize: 11, color: '#ef4444', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 3 }}>
            {alerts.length}
          </span>
        </div>
        <button
          onClick={handleMarkAllRead}
          disabled={markingAll || unreadCount === 0}
          className="btn-secondary flex items-center gap-2"
          style={{ opacity: markingAll || unreadCount === 0 ? 0.4 : 1, cursor: markingAll ? 'wait' : 'pointer' }}
        >
          {markingAll ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={13} />}
          Mark All Read
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3" style={{ padding: '10px 16px', borderBottom: '1px solid #1e2d45', flexShrink: 0 }}>
        <div className="relative" style={{ width: 280 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search alerts..."
            style={{ ...inputStyle, paddingLeft: 32 }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#3b82f6')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#1e2d45')}
          />
        </div>
        <div className="flex items-center gap-1">
          {(['all', 'unread', 'warning', 'critical'] as const).map((tab) => {
            const active = filter === tab;
            const count = counts[tab] ?? 0;
            const tabColor = tab === 'critical' ? '#ef4444' : tab === 'warning' ? '#eab308' : tab === 'unread' ? '#3b82f6' : '#60a5fa';
            return (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                style={{
                  padding: '5px 12px', fontSize: 11, fontWeight: active ? 600 : 500,
                  cursor: 'pointer', borderRadius: 3, letterSpacing: '0.3px', textTransform: 'uppercase',
                  background: active ? 'linear-gradient(180deg,#1a3a6e 0%,#0f2547 100%)' : 'transparent',
                  border: active ? `1px solid ${tabColor}` : '1px solid #1e2d45',
                  color: active ? tabColor : '#94a3b8',
                }}
              >
                {tab} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Alert List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center" style={{ height: '100%', gap: 12 }}>
            {alerts.length === 0 ? (
              <>
                <CheckCircle2 size={48} style={{ color: '#22c55e', opacity: 0.5 }} />
                <span style={{ fontSize: 13, color: '#64748b' }}>No alerts. System is operating normally.</span>
              </>
            ) : (
              <>
                <Bell size={48} style={{ color: '#475569', opacity: 0.5 }} />
                <span style={{ fontSize: 13, color: '#64748b' }}>No alerts match your filters.</span>
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((alert) => {
              const cfg = severityConfig[alert.severity];
              const machine = machineMap[alert.machine_id];
              return (
                <div
                  key={alert.id}
                  className="panel flex items-start gap-3"
                  style={{
                    padding: '10px 14px',
                    background: alert.is_read ? '#0e1726' : `linear-gradient(90deg, ${cfg.bg} 0%, #0e1726 60%)`,
                    borderLeft: `3px solid ${cfg.color}`,
                  }}
                >
                  {/* Severity icon */}
                  <cfg.icon size={18} style={{ color: cfg.color, marginTop: 1, flexShrink: 0 }} />

                  {/* Content */}
                  <div className="flex flex-col gap-1" style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color, letterSpacing: '0.5px' }}>{cfg.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#e2e8f0' }}>{typeLabel[alert.type]}</span>
                      {machine && (
                        <span className="flex items-center gap-1" style={{ fontSize: 10, color: '#64748b' }}>
                          · {machine.name}
                        </span>
                      )}
                      {!alert.is_read && (
                        <span style={{ fontSize: 8, fontWeight: 700, color: '#3b82f6', padding: '1px 5px', background: 'rgba(59,130,246,0.15)', borderRadius: 2, letterSpacing: '0.5px' }}>NEW</span>
                      )}
                    </div>
                    <span style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.4 }}>{alert.message}</span>
                    <span style={{ fontSize: 10, color: '#475569' }}>{formatTimestamp(alert.created_at)}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5" style={{ flexShrink: 0 }}>
                    {!alert.is_read && (
                      <button
                        onClick={() => handleMarkRead(alert)}
                        className="toolbar-icon-btn"
                        title="Mark as read"
                        style={{ width: 28, height: 24 }}
                      >
                        <Check size={12} />
                      </button>
                    )}
                    <button
                      onClick={() => handleResolve(alert)}
                      disabled={resolving === alert.id}
                      className="btn-secondary flex items-center gap-1"
                      style={{ padding: '4px 10px', fontSize: 10, opacity: resolving === alert.id ? 0.5 : 1 }}
                    >
                      {resolving === alert.id ? <Loader2 size={11} className="animate-spin" /> : <Wrench size={11} />}
                      Resolve
                    </button>
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
