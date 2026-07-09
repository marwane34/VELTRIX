import { useState } from 'react';
import { X, Cpu } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export function AddMachineModal({ onClose, onCreated }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.from('machines').insert({
      user_id: user.id,
      name: name.trim(),
      location: location.trim(),
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
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #1e2d45', background: 'linear-gradient(180deg,#151f33 0%,#0f1726 100%)' }}>
          <div className="flex items-center gap-2">
            <Cpu size={13} className="text-blue-400" />
            <span className="text-xs font-semibold text-slate-200 tracking-wide">ADD NEW MACHINE</span>
          </div>
          <button onClick={onClose}><X size={14} className="text-slate-500 hover:text-slate-300" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Machine Name *</label>
            <input style={iStyle} required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Compressor Unit 01"
              onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; }} onBlur={(e) => { e.target.style.borderColor = '#1e2d45'; }} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Location</label>
            <input style={iStyle} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Building A, Line 3"
              onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; }} onBlur={(e) => { e.target.style.borderColor = '#1e2d45'; }} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Description</label>
            <textarea
              style={{ ...iStyle, resize: 'none', height: 60 }}
              value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional notes"
              onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; }} onBlur={(e) => { e.target.style.borderColor = '#1e2d45'; }}
            />
          </div>

          {error && <div className="text-xs px-2 py-1.5" style={{ background: '#1a0808', border: '1px solid #7f1d1d', color: '#fca5a5' }}>{error}</div>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 py-2">Cancel</button>
            <button type="submit" disabled={loading} className="btn-monitor flex-1 py-2">{loading ? 'Creating...' : 'Add Machine'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
