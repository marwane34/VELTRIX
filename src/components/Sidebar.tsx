import { Cpu, Plus, Thermometer, Zap, Activity, MapPin } from 'lucide-react';
import { useMonitoring } from '../contexts/MonitoringContext';
import type { Machine, MachineStatus } from '../types';

interface SidebarProps {
  onAddMachine: () => void;
  onSaveSettings?: () => void;
}

const statusColor: Record<MachineStatus, string> = {
  online: '#22c55e',
  offline: '#64748b',
  warning: '#eab308',
  critical: '#ef4444',
};

/** A single machine row in the sidebar list. */
function MachineRow({ machine, active, onClick, metrics }: {
  machine: Machine;
  active: boolean;
  onClick: () => void;
  metrics?: { temp: number; current: number; rmsX: number; rmsY: number };
}) {
  const color = statusColor[machine.status];
  return (
    <button
      onClick={onClick}
      className="w-full text-left transition-all"
      style={{
        padding: '8px 10px',
        background: active ? 'linear-gradient(90deg, rgba(59,130,246,0.1) 0%, rgba(59,130,246,0.02) 100%)' : 'transparent',
        borderLeft: active ? '2px solid #3b82f6' : '2px solid transparent',
        borderBottom: '1px solid #111827',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = '#111827'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <div className="flex items-center gap-2">
        <span
          className={machine.status === 'online' ? 'status-dot-active' : ''}
          style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: machine.status === 'online' ? `0 0 4px ${color}` : 'none' }}
        />
        <span className="text-[11px] font-semibold truncate" style={{ color: active ? '#e2e8f0' : '#c8d6ea', flex: 1 }}>{machine.name}</span>
      </div>
      <div className="flex items-center gap-1 mt-1 pl-4">
        <MapPin size={9} style={{ color: '#475569', flexShrink: 0 }} />
        <span className="text-[9px] truncate" style={{ color: '#64748b' }}>{machine.location || '—'}</span>
      </div>
      {active && metrics && (
        <div className="flex items-center gap-3 mt-1.5 pl-4">
          <span className="flex items-center gap-1 text-[9px]">
            <Thermometer size={9} className="val-orange" />
            <span className="val-orange font-semibold">{metrics.temp.toFixed(1)}°</span>
          </span>
          <span className="flex items-center gap-1 text-[9px]">
            <Zap size={9} className="val-yellow" />
            <span className="val-yellow font-semibold">{metrics.current.toFixed(2)}A</span>
          </span>
          <span className="flex items-center gap-1 text-[9px]">
            <Activity size={9} className="val-cyan" />
            <span className="val-cyan font-semibold">{((metrics.rmsX + metrics.rmsY) / 2).toFixed(2)}</span>
          </span>
        </div>
      )}
    </button>
  );
}

/**
 * Sidebar — machine list panel.
 * Shows ONLY the machine list with status, live metrics for the active machine,
 * and an "Add Machine" button at the bottom.
 */
export function Sidebar({ onAddMachine }: SidebarProps) {
  const { machines, selectedMachine, selectMachine, temperature, currentVal, rmsX, rmsY } = useMonitoring();

  const metrics = selectedMachine
    ? { temp: temperature, current: currentVal, rmsX, rmsY }
    : undefined;

  return (
    <div className="sidebar">
      {/* Header */}
      <div className="flex items-center justify-between px-3" style={{ height: 34, borderBottom: '1px solid #1e2d45', background: 'linear-gradient(180deg,#0d1525 0%,#0b1220 100%)', flexShrink: 0 }}>
        <div className="flex items-center gap-2">
          <Cpu size={14} style={{ color: '#3b82f6' }} />
          <span className="text-[10px] font-semibold tracking-wider" style={{ color: '#c8d6ea' }}>MACHINES</span>
        </div>
        <span className="flex items-center justify-center font-bold text-[9px]"
          style={{ minWidth: 18, height: 16, padding: '0 4px', color: '#60a5fa', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 2 }}>
          {machines.length}
        </span>
      </div>

      {/* Machine list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {machines.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2" style={{ padding: 32 }}>
            <Cpu size={24} style={{ color: '#475569', opacity: 0.6 }} />
            <span className="text-[10px] text-center" style={{ color: '#64748b' }}>No machines yet.<br />Add one to get started.</span>
          </div>
        ) : (
          machines.map((m) => (
            <MachineRow
              key={m.id}
              machine={m}
              active={selectedMachine?.id === m.id}
              onClick={() => selectMachine(m.id)}
              metrics={selectedMachine?.id === m.id ? metrics : undefined}
            />
          ))
        )}
      </div>

      {/* Bottom: Add Machine button */}
      <div style={{ padding: 8, borderTop: '1px solid #1e2d45', flexShrink: 0 }}>
        <button onClick={onAddMachine} className="btn-secondary w-full flex items-center justify-center gap-1.5">
          <Plus size={13} />
          <span>Add Machine</span>
        </button>
      </div>
    </div>
  );
}
