import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Bell, Check, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useMonitoring } from '../contexts/MonitoringContext';
import type { Alert } from '../types';

export function AlertsPage() {
  const { user } = useAuth();
  const { machines, markAlertsRead } = useMonitoring();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical' | 'warning'>('all');

  async function loadAlerts() {
    if (!user) return;
    let q = supabase.from('alerts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100);
    const { data } = await q;
    setAlerts(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadAlerts();
    const sub = supabase.channel('alerts-page').on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, loadAlerts).subscribe();
    return () => { sub.unsubscribe(); };
  }, [user]);

  async function deleteAlert(id: string) {
    await supabase.from('alerts').delete().eq('id', id);
    setAlerts((a) => a.filter((x) => x.id !== id));
  }

  async function markRead(id: string) {
    await supabase.from('alerts').update({ is_read: true }).eq('id', id);
    setAlerts((a) => a.map((x) => x.id === id ? { ...x, is_read: true } : x));
  }

  const filtered = alerts.filter((a) => {
    if (filter === 'unread') return !a.is_read;
    if (filter === 'critical') return a.severity === 'critical';
    if (filter === 'warning') return a.severity === 'warning';
    return true;
  });

  function machineName(id: string) { return machines.find((m) => m.id === id)?.name ?? id.slice(0, 8); }
  function formatTime(ts: string) { return new Date(ts).toLocaleString(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }); }

  const tabStyle = (active: boolean) => ({
    padding: '5px 12px', fontSize: 11, cursor: 'pointer',
    background: active ? 'linear-gradient(180deg,#1a3a6a 0%,#0f2040 100%)' : 'transparent',
    border: `1px solid ${active ? '#3b82f6' : '#1e2d45'}`,
    color: active ? '#93c5fd' : '#64748b',
  } as React.CSSProperties);

  const unread = alerts.filter((a) => !a.is_read).length;

  return (
    <div className="flex flex-col h-full" style={{ background: '#0b0f1a' }}>
      {/* Header */}
      <div className="px-5 py-3 shrink-0" style={{ borderBottom: '1px solid #1e2d45', background: 'linear-gradient(180deg,#111827 0%,#0b0f1a 100%)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-blue-400" />
            <h2 className="text-sm font-semibold text-slate-200 tracking-wide">ALERT HISTORY</h2>
            {unread > 0 && (
              <span className="text-xs px-1.5 py-0.5 font-bold" style={{ background: '#7f1d1d', color: '#fca5a5', minWidth: 20, textAlign: 'center' }}>{unread}</span>
            )}
          </div>
          {unread > 0 && (
            <button onClick={async () => { await markAlertsRead(); loadAlerts(); }} className="btn-secondary px-3 py-1 text-xs flex items-center gap-1">
              <Check size={10} /> Mark all read
            </button>
          )}
        </div>

        <div className="flex gap-1 mt-3">
          {(['all','unread','critical','warning'] as const).map((f) => (
            <button key={f} style={tabStyle(filter === f)} onClick={() => setFilter(f)}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
          ))}
        </div>
      </div>

      {/* Alert list */}
      <div className="flex-1 overflow-y-auto">
        {loading && <div className="text-center py-12 text-xs text-slate-500">Loading alerts...</div>}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle size={24} className="text-green-500 mx-auto mb-3" />
            <div className="text-sm text-slate-400">No alerts</div>
            <div className="text-xs text-slate-600 mt-1">System operating normally</div>
          </div>
        )}
        {!loading && filtered.map((alert) => (
          <div
            key={alert.id}
            className="flex items-start gap-3 px-5 py-3 transition-colors"
            style={{
              borderBottom: '1px solid #1a2540',
              background: !alert.is_read ? 'rgba(59,130,246,0.03)' : 'transparent',
            }}
          >
            {/* Severity icon */}
            <div className="shrink-0 mt-0.5">
              {alert.severity === 'critical' ? <AlertTriangle size={14} className="text-red-400" />
                : alert.severity === 'warning' ? <AlertTriangle size={14} className="text-yellow-400" />
                : <CheckCircle size={14} className="text-green-400" />}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-xs font-semibold px-1.5 py-0.5"
                  style={{
                    background: alert.severity === 'critical' ? 'rgba(239,68,68,0.15)' : alert.severity === 'warning' ? 'rgba(234,179,8,0.15)' : 'rgba(34,197,94,0.15)',
                    color: alert.severity === 'critical' ? '#f87171' : alert.severity === 'warning' ? '#facc15' : '#4ade80',
                    border: `1px solid ${alert.severity === 'critical' ? '#7f1d1d' : alert.severity === 'warning' ? '#713f12' : '#14532d'}`,
                  }}
                >
                  {alert.severity.toUpperCase()}
                </span>
                <span className="text-xs text-slate-400">{alert.type.replace(/_/g,' ')}</span>
                <span className="text-xs text-slate-600">· {machineName(alert.machine_id)}</span>
                {!alert.is_read && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
              </div>
              <div className="text-xs text-slate-200 mt-1">{alert.message}</div>
              <div className="text-xs text-slate-600 mt-0.5">{formatTime(alert.created_at)}</div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              {!alert.is_read && (
                <button onClick={() => markRead(alert.id)} title="Mark as read" className="p-1 text-slate-600 hover:text-slate-300 transition-colors">
                  <Check size={12} />
                </button>
              )}
              <button onClick={() => deleteAlert(alert.id)} title="Delete" className="p-1 text-slate-600 hover:text-red-400 transition-colors">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer stats */}
      <div className="px-5 py-2 shrink-0 flex items-center gap-6" style={{ borderTop: '1px solid #1e2d45', background: '#060b14', fontSize: 10 }}>
        <span className="text-slate-500">Total: <span className="text-slate-400">{alerts.length}</span></span>
        <span className="text-slate-500">Critical: <span className="text-red-400">{alerts.filter((a) => a.severity === 'critical').length}</span></span>
        <span className="text-slate-500">Warning: <span className="text-yellow-400">{alerts.filter((a) => a.severity === 'warning').length}</span></span>
        <span className="text-slate-500">Unread: <span className="text-blue-400">{unread}</span></span>
      </div>
    </div>
  );
}
