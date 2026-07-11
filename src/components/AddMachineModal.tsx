import { useState, FormEvent } from 'react';
import { X, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface AddMachineModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export default function AddMachineModal({ onClose, onCreated }: AddMachineModalProps) {
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
      temp_max: 80,
      current_min: 0,
      current_max: 5.0,
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
    background: '#060b14',
    border: '1px solid #1e2d45',
    color: '#e2e8f0',
    padding: '8px 10px',
    borderRadius: 4,
    fontSize: 13,
    outline: 'none',
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#0e1726',
          border: '1px solid #1e2d45',
          borderRadius: 8,
          width: 420,
          maxWidth: '90vw',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderBottom: '1px solid #1e2d45',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={16} color="#3b82f6" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.5px' }}>
              ADD MACHINE
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4, display: 'block', fontWeight: 600 }}>
              Machine Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Pump Station A1"
              style={inputStyle}
              autoFocus
            />
          </div>

          <div>
            <label style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4, display: 'block', fontWeight: 600 }}>
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Building B, Floor 2"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4, display: 'block', fontWeight: 600 }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the machine..."
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {error && (
            <div style={{ fontSize: 12, color: '#ef4444', padding: '6px 10px', background: '#ef444410', borderRadius: 4, border: '1px solid #ef444440' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-monitor" disabled={submitting} style={{ opacity: submitting ? 0.6 : 1 }}>
              {submitting ? 'Creating...' : 'Add Machine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
