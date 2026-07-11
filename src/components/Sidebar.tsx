import { Cpu, Plus, Thermometer, Zap, Activity } from 'lucide-react';
import { useMonitoring } from '../contexts/MonitoringContext';
import type { MachineStatus } from '../types';

interface Props {
  onAddMachine: () => void;
  onSaveSettings?: () => void;
}

const statusColor: Record<MachineStatus, string> = {
  online: '#22c55e',
  offline: '#64748b',
  warning: '#eab308',
  critical: '#ef4444',
};

/**
 * Machine-list sidebar. Lists every machine with a colored status dot, name
 * and location; the active machine is highlighted with a green left border and
 * shows live T / I / V metrics. An "Add Machine" button anchors the bottom.
 */
export function Sidebar({ onAddMachine }: Props) {
  const { machines, selectedMachine, selectMachine, temperature, currentVal, rmsX, rmsY } = useMonitoring();

  return (
    <div className="sidebar">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderBottom: '1px solid #1e2d45' }}>
        <Cpu size={13} className="text-blue-400" />
        <span className="text-xs font-semibold text-slate-200 tracking-wide">MACHINES</span>
        <span className="ml-auto px-1.5 py-0.5 text-[9px] font-semibold text-slate-300" style={{ background: '#1a2540', border: '1px solid #2a3f60' }}>
          {machines.length}
        </span>
      </div>

      {/* Machine list */}
      <div className="flex-1 overflow-y-auto">
        {machines.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-3 py-8 gap-2">
            <Cpu size={22} className="text-slate-600" />
            <span className="text-[10px] text-slate-500 text-center">No machines yet.<br />Add one to begin monitoring.</span>
          </div>
        ) : (
          machines.map((m) => {
            const active = selectedMachine?.id === m.id;
            const color = statusColor[m.status] ?? statusColor.offline;
            return (
              <div
                key={m.id}
                onClick={() => selectMachine(m.id)}
                className={active ? 'machine-active cursor-pointer' : 'cursor-pointer'}
                style={{
                  padding: '8px 10px',
                  borderBottom: '1px solid #141e30',
                  transition: 'background 0.15s',
                  ...(active ? {} : {}),
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(30,45,69,0.35)'; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex-shrink-0 ${m.status === 'online' ? 'status-dot-active' : ''}`}
                    style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 5px ${color}` }}
                  />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[11px] font-semibold text-slate-200 truncate">{m.name}</span>
                    {m.location && <span className="text-[9px] text-slate-500 truncate">{m.location}</span>}
                  </div>
                </div>

                {/* Live metrics for the active machine */}
                {active && (
                  <div className="flex items-center gap-3 mt-2 ml-4">
                    <div className="flex items-center gap-1" title="Temperature">
                      <Thermometer size={10} className="text-orange-400" />
                      <span className="text-[10px] val-orange font-semibold">{temperature.toFixed(1)}°</span>
                    </div>
                    <div className="flex items-center gap-1" title="Current">
                      <Zap size={10} className="text-yellow-400" />
                      <span className="text-[10px] val-yellow font-semibold">{currentVal.toFixed(2)}A</span>
                    </div>
                    <div className="flex items-center gap-1" title="Vibration RMS">
                      <Activity size={10} className="text-cyan-400" />
                      <span className="text-[10px] val-cyan font-semibold">{((rmsX + rmsY) / 2).toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer — add machine */}
      <div className="p-2" style={{ borderTop: '1px solid #1e2d45' }}>
        <button className="btn-secondary w-full flex items-center justify-center gap-1.5" onClick={onAddMachine}>
          <Plus size={13} />
          <span>Add Machine</span>
        </button>
      </div>
    </div>
  );
}
