import { useState } from 'react';
import { Trash2, Settings, LayoutDashboard, Cpu } from 'lucide-react';
import { useMonitoring } from '../contexts/MonitoringContext';
import { useToast } from '../components/Toast';
import { Sidebar } from '../components/Sidebar';
import { AddMachineModal } from '../components/AddMachineModal';
import { SetLimitsModal } from '../components/SetLimitsModal';
import type { Machine, MachineLimits } from '../types';

export function MachinesPage() {
  const { machines, selectMachine, addMachine, removeMachine, setMachineLimits } = useMonitoring();
  const { showSuccess, showError } = useToast();

  const [showAdd, setShowAdd] = useState(false);
  const [limitsMachine, setLimitsMachine] = useState<Machine | null>(null);

  const handleAdd = async (data: { name: string; location: string; description: string }) => {
    const ok = await addMachine(data);
    if (ok) {
      showSuccess(`Machine "${data.name}" added successfully.`);
    } else {
      showError('Failed to add machine. Please try again.');
    }
  };

  const handleDelete = async (machine: Machine) => {
    const ok = await removeMachine(machine.id);
    if (ok) {
      showSuccess(`Machine "${machine.name}" deleted.`);
    } else {
      showError('Failed to delete machine. Please try again.');
    }
  };

  const handleSetLimits = async (limits: MachineLimits) => {
    if (!limitsMachine) return;
    const ok = await setMachineLimits(limitsMachine.id, limits);
    if (ok) {
      showSuccess(`Limits updated for "${limitsMachine.name}".`);
    } else {
      showError('Failed to update limits. Please try again.');
    }
  };

  const constructLimits = (m: Machine): MachineLimits => ({
    rmsMin: Number(m.rms_min ?? 0.5),
    rmsMax: Number(m.rms_max ?? 3.0),
    tempMin: Number(m.temp_min ?? 20),
    tempMax: Number(m.temp_max ?? 85),
    currentMin: Number(m.current_min ?? 0.5),
    currentMax: Number(m.current_max ?? 5.0),
  });

  return (
    <>
      <div style={{ display: 'flex', height: '100%' }}>
        <Sidebar onAddMachine={() => setShowAdd(true)} />
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Machines</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {machines.length} machine{machines.length !== 1 ? 's' : ''} registered
            </p>
          </div>

          {machines.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 60,
                color: 'var(--text-muted)',
              }}
            >
              <Cpu size={48} style={{ marginBottom: 12 }} />
              <p style={{ fontSize: 14, marginBottom: 12 }}>No machines registered yet.</p>
              <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
                Add Your First Machine
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
              {machines.map((m) => (
                <div key={m.id} className="panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Header row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`status-dot status-${m.status}`} />
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{m.name}</span>
                    </div>
                    <span className={`badge badge-${m.status === 'critical' ? 'critical' : m.status === 'warning' ? 'warning' : m.status === 'online' ? 'success' : 'info'}`}>
                      {m.status}
                    </span>
                  </div>

                  {/* Location + Description */}
                  <div>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Location:</span> {m.location || '—'}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Description:</span> {m.description || '—'}
                    </p>
                  </div>

                  {/* Limits display */}
                  <div
                    style={{
                      padding: 10,
                      borderRadius: 6,
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-primary)',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      gap: 8,
                    }}
                  >
                    <div>
                      <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>RMS (g)</span>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                        {Number(m.rms_min ?? 0).toFixed(1)} – {Number(m.rms_max ?? 0).toFixed(1)}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Temp (°C)</span>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                        {Number(m.temp_min ?? 0).toFixed(0)} – {Number(m.temp_max ?? 0).toFixed(0)}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Current (A)</span>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                        {Number(m.current_min ?? 0).toFixed(1)} – {Number(m.current_max ?? 0).toFixed(1)}
                      </p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => selectMachine(m)}
                      style={{ flex: 1, gap: 6, fontSize: 12 }}
                    >
                      <LayoutDashboard size={13} />
                      View Dashboard
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setLimitsMachine(m)}
                      style={{ gap: 6, fontSize: 12 }}
                      title="Set Limits"
                    >
                      <Settings size={13} />
                      Limits
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleDelete(m)}
                      style={{ gap: 6, fontSize: 12, color: 'var(--accent-red)' }}
                      title="Delete Machine"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Machine Modal (conditional) */}
      {showAdd && (
        <AddMachineModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />
      )}

      {/* Set Limits Modal (conditional) */}
      {limitsMachine && (
        <SetLimitsModal
          onClose={() => setLimitsMachine(null)}
          machine={limitsMachine}
          currentLimits={constructLimits(limitsMachine)}
          onSave={handleSetLimits}
        />
      )}
    </>
  );
}

export default MachinesPage;
