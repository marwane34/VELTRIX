import { useState, useMemo, FormEvent } from 'react';
import {
  Cpu, Plus, Search, Trash2, Sliders, Activity, Thermometer, Zap, Gauge,
  ChevronDown, ChevronRight, Monitor, Loader2, Radio, Waves, Battery, Gauge as Tach,
  Power,
} from 'lucide-react';
import { useMonitoring } from '../contexts/MonitoringContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import type { Machine, MachineStatus, Sensor, SensorType } from '../types';

const statusColor: Record<MachineStatus, string> = {
  online: '#22c55e',
  offline: '#64748b',
  warning: '#eab308',
  critical: '#ef4444',
};

const statusLabel: Record<MachineStatus, string> = {
  online: 'Online',
  offline: 'Offline',
  warning: 'Warning',
  critical: 'Critical',
};

const sensorTypeIcon: Record<SensorType, typeof Activity> = {
  vibration: Activity,
  temperature: Thermometer,
  current: Zap,
  frequency: Waves,
  rpm: Gauge,
  voltage: Battery,
  pressure: Tach,
  multi: Radio,
};

const sensorTypes: SensorType[] = ['vibration', 'temperature', 'current', 'frequency', 'rpm', 'voltage', 'pressure', 'multi'];

interface Props {}

/**
 * Machine management page. Renders a filterable grid of machine cards with
 * thresholds and an inline per-machine sensor manager (add / toggle / delete).
 */
