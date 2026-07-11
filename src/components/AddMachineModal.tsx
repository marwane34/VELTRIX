import { useState, type FormEvent } from 'react';
import { X, Loader2, Plus, MapPin, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface AddMachineModalProps {
  onClose: () => void;
  onCreated: () => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#0a1220',
  border: '1px solid #1e2d45',
  color: '#e2e8f0',
  fontSize: 12,
  padding: '7px 10px',
  outline: 'none',
  transition: 'border-color 0.15s',
};

/**
 * AddMachineModal — form to create a new machine.
 * Collects name, location, description and inserts into the 'machines' table.
 */
export default function AddMachineModal({ onClose, onCreated }: AddMachineModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) { setError('You must be signed in.'); return; }
    if (!name.trim()) { setError('Machine name is required.'); return; }

    setSaving(true);
    setError(null);
    try {
      const { error: insertError } = await supabase.from('machines').insert({
        user_id: user.id,
        name: name.trim(),
        location: location.trim() || '—',
        description: description.trim(),
        status: 'online',
        rms_min: 0,
        rms_max: 2.0,
        temp_min: 0,
        temp_max: 90,
        current_min: 0,
        current_max: 10,
      });
      if (insertError) throw new Error(insertError.message);
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create machine.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md" style={{ background: '#0e1726', border: '1px solid #1e2d45', boxShadow: '0 0 40px rgba(0,0,0,0.8)' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #1e2d45', background: 'linear-gradient(180deg,#151f33 0%,#0f1726 100%)' }}>
          <span className="text-xs font-semibold text-slate-200 tracking-wide">ADD MACHINE</span>
          <button onClick={onClose} disabled={saving} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={14} className="text-slate-500 hover:text-slate-300" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold tracking-wider flex items-center gap-1.5" style={{ color: '#94a3b8' }}>
              <Plus size={11} style={{ color: '#3b82f6' }} /> MACHINE NAME <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus
              placeholder="e.g. Pump Motor #1"
              style={inputStyle} onFocus={(e) => (e.currentTarget.style.borderColor = '#3b82f6')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#1e2d45')}
            />
          </div>

          {/* Location */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold tracking-wider flex items-center gap-1.5" style={{ color: '#94a3b8' }}>
              <MapPin size={11} style={{ color: '#3b82f6' }} /> LOCATION
            </label>
            <input
              type="text" value={location} onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Plant A - Line 3"
              style={inputStyle} onFocus={(e) => (e.currentTarget.style.borderColor = '#3b82f6')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#1e2d45')}
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold tracking-wider flex items-center gap-1.5" style={{ color: '#94a3b8' }}>
              <FileText size={11} style={{ color: '#3b82f6' }} /> DESCRIPTION
            </label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes about this machine..."
              rows={3} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#3b82f6')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#1e2d45')}
            />
          </div>

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
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              {saving ? 'Creating...' : 'Create Machine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
