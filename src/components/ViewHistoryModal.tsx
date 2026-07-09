import { useEffect, useState } from 'react';
import { X, History, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Machine, Alert, Prediction } from '../types';

interface Props {
  machine: Machine | null;
  onClose: () => void;
}

type Tab = 'alerts' | 'predictions' | 'maintenance';

interface MaintenanceLog {
  id: string;
  action: string;
  notes: string;
  performed_by: string;
  performed_at: string;
}

export function ViewHistoryModal({ machine, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('alerts');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!machine) return;
    setLoading(true);
    Promise.all([
      supabase.from('alerts').select('*').eq('machine_id', machine.id).order('created_at', { ascending: false }).limit(50),
      supabase.from('predictions').select('*').eq('machine_id', machine.id).order('predicted_at', { ascending: false }).limit(30),
      supabase.from('maintenance_logs').select('*').eq('machine_id', machine.id).order('performed_at', { ascending: false }).limit(30),
    ]).then(([a, p, m]) => {
      setAlerts(a.data ?? []);
      setPredictions(p.data ?? []);
      setLogs(m.data ?? []);
      setLoading(false);
    });
  }, [machine]);

  function formatTime(ts: string) {
    return new Date(ts).toLocaleString(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  const tabStyle = (active: boolean) => ({
    padding: '5px 12px', fontSize: 11, cursor: 'pointer',
    background: active ? 'linear-gradient(180deg,#1a3a6a 0%,#0f2040 100%)' : 'transparent',
    border: `1px solid ${active ? '#3b82f6' : '#1e2d45'}`,
    color: active ? '#93c5fd' : '#64748b',
  } as React.CSSProperties);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-2xl" style={{ background: '#0e1726', border: '1px solid #1e2d45', boxShadow: '0 0 40px rgba(0,0,0,0.8)', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: '1px solid #1e2d45', background: 'linear-gradient(180deg,#151f33 0%,#0f1726 100%)' }}>
          <div className="flex items-center gap-2">
            <History size={13} className="text-blue-400" />
            <span className="text-xs font-semibold text-slate-200 tracking-wide">HISTORY — {machine?.name}</span>
          </div>
          <button onClick={onClose}><X size={14} className="text-slate-500 hover:text-slate-300" /></button>
        </div>

        <div className="flex gap-1 px-4 pt-3 shrink-0">
          <button style={tabStyle(tab === 'alerts')} onClick={() => setTab('alerts')}>Alerts ({alerts.length})</button>
          <button style={tabStyle(tab === 'predictions')} onClick={() => setTab('predictions')}>Predictions ({predictions.length})</button>
          <button style={tabStyle(tab === 'maintenance')} onClick={() => setTab('maintenance')}>Maintenance ({logs.length})</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading && <div className="text-xs text-slate-500 text-center py-8">Loading...</div>}

          {!loading && tab === 'alerts' && (
            <div className="space-y-1">
              {alerts.length === 0 && <div className="text-xs text-slate-500 text-center py-8">No alerts recorded</div>}
              {alerts.map((a) => (
                <div key={a.id} className="flex items-start gap-3 px-3 py-2" style={{ background: '#080d14', borderBottom: '1px solid #1a2540' }}>
                  {a.severity === 'critical' ? <AlertTriangle size={11} className="text-red-400 mt-0.5 shrink-0" />
                    : a.severity === 'warning' ? <AlertTriangle size={11} className="text-yellow-400 mt-0.5 shrink-0" />
                    : <CheckCircle size={11} className="text-green-400 mt-0.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-slate-300">{a.message}</div>
                    <div className="text-xs text-slate-600 mt-0.5">{formatTime(a.created_at)} · {a.type.replace(/_/g,' ')}</div>
                  </div>
                  <span className="text-xs shrink-0" style={{ color: a.severity === 'critical' ? '#f87171' : a.severity === 'warning' ? '#facc15' : '#4ade80' }}>
                    {a.severity}
                  </span>
                </div>
              ))}
            </div>
          )}

          {!loading && tab === 'predictions' && (
            <div className="space-y-1">
              {predictions.length === 0 && <div className="text-xs text-slate-500 text-center py-8">No predictions recorded yet</div>}
              {predictions.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-3 py-2" style={{ background: '#080d14', borderBottom: '1px solid #1a2540' }}>
                  <TrendingUp size={11} className="text-blue-400 shrink-0" />
                  <div className="flex-1 text-xs">
                    <span className="text-slate-300">Health: </span>
                    <span style={{ color: p.health_score >= 70 ? '#4ade80' : p.health_score >= 40 ? '#facc15' : '#f87171' }}>{p.health_score}%</span>
                    <span className="text-slate-500 ml-3">Bearing: {p.bearing_wear_pct}%</span>
                    <span className="text-slate-500 ml-2">Overheat: {p.overheating_risk_pct}%</span>
                    <span className="text-slate-500 ml-2">RUL: {p.rul_hours}h</span>
                  </div>
                  <span className="text-xs text-slate-600 shrink-0">{formatTime(p.predicted_at)}</span>
                </div>
              ))}
            </div>
          )}

          {!loading && tab === 'maintenance' && (
            <div className="space-y-1">
              {logs.length === 0 && <div className="text-xs text-slate-500 text-center py-8">No maintenance logs recorded</div>}
              {logs.map((l) => (
                <div key={l.id} className="px-3 py-2" style={{ background: '#080d14', borderBottom: '1px solid #1a2540' }}>
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-slate-200">{l.action}</span>
                    <span className="text-xs text-slate-600 shrink-0 ml-2">{formatTime(l.performed_at)}</span>
                  </div>
                  {l.notes && <div className="text-xs text-slate-500 mt-0.5">{l.notes}</div>}
                  <div className="text-xs text-slate-600 mt-0.5">by {l.performed_by}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 pb-3 shrink-0">
          <button onClick={onClose} className="btn-secondary px-6 py-2">Close</button>
        </div>
      </div>
    </div>
  );
}
