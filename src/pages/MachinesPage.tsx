import { useState } from 'react';
import { Plus, Cpu, MapPin, Trash2, Settings2, Activity } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useMonitoring } from '../contexts/MonitoringContext';
import { AddMachineModal } from '../components/AddMachineModal';
import { SetLimitsModal } from '../components/SetLimitsModal';
import type { Machine } from '../types';

export function MachinesPage() {
  const { machines, refreshMachines, selectMachine } = useMonitoring();
  const [showAdd, setShowAdd] = useState(false);
  const [editLimits, setEditLimits] = useState<Machine | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function deleteMachine(id: string) {
    if (!confirm('Delete this machine and all its data?')) return;
    setDeleting(id);
    await supabase.from('machines').delete().eq('id', id);
    setDeleting(null);
    refreshMachines();
  }

  function statusColor(s: string) {
    return s === 'online' ? '#22c55e' : s === 'warning' ? '#eab308' : s === 'critical' ? '#ef4444' : '#64748b';
  }

  return (
    <div className="flex flex-col h-full" style={{ background: '#0b0f1a' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: '1px solid #1e2d45', background: 'linear-gradient(180deg,#111827 0%,#0b0f1a 100%)' }}>
        <div className="flex items-center gap-2">
          <Cpu size={16} className="text-blue-400" />
          <h2 className="text-sm font-semibold text-slate-200 tracking-wide">MACHINE MANAGEMENT</h2>
          <span className="text-xs px-1.5 py-0.5" style={{ background: '#0d1f3c', border: '1px solid #1e4080', color: '#60a5fa' }}>
            {machines.length} machines
          </span>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-monitor flex items-center gap-1.5 px-3 py-1.5">
          <Plus size={11} />
          <span>Add Machine</span>
        </button>
      </div>

      {/* Machine grid */}
      <div className="flex-1 overflow-y-auto p-5">
        {machines.length === 0 ? (
          <div className="text-center py-20">
            <Cpu size={40} className="text-slate-700 mx-auto mb-4" />
            <div className="text-sm text-slate-400 mb-2">No machines configured</div>
            <div className="text-xs text-slate-600 mb-5">Add your first machine to start monitoring</div>
            <button onClick={() => setShowAdd(true)} className="btn-monitor px-6 py-2">Add Machine</button>
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {machines.map((m) => (
              <div key={m.id} className="panel p-4 flex flex-col gap-3">
                {/* Machine header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: statusColor(m.status), boxShadow: `0 0 4px ${statusColor(m.status)}` }} />
                      <span className="text-sm font-semibold text-slate-200">{m.name}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin size={10} className="text-slate-600" />
                      <span className="text-xs text-slate-500">{m.location || 'No location'}</span>
                    </div>
                  </div>
                  <span
                    className="text-xs px-2 py-0.5 font-semibold"
                    style={{
                      background: `${statusColor(m.status)}18`,
                      border: `1px solid ${statusColor(m.status)}40`,
                      color: statusColor(m.status),
                    }}
                  >
                    {m.status.toUpperCase()}
                  </span>
                </div>

                {/* Description */}
                {m.description && <p className="text-xs text-slate-500">{m.description}</p>}

                {/* Thresholds */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Vibration', val: `${m.rms_min}–${m.rms_max}g`, color: '#3b82f6' },
                    { label: 'Temp', val: `${m.temp_min}–${m.temp_max}°C`, color: '#ef4444' },
                    { label: 'Current', val: `${m.current_min}–${m.current_max}A`, color: '#eab308' },
                  ].map((t) => (
                    <div key={t.label} className="text-center px-2 py-1.5" style={{ background: '#060b14', border: '1px solid #1a2540' }}>
                      <div className="text-xs font-bold" style={{ color: t.color }}>{t.val}</div>
                      <div className="text-xs text-slate-600">{t.label}</div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => { selectMachine(m.id); }} className="btn-monitor flex items-center gap-1 flex-1 py-1.5 justify-center">
                    <Activity size={10} /> Monitor
                  </button>
                  <button onClick={() => setEditLimits(m)} className="btn-secondary flex items-center gap-1 flex-1 py-1.5 justify-center">
                    <Settings2 size={10} /> Limits
                  </button>
                  <button
                    onClick={() => deleteMachine(m.id)}
                    disabled={deleting === m.id}
                    className="btn-secondary py-1.5 px-2.5"
                    title="Delete machine"
                    style={{ borderColor: '#3b1818', color: '#f87171' }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>

                <div className="text-xs text-slate-600">Added {new Date(m.created_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdd && <AddMachineModal onClose={() => setShowAdd(false)} onCreated={refreshMachines} />}
      {editLimits && <SetLimitsModal machine={editLimits} onClose={() => setEditLimits(null)} onSaved={refreshMachines} />}
    </div>
  );
}
