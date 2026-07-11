import { useState, useMemo, useEffect } from 'react';
import {
  Bell, Search, CheckCheck, Check, AlertTriangle, AlertCircle, Info, Clock, X,
} from 'lucide-react';
import { useMonitoring } from '../contexts/MonitoringContext';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import type { Alert, AlertSeverity, AlertType } from '../types';

const severityConfig: Record<AlertSeverity, { color: string; Icon: typeof Info; label: string }> = {
  info: { color: '#3b82f6', Icon: Info, label: 'Info' },
  warning: { color: '#eab308', Icon: AlertTriangle, label: 'Warning' },
  critical: { color: '#ef4444', Icon: AlertCircle, label: 'Critical' },
};

const typeLabels: Record<AlertType, string> = {
  bearing_wear: 'Bearing Wear',
  overheating: 'Overheating',
  abnormal_vibration: 'Abnormal Vibration',
  current_spike: 'Current Spike',
  rpm_anomaly: 'RPM Anomaly',
};

function fmtTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

type FilterKey = 'all' | 'unread' | 'warning' | 'critical';

interface Props {}

/**
 * Alert management page. Lists alerts with severity icons, machine names and
 * read/unread state; supports filtering, search, mark-all-read and per-alert
 * resolution.
 */
export function AlertsPage(_: Props) {
  const { recentAlerts, markAlertsRead, refreshMachines, machines } = useMonitoring();
  const { toast } = useToast();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');
  const [localAlerts, setLocalAlerts] = useState<Alert[]>(recentAlerts);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useEffect(() => { setLocalAlerts(recentAlerts); }, [recentAlerts]);

  const machineName = (id: string) => machines.find((m) => m.id === id)?.name ?? 'Unknown';

  const filtered = useMemo(() => {
    return localAlerts.filter((a) => {
      if (filter === 'unread' && a.is_read) return false;
      if (filter === 'warning' && a.severity !== 'warning') return false;
      if (filter === 'critical' && a.severity !== 'critical') return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!a.message.toLowerCase().includes(q) && !typeLabels[a.type].toLowerCase().includes(q) && !machineName(a.machine_id).toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [localAlerts, filter, search, machines]);

  const unreadCount = localAlerts.filter((a) => !a.is_read).length;
  const criticalCount = localAlerts.filter((a) => a.severity === 'critical').length;

  const tabs: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'warning', label: 'Warning' },
    { key: 'critical', label: 'Critical' },
  ];

  async function handleMarkAllRead() {
    await markAlertsRead();
    setLocalAlerts((prev) => prev.map((a) => ({ ...a, is_read: true })));
    toast('All alerts marked as read', 'success');
  }

  async function handleResolve(a: Alert) {
    setResolvingId(a.id);
    const { error } = await supabase.from('alerts').update({ resolved_at: new Date().toISOString(), is_read: true }).eq('id', a.id);
    setResolvingId(null);
    if (error) { toast(error.message, 'error'); return; }
    setLocalAlerts((prev) => prev.filter((x) => x.id !== a.id));
    toast('Alert resolved', 'success');
  }

  const inputStyle: React.CSSProperties = {
    background: '#080d14', border: '1px solid #1e2d45', color: '#e2e8f0', fontSize: 11, padding: '5px 8px 5px 26px', outline: 'none',
  };

  return (
    <div className="flex flex-col h-full" style={{ background: '#0b0f1a' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid #1e2d45', background: 'linear-gradient(180deg,#0d1525 0%,#080d14 100%)' }}>
        <Bell size={18} className="text-blue-400" />
        <span className="text-sm font-bold text-slate-100 tracking-wide">ALERT MANAGEMENT</span>
        <span className="px-2 py-0.5 text-[10px] font-semibold text-slate-300" style={{ background: '#1a2540', border: '1px solid #2a3f60' }}>
          {localAlerts.length}
        </span>
        {unreadCount > 0 && (
          <span className="px-2 py-0.5 text-[10px] font-semibold text-white" style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.5)', color: '#f87171' }}>
            {unreadCount} unread
          </span>
        )}
        {criticalCount > 0 && (
          <span className="px-2 py-0.5 text-[10px] font-semibold text-white" style={{ background: 'rgba(239,68,68,0.3)', border: '1px solid #ef4444', color: '#fca5a5' }}>
            {criticalCount} critical
          </span>
        )}
        <button className="btn-secondary flex items-center gap-1.5 ml-auto" style={{ height: 30, opacity: unreadCount === 0 ? 0.5 : 1 }} onClick={handleMarkAllRead} disabled={unreadCount === 0}>
          <CheckCheck size={13} /> Mark All Read
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0" style={{ borderBottom: '1px solid #1e2d45' }}>
        <div className="relative flex items-center">
          <Search size={13} className="absolute left-2.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search alerts…"
            style={inputStyle}
          />
        </div>
        <div className="flex items-center gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className="px-3 py-1 text-[11px] font-semibold tracking-wide transition-all"
              style={{
                background: filter === t.key ? 'rgba(59,130,246,0.15)' : 'transparent',
                border: filter === t.key ? '1px solid #3b82f6' : '1px solid transparent',
                color: filter === t.key ? '#60a5fa' : '#94a3b8',
                height: 26,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alert list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <Bell size={32} className="text-slate-600" />
            <span className="text-sm text-slate-500">No alerts to display.</span>
          </div>
        ) : (
          <div className="flex flex-col">
            {filtered.map((a, i) => {
              const cfg = severityConfig[a.severity] ?? severityConfig.info;
              const resolved = !!a.resolved_at;
              return (
                <div
                  key={a.id}
                  className="flex items-start gap-3 px-4 py-3"
                  style={{
                    borderBottom: '1px solid #141e30',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(30,45,69,0.18)',
                    opacity: resolved ? 0.5 : 1,
                  }}
                >
                  {/* Severity icon */}
                  <div className="flex-shrink-0 mt-0.5 flex items-center justify-center" style={{ width: 28, height: 28, background: `${cfg.color}1a`, border: `1px solid ${cfg.color}40` }}>
                    <cfg.Icon size={14} style={{ color: cfg.color }} />
                  </div>

                  {/* Content */}
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-semibold tracking-wide" style={{ color: cfg.color }}>
                        {typeLabels[a.type] ?? a.type}
                      </span>
                      <span className="px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide" style={{ background: `${cfg.color}1a`, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                        {cfg.label}
                      </span>
                      {!a.is_read && !resolved && (
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
                      )}
                      {resolved && (
                        <span className="flex items-center gap-0.5 text-[9px] text-green-400">
                          <Check size={10} /> Resolved
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-300 leading-snug">{a.message}</span>
                    <div className="flex items-center gap-3 text-[9px] text-slate-500">
                      <span className="flex items-center gap-1"><Bell size={9} /> {machineName(a.machine_id)}</span>
                      <span className="flex items-center gap-1"><Clock size={9} /> {fmtTime(a.created_at)}</span>
                    </div>
                  </div>

                  {/* Resolve button */}
                  {!resolved && (
                    <button
                      className="btn-secondary flex items-center gap-1 flex-shrink-0"
                      style={{ height: 26, padding: '0 10px', fontSize: 10, opacity: resolvingId === a.id ? 0.6 : 1 }}
                      onClick={() => handleResolve(a)}
                      disabled={resolvingId === a.id}
                    >
                      <Check size={11} /> Resolve
                    </button>
                  )}
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
