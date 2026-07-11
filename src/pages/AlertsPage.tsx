import { useState, useMemo, useEffect } from 'react';
import { Bell, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, Circle as XCircle, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useMonitoring } from '../contexts/MonitoringContext';
import type { Alert, AlertSeverity } from '../types';

/* ---------- constants ---------- */

const FILTER_TABS: { key: 'all' | 'unread' | AlertSeverity; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'warning', label: 'Warning' },
  { key: 'critical', label: 'Critical' },
];

const SEVERITY_CONFIG: Record<AlertSeverity, { color: string; bg: string; icon: React.ReactNode }> = {
  info: { color: '#3b82f6', bg: '#3b82f615', icon: <CheckCircle size={14} /> },
  warning: { color: '#eab308', bg: '#eab30815', icon: <AlertTriangle size={14} /> },
  critical: { color: '#ef4444', bg: '#ef444415', icon: <XCircle size={14} /> },
};

/* ---------- helpers ---------- */

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

/* ---------- main component ---------- */

export function AlertsPage() {
  const { recentAlerts, unreadCount, markAlertsRead, machines } = useMonitoring();

  const [filter, setFilter] = useState<'all' | 'unread' | AlertSeverity>('all');
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  /* ----- machine name lookup ----- */
  const machineNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of machines) map[m.id] = m.name;
    return map;
  }, [machines]);

  /* ----- filtered alerts ----- */
  const filtered = useMemo(() => {
    let list = recentAlerts;
    if (filter === 'unread') list = list.filter((a) => !a.is_read);
    else if (filter !== 'all') list = list.filter((a) => a.severity === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.message.toLowerCase().includes(q) ||
          a.type.toLowerCase().includes(q) ||
          (machineNames[a.machine_id]?.toLowerCase().includes(q) ?? false),
      );
    }
    return list;
  }, [recentAlerts, filter, search, machineNames]);

  /* ----- handlers ----- */

  async function handleMarkRead(alert: Alert) {
    if (alert.is_read) return;
    setUpdating(alert.id);
    const { error } = await supabase
      .from('alerts')
      .update({ is_read: true })
      .eq('id', alert.id);
    setUpdating(null);
    if (error) return;
    await markAlertsRead();
  }

  async function handleResolve(alert: Alert) {
    setUpdating(alert.id);
    const { error } = await supabase
      .from('alerts')
      .update({ resolved_at: new Date().toISOString(), is_read: true })
      .eq('id', alert.id);
    setUpdating(null);
    if (error) return;
    await markAlertsRead();
  }

  async function handleMarkAllRead() {
    setMarkingAll(true);
    const unreadIds = recentAlerts.filter((a) => !a.is_read).map((a) => a.id);
    if (unreadIds.length === 0) {
      setMarkingAll(false);
      return;
    }
    const { error } = await supabase
      .from('alerts')
      .update({ is_read: true })
      .in('id', unreadIds);
    setMarkingAll(false);
    if (error) return;
    await markAlertsRead();
  }

  /* ---------- render ---------- */

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ background: 'linear-gradient(180deg,#0d1525 0%,#080d14 100%)', borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-3">
          <Bell size={20} style={{ color: 'var(--accent-cyan)' }} />
          <span className="text-sm font-semibold text-slate-200 tracking-wide">ALERT MANAGEMENT</span>
          <span
            className="text-xs font-bold px-2 py-0.5"
            style={{ background: '#0e1726', border: '1px solid var(--border-subtle)', color: 'var(--accent-cyan)', borderRadius: 3 }}
          >
            {recentAlerts.length}
          </span>
          {unreadCount > 0 && (
            <span
              className="text-xs font-bold px-2 py-0.5"
              style={{ background: '#ef444415', border: '1px solid #ef444440', color: '#f87171', borderRadius: 3 }}
            >
              {unreadCount} unread
            </span>
          )}
        </div>
        <button
          onClick={handleMarkAllRead}
          disabled={markingAll || unreadCount === 0}
          className="btn-secondary flex items-center gap-1.5"
          style={{ fontSize: 11, padding: '5px 12px', opacity: markingAll || unreadCount === 0 ? 0.4 : 1 }}
        >
          {markingAll ? (
            <span className="animate-spin" style={{ display: 'inline-block', width: 12, height: 12, border: '1.5px solid #94a3b8', borderTopColor: 'transparent', borderRadius: '50%' }} />
          ) : (
            <CheckCircle size={13} />
          )}
          Mark All Read
        </button>
      </div>

      {/* Filter bar */}
      <div
        className="flex items-center gap-3 px-4 py-2 flex-shrink-0"
        style={{ background: '#0e1726', borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="relative flex items-center" style={{ minWidth: 220 }}>
          <Search size={13} style={{ position: 'absolute', left: 8, color: '#64748b' }} />
          <input
            type="text"
            placeholder="Search alerts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs"
            style={{
              background: '#060b14', border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)', borderRadius: 3, outline: 'none',
            }}
          />
        </div>
        <div className="flex items-center gap-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className="px-3 py-1.5 text-xs font-medium transition-all"
              style={{
                background: filter === tab.key ? '#1a2540' : 'transparent',
                border: `1px solid ${filter === tab.key ? '#3b82f6' : 'var(--border-subtle)'}`,
                color: filter === tab.key ? 'var(--accent-blue)' : '#64748b',
                borderRadius: 3,
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alert list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm">
            No alerts found.
          </div>
        ) : (
          <div>
            {/* Table header */}
            <div
              className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide"
              style={{ background: '#0a1020', borderBottom: '1px solid var(--border-subtle)', position: 'sticky', top: 0, zIndex: 1 }}
            >
              <span style={{ width: 28, textAlign: 'center' }}>Sev</span>
              <span style={{ width: 130 }}>Type</span>
              <span style={{ flex: 1 }}>Message</span>
              <span style={{ width: 140 }}>Machine</span>
              <span style={{ width: 150 }}>Timestamp</span>
              <span style={{ width: 70, textAlign: 'center' }}>Status</span>
              <span style={{ width: 80, textAlign: 'right' }}>Actions</span>
            </div>

            {/* Rows */}
            {filtered.map((alert) => {
              const cfg = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.warning;
              const machineName = machineNames[alert.machine_id] ?? 'Unknown';
              const isUpdating = updating === alert.id;
              return (
                <div
                  key={alert.id}
                  className="flex items-center gap-3 px-4 py-2.5 text-xs"
                  style={{
                    borderBottom: '1px solid #0d1525',
                    background: alert.is_read ? 'transparent' : `${cfg.bg}`,
                    opacity: alert.resolved_at ? 0.6 : 1,
                  }}
                >
                  {/* Severity icon */}
                  <span style={{ width: 28, textAlign: 'center', color: cfg.color }}>
                    {isUpdating ? (
                      <span className="animate-spin" style={{ display: 'inline-block', width: 12, height: 12, border: `1.5px solid ${cfg.color}`, borderTopColor: 'transparent', borderRadius: '50%' }} />
                    ) : (
                      cfg.icon
                    )}
                  </span>

                  {/* Type */}
                  <span style={{ width: 130 }} className="text-slate-300 font-medium">
                    {alert.type.replace(/_/g, ' ')}
                  </span>

                  {/* Message */}
                  <span style={{ flex: 1 }} className="text-slate-400 truncate">
                    {alert.message}
                  </span>

                  {/* Machine */}
                  <span style={{ width: 140 }} className="text-slate-500 truncate">
                    {machineName}
                  </span>

                  {/* Timestamp */}
                  <span style={{ width: 150 }} className="text-slate-500" title={formatTimestamp(alert.created_at)}>
                    {timeAgo(alert.created_at)}
                  </span>

                  {/* Status */}
                  <span style={{ width: 70, textAlign: 'center' }}>
                    {alert.resolved_at ? (
                      <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 2, background: '#22c55e15', color: '#22c55e', fontWeight: 600, textTransform: 'uppercase' }}>Resolved</span>
                    ) : alert.is_read ? (
                      <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 2, background: '#64748b15', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Read</span>
                    ) : (
                      <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 2, background: `${cfg.color}15`, color: cfg.color, fontWeight: 600, textTransform: 'uppercase' }}>Unread</span>
                    )}
                  </span>

                  {/* Actions */}
                  <span style={{ width: 80 }} className="flex items-center justify-end gap-1">
                    {!alert.is_read && (
                      <button
                        onClick={() => handleMarkRead(alert)}
                        disabled={isUpdating}
                        title="Mark as read"
                        className="toolbar-icon-btn"
                        style={{ width: 24, height: 22 }}
                      >
                        <CheckCircle size={12} />
                      </button>
                    )}
                    {!alert.resolved_at && (
                      <button
                        onClick={() => handleResolve(alert)}
                        disabled={isUpdating}
                        title="Resolve alert"
                        className="toolbar-icon-btn"
                        style={{ width: 24, height: 22, color: '#22c55e' }}
                      >
                        <CheckCircle size={12} />
                      </button>
                    )}
                  </span>
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
