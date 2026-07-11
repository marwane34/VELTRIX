import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Machine } from '../types';

interface SetLimitsModalProps {
  machine: Machine;
  onClose: () => void;
  onSaved: () => void;
}

const COLORS = {
  border: '#1e2d45',
  inputBg: '#060b14',
  inputText: '#e2e8f0',
  text: '#94a3b8',
};

interface LimitFields {
  rms_min: string;
  rms_max: string;
  temp_min: string;
  temp_max: string;
  current_min: string;
  current_max: string;
}

export default function SetLimitsModal({ machine, onClose, onSaved }: SetLimitsModalProps) {
  const [form, setForm] = useState<LimitFields>({
    rms_min: String(machine.rms_min),
    rms_max: String(machine.rms_max),
    temp_min: String(machine.temp_min),
    temp_max: String(machine.temp_max),
    current_min: String(machine.current_min),
    current_max: String(machine.current_max),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(key: keyof LimitFields, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const rms_min = parseFloat(form.rms_min);
    const rms_max = parseFloat(form.rms_max);
    const temp_min = parseFloat(form.temp_min);
    const temp_max = parseFloat(form.temp_max);
    const current_min = parseFloat(form.current_min);
    const current_max = parseFloat(form.current_max);

    if ([rms_min, rms_max, temp_min, temp_max, current_min, current_max].some(isNaN)) {
      setError('All fields must be valid numbers');
      return;
    }
    if (rms_min >= rms_max || temp_min >= temp_max || current_min >= current_max) {
      setError('Minimum values must be less than maximum values');
      return;
    }

    setLoading(true);
    setError(null);

    const { error: updateError } = await supabase
      .from('machines')
      .update({
        rms_min,
        rms_max,
        temp_min,
        temp_max,
        current_min,
        current_max,
        updated_at: new Date().toISOString(),
      })
      .eq('id', machine.id);

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    onSaved();
    onClose();
  }

  const inputStyle: React.CSSProperties = {
    background: COLORS.inputBg,
    border: `1px solid ${COLORS.border}`,
    color: COLORS.inputText,
  };

  function LimitInput({ label, k, unit }: { label: string; k: keyof LimitFields; unit: string }) {
    return (
      <div>
        <label className="block text-[10px] mb-1 tracking-wider" style={{ color: COLORS.text }}>
          {label} ({unit})
        </label>
        <input
          type="number"
          step="any"
          value={form[k]}
          onChange={(e) => update(k, e.target.value)}
          className="w-full px-3 py-2 text-xs outline-none focus:border-blue-500"
          style={inputStyle}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div
        className="w-full max-w-md"
        style={{ background: '#0e1726', border: `1px solid ${COLORS.border}`, boxShadow: '0 0 40px rgba(0,0,0,0.8)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{
            borderBottom: `1px solid ${COLORS.border}`,
            background: 'linear-gradient(180deg,#151f33 0%,#0f1726 100%)',
          }}
        >
          <span className="text-xs font-semibold text-slate-200 tracking-wide">
            SET LIMITS — {machine.name}
          </span>
          <button onClick={onClose}>
            <X size={14} className="text-slate-500 hover:text-slate-300" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <LimitInput label="Vibration Min" k="rms_min" unit="mm/s" />
            <LimitInput label="Vibration Max" k="rms_max" unit="mm/s" />
            <LimitInput label="Temp Min" k="temp_min" unit="°C" />
            <LimitInput label="Temp Max" k="temp_max" unit="°C" />
            <LimitInput label="Current Min" k="current_min" unit="A" />
            <LimitInput label="Current Max" k="current_max" unit="A" />
          </div>

          {error && (
            <div className="text-[11px] px-3 py-2" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-monitor flex items-center gap-1.5">
              {loading && <Loader2 size={12} className="animate-spin" />}
              {loading ? 'Saving...' : 'Save Limits'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
