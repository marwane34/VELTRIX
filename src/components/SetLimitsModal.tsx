import { useState } from 'react';
import { X, SlidersHorizontal } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Machine } from '../types';

interface Props {
  machine: Machine;
  onClose: () => void;
  onSaved: () => void;
}

export function SetLimitsModal({ machine, onClose, onSaved }: Props) {
  const [rmsMin, setRmsMin] = useState(String(machine.rms_min));
  const [rmsMax, setRmsMax] = useState(String(machine.rms_max));
  const [tempMin, setTempMin] = useState(String(machine.temp_min));
  const [tempMax, setTempMax] = useState(String(machine.temp_max));
  const [currMin, setCurrMin] = useState(String(machine.current_min));
  const [currMax, setCurrMax] = useState(String(machine.current_max));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.from('machines').update({
      rms_min: parseFloat(rmsMin),
      rms_max: parseFloat(rmsMax),
      temp_min: parseFloat(tempMin),
      temp_max: parseFloat(tempMax),
      current_min: parseFloat(currMin),
      current_max: parseFloat(currMax),
      updated_at: new Date().toISOString(),
    }).eq('id', machine.id);
    setLoading(false);
    if (err) { setError(err.message); return; }
    onSaved();
    onClose();
  }

  const iStyle = {
    background: '#060b14', border: '1px solid #1e2d45', color: '#e2e8f0',
    padding: '5px 8px', fontSize: 12, outline: 'none', width: '100%',
  } as React.CSSProperties;

  function Row({ label, unit, minVal, maxVal, onMin, onMax }: {
    label: string; unit: string;
    minVal: string; maxVal: string;
    onMin: (v: string) => void; onMax: (v: string) => void;
  }) {
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-400">{label}</span>
          <span className="text-xs text-slate-600">{unit}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs text-slate-600 mb-0.5">Min</div>
            <input type="number" step="0.1" style={iStyle} value={minVal} onChange={(e) => onMin(e.target.value)}
              onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; }} onBlur={(e) => { e.target.style.borderColor = '#1e2d45'; }} />
          </div>
          <div>
            <div className="text-xs text-slate-600 mb-0.5">Max</div>
            <input type="number" step="0.1" style={iStyle} value={maxVal} onChange={(e) => onMax(e.target.value)}
              onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; }} onBlur={(e) => { e.target.style.borderColor = '#1e2d45'; }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-sm" style={{ background: '#0e1726', border: '1px solid #1e2d45', boxShadow: '0 0 40px rgba(0,0,0,0.8)' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #1e2d45', background: 'linear-gradient(180deg,#151f33 0%,#0f1726 100%)' }}>
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={13} className="text-blue-400" />
            <span className="text-xs font-semibold text-slate-200 tracking-wide">SET MACHINE LIMITS — {machine.name}</span>
          </div>
          <button onClick={onClose}><X size={14} className="text-slate-500 hover:text-slate-300" /></button>
        </div>

        <form onSubmit={handleSave} className="p-4 space-y-3">
          <Row label="Vibration RMS" unit="g" minVal={rmsMin} maxVal={rmsMax} onMin={setRmsMin} onMax={setRmsMax} />
          <Row label="Temperature" unit="°C" minVal={tempMin} maxVal={tempMax} onMin={setTempMin} onMax={setTempMax} />
          <Row label="Current" unit="A" minVal={currMin} maxVal={currMax} onMin={setCurrMin} onMax={setCurrMax} />

          {error && <div className="text-xs px-2 py-1.5" style={{ background: '#1a0808', border: '1px solid #7f1d1d', color: '#fca5a5' }}>{error}</div>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 py-2">Cancel</button>
            <button type="submit" disabled={loading} className="btn-monitor flex-1 py-2">{loading ? 'Saving...' : 'Save Limits'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
