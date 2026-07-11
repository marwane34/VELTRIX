import { Monitor, BarChart2, ChevronUp, PlusCircle } from 'lucide-react';
import { useMonitoring } from '../contexts/MonitoringContext';

interface Props {
  onAddMachine: () => void;
  onSaveSettings: () => void;
}

export function Sidebar({ onAddMachine, onSaveSettings }: Props) {
  const { machines, selectedMachine, selectMachine, temperature, currentVal, rmsX, rmsY } = useMonitoring();

  return (
    <div className="sidebar flex flex-col h-full text-xs select-none">
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid #1e2d45', background: 'linear-gradient(180deg,#182030 0%,#111827 100%)' }}>
        <div className="flex items-center gap-2">
          <Monitor size={13} className="text-blue-400" />
          <span className="font-semibold text-sm text-slate-200 truncate max-w-28">{selectedMachine?.name ?? 'No Machine'}</span>
        </div>
        <ChevronUp size={13} className="text-slate-500" />
      </div>

      <div style={{ borderBottom: '1px solid #1e2d45' }}>
        {machines.length === 0 ? (
          <div className="px-3 py-4 text-center text-slate-600 text-xs">No machines. Add one below.</div>
        ) : (
          machines.map((machine) => {
            const isActive = machine.id === selectedMachine?.id;
            return (
              <div key={machine.id} onClick={() => selectMachine(machine.id)} className="flex items-center justify-between px-3 py-2 cursor-pointer transition-colors"
                style={isActive ? { background: 'linear-gradient(90deg,rgba(34,197,94,0.08),rgba(34,197,94,0.02))', borderLeft: '2px solid #22c55e' } : { paddingLeft: 14 }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = ''; }}>
                <div className="flex items-center gap-2">
                  <BarChart2 size={12} className={isActive ? 'text-blue-400' : 'text-slate-500'} />
                  <span className={isActive ? 'text-slate-200 font-medium' : 'text-slate-400'}>{machine.name}</span>
                </div>
                {isActive && <div className="status-dot-active rounded-full" style={{ width: 8, height: 8, background: '#22c55e', boxShadow: '0 0 4px #22c55e', flexShrink: 0 }} />}
              </div>
            );
          })
        )}
      </div>

      <div className="px-3 py-2 space-y-1.5" style={{ borderBottom: '1px solid #1e2d45' }}>
        <div className="flex items-center justify-between px-2 py-1" style={{ background: '#0d1520', border: '1px solid #1e2d45' }}>
          <span className="text-slate-400">RMS:</span>
          <span><span className="text-slate-300">X:</span><span className="val-blue"> {rmsX.toFixed(2)}</span><span className="text-slate-500">g </span><span className="text-slate-400">Y:</span><span className="val-cyan"> {rmsY.toFixed(2)}g</span></span>
        </div>
        <div className="flex items-center justify-between px-2 py-1" style={{ background: '#0d1520', border: '1px solid #1e2d45' }}>
          <span className="text-slate-400">Temp:</span>
          <span className="val-orange"> {temperature.toFixed(0)}°C</span>
        </div>
        <div className="flex items-center justify-between px-2 py-1" style={{ background: '#0d1520', border: '1px solid #1e2d45' }}>
          <span className="text-slate-400">Current:</span>
          <span className="val-yellow"> {currentVal.toFixed(1)} A</span>
        </div>
      </div>

      <div className="px-3 py-2 flex-1">
        <div className="text-yellow-500 font-semibold text-xs mb-2 tracking-wide uppercase" style={{ fontSize: 10 }}>General Settings</div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between"><span className="text-slate-400">Vibration RMS</span><span className="val-blue">{selectedMachine?.rms_min ?? 0.8} - {selectedMachine?.rms_max ?? 2.2} g</span></div>
          <div className="flex items-center justify-between"><span className="text-slate-400">Temperature:</span><span className="val-green">{selectedMachine?.temp_min ?? 40} - {selectedMachine?.temp_max ?? 80}°c</span></div>
          <div className="flex items-center justify-between"><span className="text-slate-400">Current:</span><span><span className="val-blue">{selectedMachine?.current_min ?? 1.0} </span><span className="text-slate-500">+ </span><span className="val-yellow">{selectedMachine?.current_max ?? 3.5} A</span></span></div>
        </div>
        <button onClick={onSaveSettings} className="w-full py-1.5 mt-3 text-xs font-semibold cursor-pointer" style={{ background: 'linear-gradient(180deg,#1a4a1a 0%,#0f2e0f 100%)', border: '1px solid #22c55e', color: '#22c55e' }}>Save Settings</button>
      </div>

      <div onClick={onAddMachine} className="px-3 py-2 flex items-center justify-center gap-1.5 cursor-pointer transition-colors" style={{ borderTop: '1px solid #1e2d45' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}>
        <PlusCircle size={11} className="text-slate-400" /><span className="text-slate-400">Add Machine</span>
      </div>
    </div>
  );
}
