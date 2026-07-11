import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface AddMachineModalProps {
  onClose: () => void;
  onCreated: () => void;
}

const COLORS = {
  border: '#1e2d45',
  inputBg: '#060b14',
  inputText: '#e2e8f0',
  text: '#94a3b8',
};

export default function AddMachineModal({ onClose, onCreated }: AddMachineModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setLoading(true);
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
      temp_max: 80,
      current_min: 0,
      current_max: 5,
    });

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    onCreated();
    onClose();
  }

  const inputStyle: React.CSSProperties = {
    background: COLORS.inputBg,
    border: `1px solid ${COLORS.border}`,
    color: COLORS.inputText,
  };

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
          <span className="text-xs font-semibold text-slate-200 tracking-wide">ADD NEW MACHINE</span>
          <button onClick={onClose}>
            <X size={14} className="text-slate-500 hover:text-slate-300" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block text-[10px] mb-1 tracking-wider" style={{ color: COLORS.text }}>
              NAME *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Pump Station A"
              className="w-full px-3 py-2 text-xs outline-none focus:border-blue-500"
              style={inputStyle}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[10px] mb-1 tracking-wider" style={{ color: COLORS.text }}>
              LOCATION
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Building 3 - Floor 2"
              className="w-full px-3 py-2 text-xs outline-none focus:border-blue-500"
              style={inputStyle}
            />
          </div>

          <div>
            <label className="block text-[10px] mb-1 tracking-wider" style={{ color: COLORS.text }}>
              DESCRIPTION
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the machine..."
              rows={3}
              className="w-full px-3 py-2 text-xs outline-none focus:border-blue-500 resize-none"
              style={inputStyle}
            />
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
              {loading ? 'Creating...' : 'Create Machine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
