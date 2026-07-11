import { useState, FormEvent } from 'react';
import { X, Loader2, Sliders } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Machine } from '../types';

interface Props {
  machine: Machine;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Modal form for editing the safety thresholds of a machine. Updates the
 * `machines` row with the six min/max limit fields, then notifies the parent.
 */
export default function SetLimitsModal({ machine, onClose, onSaved }: Props) {
  const [rmsMin, setRmsMin] = useState(String(machine.rms_min));
  const [rmsMax, setRmsMax] = useState(String(machine.rms_max));
  const [tempMin, setTempMin] = useState(String(machine.temp_min));
  const [tempMax, setTempMax] = useState(String(machine.temp_max));
  const [currentMin, setCurrentMin] = useState(String(machine.current_min));
  const [currentMax, setCurrentMax] = useState(String(machine.current_max));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      rms_min: parseFloat(rmsMin) || 0,
      rms_max: parseFloat(rmsMax) || 0,
      temp_min: parseFloat(tempMin) || 0,
      temp_max: parseFloat(tempMax) || 0,
      current_min: parseFloat(currentMin) || 0,
      current_max: parseFloat(currentMax) || 0,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase.from('machines').update(payload).eq('id', machine.id);
    setSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    onSaved();
    onClose();
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#080d14',
    border: '1px solid #1e2d45',
    color: '#e2e8f0',
    fontSize: 12,
    padding: '7px 10px',
    outline: 'none',
  };

  const field = (
    label: string,
    value: string,
    setter: (v: string) => void,
    accent: string,
  ) => (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] tracking-wide" style={{ color: accent }}>{label}</label>
      <input
        type="number"
        step="any"
        value={value}
        onChange={(e) => setter(e.target.value)}
        style={inputStyle}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md" style={{ background: '#0e1726', border: '1px solid #1e2d45', boxShadow: '0 0 40px rgba(0,0,0,0.8)' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #1e2d45', background: 'linear-gradient(180deg,#151f33 0%,#0f1726 100%)' }}>
          <div className="flex items-center gap-2">
            <Sliders size={14} className="text-blue-400" />
            <span className="text-xs font-semibold text-slate-200 tracking-wide">SET LIMITS — {machine.name}</span>
          </div>
          <button onClick={onClose}><X size={14} className="text-slate-500 hover:text-slate-300" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-cyan-400 tracking-wide font-semibold">VIBRATION RMS</span>
            <div className="grid grid-cols-2 gap-2">
              {field('MIN (mm/s)', rmsMin, setRmsMin, '#64748b')}
              {field('MAX (mm/s)', rmsMax, setRmsMax, '#64748b')}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-orange-400 tracking-wide font-semibold">TEMPERATURE</span>
            <div className="grid grid-cols-2 gap-2">
              {field('MIN (°C)', tempMin, setTempMin, '#64748b')}
              {field('MAX (°C)', tempMax, setTempMax, '#64748b')}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-yellow-400 tracking-wide font-semibold">CURRENT</span>
            <div className="grid grid-cols-2 gap-2">
              {field('MIN (A)', currentMin, setCurrentMin, '#64748b')}
              {field('MAX (A)', currentMax, setCurrentMax, '#64748b')}
            </div>
          </div>

          {error && (
            <div className="px-2 py-1.5 text-[10px] text-red-400" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-monitor" disabled={submitting} style={{ opacity: submitting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
              {submitting ? <Loader2 size={12} className="animate-spin" /> : null}
              {submitting ? 'Saving…' : 'Save Limits'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
