import { Plus, Cpu, CircleDot } from 'lucide-react';
import { useMonitoring } from '../contexts/MonitoringContext';

interface SidebarProps {
  onAddMachine: () => void;
  onSaveSettings: () => void;
}

export function Sidebar({ onAddMachine }: SidebarProps) {
  const { machines, selectedMachine, selectMachine, temperature, currentVal, rmsX, rmsY } = useMonitoring();

  return (
    <div className="sidebar">
      {/* Machine list header */}
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid #1e2d45',
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'linear-gradient(180deg, #111827 0%, #0d1220 100%)',
      }}>
        <Cpu size={13} color="#3b82f6" />
        <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '1px' }}>
          MACHINES
        </span>
        <span style={{
          fontSize: 9, fontWeight: 700, color: '#3b82f6',
          background: '#3b82f620', padding: '1px 6px', borderRadius: 8,
          marginLeft: 'auto',
        }}>
          {machines.length}
        </span>
      </div>

      {/* Machine list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {machines.length === 0 ? (
          <div style={{
            padding: 20, textAlign: 'center', color: '#64748b', fontSize: 11,
          }}>
            No machines yet.
            <br />
            Click "Add Machine" below.
          </div>
        ) : (
          machines.map((machine) => {
            const isActive = selectedMachine?.id === machine.id;
            const statusColor =
              machine.status === 'online' ? '#22c55e' :
              machine.status === 'warning' ? '#eab308' :
              machine.status === 'critical' ? '#ef4444' : '#64748b';

            return (
              <div
                key={machine.id}
                onClick={() => selectMachine(machine.id)}
                className={isActive ? 'machine-active' : ''}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #111827',
                  display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'background 0.1s',
                  background: isActive ? undefined : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = '#111827';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                {/* Status indicator */}
                <CircleDot
                  size={10}
                  color={statusColor}
                  className={isActive ? 'status-dot-active' : ''}
                  style={{ flexShrink: 0 }}
                />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 600,
                    color: isActive ? '#e2e8f0' : '#94a3b8',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {machine.name}
                  </div>
                  <div style={{ fontSize: 9, color: '#64748b', marginTop: 1 }}>
                    {machine.location || '—'}
                  </div>
                  {isActive && (
                    <div style={{
                      display: 'flex', gap: 8, marginTop: 4,
                      fontSize: 8.5, color: '#64748b',
                    }}>
                      <span><span className="val-orange">T</span> {temperature.toFixed(0)}°</span>
                      <span><span className="val-yellow">I</span> {currentVal.toFixed(1)}A</span>
                      <span><span className="val-blue">V</span> {((rmsX + rmsY) / 2).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Machine button */}
      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid #1e2d45',
        flexShrink: 0,
      }}>
        <button
          onClick={onAddMachine}
          className="btn-secondary"
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <Plus size={13} />
          Add Machine
        </button>
      </div>
    </div>
  );
}
