import { useState, type FormEvent } from 'react';
import { X, Loader2, SlidersHorizontal, Thermometer, Zap, Activity } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Machine } from '../types';

interface SetLimitsModalProps {
  machine: Machine;
  onClose: () => void;
  onSaved: () => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#0a1220',
  border: '1px solid #1e2d45',
  color: '#e2e8f0',
  fontSize: 12,
  padding: '6px 8px',
  outline: 'none',
  transition: 'border-color 0.15s',
};

/** A labeled numeric input row. */
function LimitField({ label, icon: Icon, color, min, max, onChange }: {
  label: string; icon: typeof Thermometer; color: string;
  min: number; max: number;
  onChange: (min: number, max: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-semibold tracking-wider flex items-center gap-1.5" style={{ color: '#94a3b8' }}>
        <Icon size={11} style={{ color }} /> {label}
      </label>
      <div className="flex items-center gap-2">
        <div className="flex flex-col flex-1">
          <span className="text-[8px] tracking-wider" style={{ color: '#64748b' }}>MIN</span>
          <input type="number" step="any" defaultValue={min}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0, max)}
            style={inputStyle} onFocus={(e) => (e.currentTarget.style.borderColor = color)}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#1e2d45')} />
        </div>
        <span className="text-slate-600 text-xs mt-4">→</span>
        <div className="flex flex-col flex-1">
          <span className="text-[8px] tracking-wider" style={{ color: '#64748b' }}>MAX</span>
          <input type="number" step="any" defaultValue={max}
            onChange={(e) => onChange(min, parseFloat(e.target.value) || 0)}
            style={inputStyle} onFocus={(e) => (e.currentTarget.style.borderColor = color)}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#1e2d45')} />
        </div>
      </div>
    </div>
  );
}

/**
 * SetLimitsModal — form to adjust a machine's safety thresholds.
 * Edits rms_min/max, temp_min/max, current_min/max on the 'machines' table.
 */
export default function SetLimitsModal({ machine, onClose, onSaved }: SetLimitsModalProps) {
  const [rmsMin, setRmsMin] = useState(machine.rms_min);
  const [rmsMax, setRmsMax] = useState(machine.rms_max);
  const [tempMin, setTempMin] = useState(machine.temp_min);
  const [tempMax, setTempMax] = useState(machine.temp_max);
  const [currMin, setCurrMin] = useState(machine.current_min);
  const [currMax, setCurrMax] = useState(machine.current_max);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    // Basic validation: max must exceed min.
    if (rmsMax <= rmsMin) { setError('Vibration max must be greater than min.'); return; }
    if (tempMax <= tempMin) { setError('Temperature max must be greater than min.'); return; }
    if (currMax <= currMin) { setError('Current max must be greater than min.'); return; }

    setSaving(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from('machines')
        .update({
          rms_min: rmsMin, rms_max: rmsMax,
          temp_min: tempMin, temp_max: tempMax,
          current_min: currMin, current_max: currMax,
          updated_at: new Date().toISOString(),
        })
        .eq('id', machine.id);
      if (updateError) throw new Error(updateError.message);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save limits.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md" style={{ background: '#0e1726', border: '1px solid #1e2d45', boxShadow: '0 0 40px rgba(0,0,0,0.8)' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #1e2d45', background: 'linear-gradient(180deg,#151f33 0%,#0f1726 100%)' }}>
          <span className="text-xs font-semibold text-slate-200 tracking-wide">SET SAFETY LIMITS — {machine.name}</span>
          <button onClick={onClose} disabled={saving} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={14} className="text-slate-500 hover:text-slate-300" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-2 px-2.5 py-2" style={{ background: '#0a1220', border: '1px solid #1a2540' }}>
            <SlidersHorizontal size={12} style={{ color: '#3b82f6' }} />
            <span className="text-[10px]" style={{ color: '#94a3b8' }}>Define alert thresholds for anomaly detection.</span>
          </div>

          <LimitField label="VIBRATION (RMS mm/s)" icon={Activity} color="#06b6d4"
            min={rmsMin} max={rmsMax}
            onChange={(mn, mx) => { setRmsMin(mn); setRmsMax(mx); }} />

          <LimitField label="TEMPERATURE (°C)" icon={Thermometer} color="#f97316"
            min={tempMin} max={tempMax}
            onChange={(mn, mx) => { setTempMin(mn); setTempMax(mx); }} />

          <LimitField label="CURRENT (A)" icon={Zap} color="#eab308"
            min={currMin} max={currMax}
            onChange={(mn, mx) => { setCurrMin(mn); setCurrMax(mx); }} />

          {error && (
            <div className="px-2.5 py-2 text-[11px]" style={{ color: '#f87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={saving} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-monitor flex items-center gap-1.5"
              style={{ opacity: saving ? 0.7 : 1, cursor: saving ? 'wait' : 'pointer' }}>
              {saving ? <Loader2 size={12} className="animate-spin" /> : <SlidersHorizontal size={12} />}
              {saving ? 'Saving...' : 'Save Limits'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
