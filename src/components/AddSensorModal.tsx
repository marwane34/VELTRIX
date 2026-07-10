import { useState } from 'react';
import { X, Wifi } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useMonitoring } from '../contexts/MonitoringContext';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

const SENSOR_TYPES = ['vibration', 'temperature', 'current', 'frequency', 'rpm', 'voltage', 'multi'];
const UNITS: Record<string, string> = {
  vibration: 'g', temperature: '°C', current: 'A', frequency: 'Hz', rpm: 'RPM', voltage: 'V', multi: 'mixed',
};

export function AddSensorModal({ onClose, onCreated }: Props) {
  const { user } = useAuth();
  const { machines } = useMonitoring();
  const [name, setName] = useState('');
  const [type, setType] = useState('vibration');
  const [machineId, setMachineId] = useState('');
  const [channel, setChannel] = useState('X');
  const [samplingRate, setSamplingRate] = useState('1000');
  const [minValue, setMinValue] = useState('0');
  const [maxValue, setMaxValue] = useState('100');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.from('sensors').insert({
      user_id: user.id,
      name: name.trim(),
      type,
      machine_id: machineId || null,
      channel,
      unit: UNITS[type] || 'g',
      sampling_rate: parseInt(samplingRate) || 1000,
      min_value: parseFloat(minValue) || 0,
      max_value: parseFloat(maxValue) || 100,
      description: description.trim(),
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    onCreated();
    onClose();
  }

  const iStyle = {
    background: '#060b14', border: '1px solid #1e2d45',
    color: '#e2e8f0', width: '100%', padding: '6px 10px',
    fontSize: 12, outline: 'none',
  } as React.CSSProperties;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md" style={{ background: '#0e1726', border: '1px solid #1e2d45', boxShadow: '0 0 40px rgba(0,0,0,0.8)' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #1e2d45', background: 'linear-gradient(180deg,#151f33 0%,#0f1726 100%)' }}>
          <div className="flex items-center gap-2">
            <Wifi size={13} className="text-blue-400" />
            <span className="text-xs font-semibold text-slate-200 tracking-wide">ADD NEW SENSOR</span>
          </div>
          <button onClick={onClose}><X size={14} className="text-slate-500 hover:text-slate-300" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Sensor Name *</label>
            <input style={iStyle} required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Vibration Sensor A1"
              onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; }} onBlur={(e) => { e.target.style.borderColor = '#1e2d45'; }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Type</label>
              <select style={iStyle} value={type} onChange={(e) => setType(e.target.value)}>
                {SENSOR_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Channel</label>
              <select style={iStyle} value={channel} onChange={(e) => setChannel(e.target.value)}>
                {['X', 'Y', 'Z', 'A', 'B', 'C', 'CH1', 'CH2', 'CH3'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Assign to Machine (optional)</label>
            <select style={iStyle} value={machineId} onChange={(e) => setMachineId(e.target.value)}>
              <option value="">-- Unassigned --</option>
              {machines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Sample Rate (Hz)</label>
              <input type="number" style={iStyle} value={samplingRate} onChange={(e) => setSamplingRate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Min Value</label>
              <input type="number" step="0.1" style={iStyle} value={minValue} onChange={(e) => setMinValue(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Max Value</label>
              <input type="number" step="0.1" style={iStyle} value={maxValue} onChange={(e) => setMaxValue(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Description</label>
            <textarea style={{ ...iStyle, resize: 'none', height: 50 }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional notes"
              onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; }} onBlur={(e) => { e.target.style.borderColor = '#1e2d45'; }} />
          </div>

          {error && <div className="text-xs px-2 py-1.5" style={{ background: '#1a0808', border: '1px solid #7f1d1d', color: '#fca5a5' }}>{error}</div>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 py-2">Cancel</button>
            <button type="submit" disabled={loading} className="btn-monitor flex-1 py-2">{loading ? 'Creating...' : 'Add Sensor'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
