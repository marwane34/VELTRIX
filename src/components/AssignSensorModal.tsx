import { useState } from 'react';
import { X, Cpu, Link2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Sensor, Machine } from '../types';

interface Props {
  sensor: Sensor;
  machines: Machine[];
  onClose: () => void;
  onSaved: () => void;
}

export function AssignSensorModal({ sensor, machines, onClose, onSaved }: Props) {
  const [machineId, setMachineId] = useState(sensor.machine_id || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.from('sensors').update({
      machine_id: machineId || null,
      updated_at: new Date().toISOString(),
    }).eq('id', sensor.id);
    setLoading(false);
    if (err) { setError(err.message); return; }
    onSaved();
    onClose();
  }

  const iStyle = {
    background: '#060b14', border: '1px solid #1e2d45',
    color: '#e2e8f0', width: '100%', padding: '6px 10px',
    fontSize: 12, outline: 'none',
  } as React.CSSProperties;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-sm" style={{ background: '#0e1726', border: '1px solid #1e2d45', boxShadow: '0 0 40px rgba(0,0,0,0.8)' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #1e2d45', background: 'linear-gradient(180deg,#151f33 0%,#0f1726 100%)' }}>
          <div className="flex items-center gap-2">
            <Link2 size={13} className="text-blue-400" />
            <span className="text-xs font-semibold text-slate-200 tracking-wide">ASSIGN SENSOR — {sensor.name}</span>
          </div>
          <button onClick={onClose}><X size={14} className="text-slate-500 hover:text-slate-300" /></button>
        </div>

        <form onSubmit={handleAssign} className="p-4 space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Select Machine</label>
            <select style={iStyle} value={machineId} onChange={(e) => setMachineId(e.target.value)}>
              <option value="">-- Unassigned --</option>
              {machines.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.location || 'no location'})</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 py-2" style={{ background: '#060b14', border: '1px solid #1e2d45' }}>
            <Cpu size={11} className="text-slate-500" />
            <span className="text-xs text-slate-500">Sensor: {sensor.type} · Channel {sensor.channel} · {sensor.unit}</span>
          </div>

          {error && <div className="text-xs px-2 py-1.5" style={{ background: '#1a0808', border: '1px solid #7f1d1d', color: '#fca5a5' }}>{error}</div>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 py-2">Cancel</button>
            <button type="submit" disabled={loading} className="btn-monitor flex-1 py-2">{loading ? 'Saving...' : 'Assign'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
