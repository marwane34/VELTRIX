import { useState } from 'react';
import { X } from 'lucide-react';
import type { Machine, MachineLimits } from '../types';
interface SetLimitsModalProps { onClose: () => void; machine: Machine; currentLimits: MachineLimits; onSave: (limits: MachineLimits) => void; }
export function SetLimitsModal({ onClose, machine, currentLimits, onSave }: SetLimitsModalProps) {
  const [limits, setLimits] = useState<MachineLimits>(currentLimits);
  const update = (key: keyof MachineLimits, value: number) => setLimits(prev => ({ ...prev, [key]: value }));
  const fields: { key: keyof MachineLimits; label: string; unit: string }[] = [
    { key: 'rmsMax', label: 'Vibration RMS Max', unit: 'g' }, { key: 'rmsMin', label: 'Vibration RMS Min', unit: 'g' },
    { key: 'tempMax', label: 'Temperature Max', unit: '°C' }, { key: 'tempMin', label: 'Temperature Min', unit: '°C' },
    { key: 'currentMax', label: 'Current Max', unit: 'A' }, { key: 'currentMin', label: 'Current Min', unit: 'A' },
  ];
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header"><span className="modal-title">Set Limits — {machine.name}</span><button className="btn-icon" onClick={onClose}><X size={18} /></button></div>
        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {fields.map(f => (
              <div key={f.key}><label style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>{f.label} ({f.unit})</label><input className="input" type="number" step="0.1" value={limits[f.key]} onChange={e => update(f.key, parseFloat(e.target.value) || 0)} /></div>
            ))}
          </div>
        </div>
        <div className="modal-footer"><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={() => { onSave(limits); onClose(); }}>Save Limits</button></div>
      </div>
    </div>
  );
}
