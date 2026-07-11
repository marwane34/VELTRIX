import { useState, FormEvent } from 'react';
import { X, Loader2, Cpu } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

/**
 * Modal form for registering a new machine. Inserts a row into the `machines`
 * table scoped to the authenticated user, then notifies the parent.
 */
export default function AddMachineModal({ onClose, onCreated }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!name.trim()) {
      setError('Machine name is required');
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error: insertError } = await supabase.from('machines').insert({
      user_id: user.id,
      name: name.trim(),
      location: location.trim(),
      description: description.trim(),
      status: 'online',
      rms_min: 0,
      rms_max: 2.0,
      temp_min: 0,
      temp_max: 90,
      current_min: 0,
      current_max: 10,
    });
    setSubmitting(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    onCreated();
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md" style={{ background: '#0e1726', border: '1px solid #1e2d45', boxShadow: '0 0 40px rgba(0,0,0,0.8)' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #1e2d45', background: 'linear-gradient(180deg,#151f33 0%,#0f1726 100%)' }}>
          <div className="flex items-center gap-2">
            <Cpu size={14} className="text-blue-400" />
            <span className="text-xs font-semibold text-slate-200 tracking-wide">ADD MACHINE</span>
          </div>
          <button onClick={onClose}><X size={14} className="text-slate-500 hover:text-slate-300" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-400 tracking-wide">NAME *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Pump-A1"
              style={inputStyle}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-400 tracking-wide">LOCATION</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Plant 1 / Floor 2"
              style={inputStyle}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-400 tracking-wide">DESCRIPTION</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes about this machine"
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
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
              {submitting ? 'Creating…' : 'Create Machine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
