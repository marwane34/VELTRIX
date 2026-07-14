import { useState } from 'react';
import { X } from 'lucide-react';
interface AddMachineModalProps { onClose: () => void; onAdd: (data: { name: string; location: string; description: string }) => void; }
export function AddMachineModal({ onClose, onAdd }: AddMachineModalProps) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), location: location.trim(), description: description.trim() });
    onClose();
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><span className="modal-title">Add New Machine</span><button className="btn-icon" onClick={onClose}><X size={18} /></button></div>
        <div className="modal-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><label style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Machine Name</label><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Main Pump #1" autoFocus /></div>
            <div><label style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Location</label><input className="input" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g., Building A - Floor 2" /></div>
            <div><label style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Description</label><input className="input" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g., Industrial water pump" /></div>
          </div>
        </div>
        <div className="modal-footer"><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={handleSubmit} disabled={!name.trim()}>Add Machine</button></div>
      </div>
    </div>
  );
}
