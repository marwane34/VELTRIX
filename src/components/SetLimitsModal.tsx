import { useState, FormEvent, useEffect } from 'react';
import { X, SlidersHorizontal } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Machine } from '../types';

interface SetLimitsModalProps {
  machine: Machine;
  onClose: () => void;
  onSaved: () => void;
}

export default function SetLimitsModal({ machine, onClose, onSaved }: SetLimitsModalProps) {
  const [rmsMin, setRmsMin] = useState(String(machine.rms_min));
  const [rmsMax, setRmsMax] = useState(String(machine.rms_max));
  const [tempMin, setTempMin] = useState(String(machine.temp_min));
  const [tempMax, setTempMax] = useState(String(machine.temp_max));
  const [currentMin, setCurrentMin] = useState(String(machine.current_min));
  const [currentMax, setCurrentMax] = useState(String(machine.current_max));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRmsMin(String(machine.rms_min));
    setRmsMax(String(machine.rms_max));
    setTempMin(String(machine.temp_min));
    setTempMax(String(machine.temp_max));
    setCurrentMin(String(machine.current_min));
    setCurrentMax(String(machine.current_max));
  }, [machine]);

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

    const { error: updateError } = await supabase
      .from('machines')
      .update(payload)
      .eq('id', machine.id);

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
    background: '#060b14',
    border: '1px solid #1e2d45',
    color: '#e2e8f0',
    padding: '8px 10px',
    borderRadius: 4,
    fontSize: 13,
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11, color: '#94a3b8', marginBottom: 4, display: 'block', fontWeight: 600,
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
          width: 460,
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
            <SlidersHorizontal size={16} color="#3b82f6" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.5px' }}>
              SET LIMITS — {machine.name}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Vibration Limits */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', marginBottom: 6, letterSpacing: '0.5px' }}>
              VIBRATION (RMS)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>Min</label>
                <input type="number" step="0.01" value={rmsMin} onChange={(e) => setRmsMin(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Max</label>
                <input type="number" step="0.01" value={rmsMax} onChange={(e) => setRmsMax(e.target.value)} style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Temperature Limits */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#f97316', marginBottom: 6, letterSpacing: '0.5px' }}>
              TEMPERATURE (°C)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>Min</label>
                <input type="number" step="0.1" value={tempMin} onChange={(e) => setTempMin(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Max</label>
                <input type="number" step="0.1" value={tempMax} onChange={(e) => setTempMax(e.target.value)} style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Current Limits */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#eab308', marginBottom: 6, letterSpacing: '0.5px' }}>
              CURRENT (A)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>Min</label>
                <input type="number" step="0.01" value={currentMin} onChange={(e) => setCurrentMin(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Max</label>
                <input type="number" step="0.01" value={currentMax} onChange={(e) => setCurrentMax(e.target.value)} style={inputStyle} />
              </div>
            </div>
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
              {submitting ? 'Saving...' : 'Save Limits'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