export function MachinesPage(_: Props) {
  const { machines, sensors, refreshMachines, refreshSensors, selectMachine } = useMonitoring();
  const { user } = useAuth();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | MachineStatus>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddMachine, setShowAddMachine] = useState(false);
  const [limitsMachine, setLimitsMachine] = useState<Machine | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 6;

  // Inline add-sensor form state
  const [newSensor, setNewSensor] = useState({ name: '', type: 'vibration' as SensorType, channel: '', samplingRate: '1000' });
  const [addingSensorFor, setAddingSensorFor] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return machines.filter((m) => {
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!m.name.toLowerCase().includes(q) && !m.location.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [machines, statusFilter, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice(page * pageSize, page * pageSize + pageSize);
  const safePage = Math.min(page, pageCount - 1);

  const tabs: { key: 'all' | MachineStatus; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'online', label: 'Online' },
    { key: 'warning', label: 'Warning' },
    { key: 'critical', label: 'Critical' },
    { key: 'offline', label: 'Offline' },
  ];

  async function handleDeleteMachine(id: string) {
    if (!user) return;
    setDeletingId(id);
    // Delete sensors belonging to this machine first
    await supabase.from('sensors').delete().eq('machine_id', id);
    const { error } = await supabase.from('machines').delete().eq('id', id);
    setDeletingId(null);
    if (error) { toast(error.message, 'error'); return; }
    refreshMachines();
    refreshSensors();
    toast('Machine deleted', 'success');
  }

  async function handleAddSensor(e: FormEvent, machineId: string) {
    e.preventDefault();
    if (!user) return;
    if (!newSensor.name.trim()) { toast('Sensor name required', 'error'); return; }
    const typeUnit: Record<SensorType, string> = {
      vibration: 'mm/s', temperature: '°C', current: 'A', frequency: 'Hz',
      rpm: 'RPM', voltage: 'V', pressure: 'bar', multi: '—',
    };
    const { error } = await supabase.from('sensors').insert({
      user_id: user.id,
      machine_id: machineId,
      name: newSensor.name.trim(),
      type: newSensor.type,
      channel: newSensor.channel.trim() || 'CH1',
      unit: typeUnit[newSensor.type],
      status: 'active',
      sampling_rate: parseInt(newSensor.samplingRate, 10) || 1000,
      min_value: 0,
      max_value: 100,
      description: '',
    });
    if (error) { toast(error.message, 'error'); return; }
    refreshSensors();
    setNewSensor({ name: '', type: 'vibration', channel: '', samplingRate: '1000' });
    setAddingSensorFor(null);
    toast('Sensor added', 'success');
  }

  async function handleToggleSensor(sensor: Sensor) {
    const next = sensor.status === 'active' ? 'inactive' : 'active';
    const { error } = await supabase.from('sensors').update({ status: next, updated_at: new Date().toISOString() }).eq('id', sensor.id);
    if (error) { toast(error.message, 'error'); return; }
    refreshSensors();
    toast(`Sensor ${next === 'active' ? 'activated' : 'deactivated'}`, 'info');
  }

  async function handleDeleteSensor(id: string) {
    const { error } = await supabase.from('sensors').delete().eq('id', id);
    if (error) { toast(error.message, 'error'); return; }
    refreshSensors();
    toast('Sensor deleted', 'success');
  }

  const inputStyle: React.CSSProperties = {
    background: '#080d14', border: '1px solid #1e2d45', color: '#e2e8f0', fontSize: 11, padding: '5px 8px', outline: 'none',
  };

  return (
    <div className="flex flex-col h-full" style={{ background: '#0b0f1a' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid #1e2d45', background: 'linear-gradient(180deg,#0d1525 0%,#080d14 100%)' }}>
        <Cpu size={18} className="text-blue-400" />
        <span className="text-sm font-bold text-slate-100 tracking-wide">MACHINE MANAGEMENT</span>
        <span className="px-2 py-0.5 text-[10px] font-semibold text-slate-300" style={{ background: '#1a2540', border: '1px solid #2a3f60' }}>
          {machines.length}
        </span>
        <button className="btn-monitor flex items-center gap-1.5 ml-auto" style={{ height: 30 }} onClick={() => setShowAddMachine(true)}>
          <Plus size={13} /> Add Machine
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0" style={{ borderBottom: '1px solid #1e2d45' }}>
        <div className="relative flex items-center">
          <Search size={13} className="absolute left-2.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search machines…"
            style={{ ...inputStyle, paddingLeft: 28, width: 200 }}
          />
        </div>
        <div className="flex items-center gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { setStatusFilter(t.key); setPage(0); }}
              className="px-3 py-1 text-[11px] font-semibold tracking-wide transition-all"
              style={{
                background: statusFilter === t.key ? 'rgba(59,130,246,0.15)' : 'transparent',
                border: statusFilter === t.key ? '1px solid #3b82f6' : '1px solid transparent',
                color: statusFilter === t.key ? '#60a5fa' : '#94a3b8',
                height: 26,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Machine grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {pageItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Cpu size={32} className="text-slate-600" />
            <span className="text-sm text-slate-500">No machines found.</span>
            <button className="btn-monitor flex items-center gap-1.5" onClick={() => setShowAddMachine(true)}>
              <Plus size={13} /> Add your first machine
            </button>
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))' }}>
            {pageItems.map((m) => {
              const color = statusColor[m.status] ?? statusColor.offline;
              const machineSensors = sensors.filter((s) => s.machine_id === m.id);
              const isExpanded = expandedId === m.id;
              const isAdding = addingSensorFor === m.id;
              return (
                <div key={m.id} className="panel flex flex-col">
                  {/* Card header */}
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <span className={`flex-shrink-0 ${m.status === 'online' ? 'status-dot-active' : ''}`} style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-xs font-semibold text-slate-200 truncate">{m.name}</span>
                      <span className="text-[10px] text-slate-500 truncate">{m.location || 'No location'}</span>
                    </div>
                    <span className="text-[9px] font-semibold tracking-wide px-1.5 py-0.5" style={{ background: `${color}1a`, border: `1px solid ${color}40`, color }}>
                      {statusLabel[m.status].toUpperCase()}
                    </span>
                  </div>

                  {/* Thresholds */}
                  <div className="grid grid-cols-3 gap-1.5 px-3 pb-2.5">
                    <div className="p-1.5" style={{ background: '#0e1726', border: '1px solid #1e2d45' }}>
                      <div className="flex items-center gap-1 mb-0.5">
                        <Activity size={9} className="text-cyan-400" />
                        <span className="text-[8px] text-slate-500">VIB</span>
                      </div>
                      <span className="text-[10px] val-cyan font-semibold">{m.rms_min}–{m.rms_max}</span>
                    </div>
                    <div className="p-1.5" style={{ background: '#0e1726', border: '1px solid #1e2d45' }}>
                      <div className="flex items-center gap-1 mb-0.5">
                        <Thermometer size={9} className="text-orange-400" />
                        <span className="text-[8px] text-slate-500">TEMP</span>
                      </div>
                      <span className="text-[10px] val-orange font-semibold">{m.temp_min}–{m.temp_max}°</span>
                    </div>
                    <div className="p-1.5" style={{ background: '#0e1726', border: '1px solid #1e2d45' }}>
                      <div className="flex items-center gap-1 mb-0.5">
                        <Zap size={9} className="text-yellow-400" />
                        <span className="text-[8px] text-slate-500">CURR</span>
                      </div>
                      <span className="text-[10px] val-yellow font-semibold">{m.current_min}–{m.current_max}A</span>
                    </div>
                  </div>

                  {/* Sensors toggle */}
                  <button
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] text-slate-400 hover:text-slate-200 transition-colors"
                    style={{ borderTop: '1px solid #1e2d45' }}
                    onClick={() => setExpandedId(isExpanded ? null : m.id)}
                  >
                    {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    <Gauge size={11} />
                    <span>Sensors ({machineSensors.length})</span>
                  </button>

                  {/* Expanded sensor section */}
                  {isExpanded && (
                    <div className="flex flex-col gap-2 px-3 py-2.5" style={{ background: '#0a0f1a', borderTop: '1px solid #141e30' }}>
                      {/* Sensor list */}
                      {machineSensors.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {machineSensors.map((s) => {
                            const SIcon = sensorTypeIcon[s.type] ?? Activity;
                            const sColor = s.status === 'active' ? '#4ade80' : s.status === 'error' ? '#f87171' : '#64748b';
                            return (
                              <div key={s.id} className="flex items-center gap-2 px-2 py-1.5" style={{ background: '#0e1726', border: '1px solid #1e2d45' }}>
                                <SIcon size={12} style={{ color: sColor }} />
                                <div className="flex flex-col min-w-0 flex-1">
                                  <span className="text-[11px] text-slate-200 truncate">{s.name}</span>
                                  <span className="text-[9px] text-slate-500">{s.type} · {s.channel} · {s.sampling_rate}Hz</span>
                                </div>
                                <button onClick={() => handleToggleSensor(s)} title={s.status === 'active' ? 'Deactivate' : 'Activate'} className="text-slate-500 hover:text-slate-300">
                                  <Power size={12} style={{ color: sColor }} />
                                </button>
                                <button onClick={() => handleDeleteSensor(s.id)} title="Delete sensor" className="text-slate-500 hover:text-red-400">
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500 px-1">No sensors configured.</span>
                      )}

                      {/* Add sensor form */}
                      {isAdding ? (
                        <form onSubmit={(e) => handleAddSensor(e, m.id)} className="flex flex-col gap-1.5 p-2" style={{ background: '#0e1726', border: '1px solid #2a3f60' }}>
                          <div className="flex items-center gap-1.5">
                            <input type="text" placeholder="Sensor name" value={newSensor.name} onChange={(e) => setNewSensor((p) => ({ ...p, name: e.target.value }))} style={inputStyle} className="flex-1" autoFocus />
                            <select value={newSensor.type} onChange={(e) => setNewSensor((p) => ({ ...p, type: e.target.value as SensorType }))} style={inputStyle}>
                              {sensorTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input type="text" placeholder="Channel (CH1)" value={newSensor.channel} onChange={(e) => setNewSensor((p) => ({ ...p, channel: e.target.value }))} style={inputStyle} className="flex-1" />
                            <input type="number" placeholder="Rate (Hz)" value={newSensor.samplingRate} onChange={(e) => setNewSensor((p) => ({ ...p, samplingRate: e.target.value }))} style={inputStyle} className="w-24" />
                          </div>
                          <div className="flex items-center justify-end gap-1.5">
                            <button type="button" className="btn-secondary" style={{ height: 24, padding: '0 10px', fontSize: 10 }} onClick={() => { setAddingSensorFor(null); setNewSensor({ name: '', type: 'vibration', channel: '', samplingRate: '1000' }); }}>Cancel</button>
                            <button type="submit" className="btn-monitor" style={{ height: 24, padding: '0 10px', fontSize: 10 }}>Add</button>
                          </div>
                        </form>
                      ) : (
                        <button className="btn-secondary flex items-center justify-center gap-1" style={{ height: 26, fontSize: 10 }} onClick={() => setAddingSensorFor(m.id)}>
                          <Plus size={11} /> Add Sensor
                        </button>
                      )}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-1.5 px-3 py-2" style={{ borderTop: '1px solid #1e2d45' }}>
                    <button className="btn-monitor flex items-center gap-1" style={{ height: 26, padding: '0 10px', fontSize: 10 }} onClick={() => { selectMachine(m.id); toast(`Monitoring ${m.name}`, 'info'); }}>
                      <Monitor size={11} /> Monitor
                    </button>
                    <button className="btn-secondary flex items-center gap-1" style={{ height: 26, padding: '0 10px', fontSize: 10 }} onClick={() => setLimitsMachine(m)}>
                      <Sliders size={11} /> Limits
                    </button>
                    <button
                      className="btn-danger flex items-center gap-1 ml-auto"
                      style={{ height: 26, padding: '0 10px', fontSize: 10, opacity: deletingId === m.id ? 0.6 : 1 }}
                      onClick={() => handleDeleteMachine(m.id)}
                      disabled={deletingId === m.id}
                    >
                      {deletingId === m.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />} Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pageCount > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button className="btn-secondary" style={{ height: 26, padding: '0 12px', fontSize: 10 }} disabled={safePage === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Prev</button>
            <span className="text-[10px] text-slate-400">{safePage + 1} / {pageCount}</span>
            <button className="btn-secondary" style={{ height: 26, padding: '0 12px', fontSize: 10 }} disabled={safePage >= pageCount - 1} onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}>Next</button>
          </div>
        )}
      </div>

      {/* Add machine modal (inline) */}
      {showAddMachine && (
        <InlineAddMachine
          onClose={() => setShowAddMachine(false)}
          onCreated={() => { refreshMachines(); toast('Machine added', 'success'); }}
        />
      )}

      {/* Set limits modal (inline) */}
      {limitsMachine && (
        <InlineSetLimits
          machine={limitsMachine}
          onClose={() => setLimitsMachine(null)}
          onSaved={() => { refreshMachines(); toast('Limits saved', 'success'); }}
        />
      )}
    </div>
  );
}

/* ---------- Inline modal helpers (delegate to existing components via light reimpl) ---------- */

import AddMachineModal from '../components/AddMachineModal';
import SetLimitsModal from '../components/SetLimitsModal';

function InlineAddMachine({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  return <AddMachineModal onClose={onClose} onCreated={onCreated} />;
}

function InlineSetLimits({ machine, onClose, onSaved }: { machine: Machine; onClose: () => void; onSaved: () => void }) {
  return <SetLimitsModal machine={machine} onClose={onClose} onSaved={onSaved} />;
}

export default MachinesPage;
