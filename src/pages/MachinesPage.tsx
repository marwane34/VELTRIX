import { useState, useEffect, useMemo, type FormEvent } from 'react';
import {
  Cpu, Plus, Search, MapPin, Thermometer, Zap, Activity, Gauge,
  Trash2, Settings, Monitor, ChevronLeft, ChevronRight, X, Loader2,
  AlertCircle, Pencil, Check,
} from 'lucide-react';
import { useMonitoring } from '../contexts/MonitoringContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import type { Machine, MachineStatus, Sensor, SensorType, SensorStatus } from '../types';

interface MachinesPageProps {
  onNavigate: (page: string) => void;
}

const statusColor: Record<MachineStatus, string> = {
  online: '#22c55e', offline: '#64748b', warning: '#eab308', critical: '#ef4444',
};

const statusLabel: Record<MachineStatus, string> = {
  online: 'ONLINE', offline: 'OFFLINE', warning: 'WARNING', critical: 'CRITICAL',
};

const sensorTypeLabels: Record<SensorType, string> = {
  vibration: 'Vibration', temperature: 'Temperature', current: 'Current',
  frequency: 'Frequency', rpm: 'RPM', voltage: 'Voltage', pressure: 'Pressure', multi: 'Multi',
};

const sensorStatusColor: Record<SensorStatus, string> = {
  active: '#22c55e', inactive: '#64748b', error: '#ef4444',
};

const PAGE_SIZE = 8;

const inputStyle: React.CSSProperties = {
  background: '#0a1220', border: '1px solid #1e2d45', color: '#e2e8f0',
  fontSize: 12, padding: '6px 10px', outline: 'none', width: '100%',
};

/**
 * MachinesPage — machine management with integrated per-machine sensor management.
 * Header with search, status filter tabs, machine grid cards (with expandable sensor sections),
 * pagination, and action buttons (Monitor / Limits / Delete).
 */
export function MachinesPage({ onNavigate }: MachinesPageProps) {
  const { machines, selectedMachine, selectMachine, refreshMachines, sensors, refreshSensors } = useMonitoring();
  const { user } = useAuth();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | MachineStatus>('all');
  const [page, setPage] = useState(0);
  const [expandedMachine, setExpandedMachine] = useState<string | null>(null);
  const [showAddMachine, setShowAddMachine] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showSensorForm, setShowSensorForm] = useState<string | null>(null);
  const [sensorForm, setSensorForm] = useState({ name: '', type: 'vibration' as SensorType, channel: 'CH1', unit: 'g', samplingRate: 1000 });
  const [savingSensor, setSavingSensor] = useState(false);

  // Load AddMachineModal lazily
  const AddMachineModal = useMemo(() => {
    return null as unknown as null; // placeholder, we import dynamically below
  }, []);

  useEffect(() => { refreshMachines(); refreshSensors(); }, [refreshMachines, refreshSensors]);

  const filtered = useMemo(() => {
    return machines.filter((m) => {
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!m.name.toLowerCase().includes(q) && !m.location.toLowerCase().includes(q) && !m.description.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [machines, statusFilter, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageMachines = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: machines.length, online: 0, warning: 0, critical: 0, offline: 0 };
    machines.forEach((m) => { counts[m.status] = (counts[m.status] ?? 0) + 1; });
    return counts;
  }, [machines]);

  async function handleDelete(machine: Machine) {
    if (!window.confirm(`Delete machine "${machine.name}"? This will also remove its sensors and alerts.`)) return;
    setDeleting(machine.id);
    try {
      await supabase.from('sensors').delete().eq('machine_id', machine.id);
      await supabase.from('alerts').delete().eq('machine_id', machine.id);
      await supabase.from('sensor_snapshots').delete().eq('machine_id', machine.id);
      await supabase.from('sensor_data').delete().eq('machine_id', machine.id);
      await supabase.from('machine_health').delete().eq('machine_id', machine.id);
      const { error } = await supabase.from('machines').delete().eq('id', machine.id);
      if (error) throw error;
      await refreshMachines();
      toast(`Machine "${machine.name}" deleted`, 'success');
    } catch (err) {
      toast('Failed to delete: ' + (err as Error).message, 'error');
    } finally {
      setDeleting(null);
    }
  }

  function handleMonitor(machine: Machine) {
    selectMachine(machine.id);
    onNavigate('dashboard');
  }

  async function handleSaveSensor(machineId: string, e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!sensorForm.name.trim()) { toast('Sensor name is required', 'error'); return; }
    setSavingSensor(true);
    try {
      const { error } = await supabase.from('sensors').insert({
        user_id: user.id, machine_id: machineId,
        name: sensorForm.name.trim(), type: sensorForm.type,
        channel: sensorForm.channel, unit: sensorForm.unit,
        status: 'active', sampling_rate: sensorForm.samplingRate,
        min_value: 0, max_value: 100, description: '',
      });
      if (error) throw error;
      await refreshSensors();
      toast('Sensor added', 'success');
      setShowSensorForm(null);
      setSensorForm({ name: '', type: 'vibration', channel: 'CH1', unit: 'g', samplingRate: 1000 });
    } catch (err) {
      toast('Failed to add sensor: ' + (err as Error).message, 'error');
    } finally {
      setSavingSensor(false);
    }
  }

  async function handleDeleteSensor(sensor: Sensor) {
    if (!window.confirm(`Delete sensor "${sensor.name}"?`)) return;
    try {
      const { error } = await supabase.from('sensors').delete().eq('id', sensor.id);
      if (error) throw error;
      await refreshSensors();
      toast('Sensor deleted', 'success');
    } catch (err) {
      toast('Failed to delete sensor: ' + (err as Error).message, 'error');
    }
  }

  return (
    <div className="flex flex-col" style={{ height: '100%', background: '#060b14' }}>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ padding: '12px 16px', borderBottom: '1px solid #1e2d45', flexShrink: 0 }}>
        <div className="flex items-center gap-3">
          <Cpu size={20} style={{ color: '#3b82f6' }} />
          <span className="font-bold tracking-wider" style={{ fontSize: 14, color: '#e2e8f0' }}>MACHINE MANAGEMENT</span>
          <span className="flex items-center justify-center font-bold" style={{ minWidth: 24, height: 22, padding: '0 8px', fontSize: 11, color: '#60a5fa', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 3 }}>
            {machines.length}
          </span>
        </div>
        <button onClick={() => setShowAddMachine(true)} className="btn-monitor flex items-center gap-2">
          <Plus size={14} /> Add Machine
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3" style={{ padding: '10px 16px', borderBottom: '1px solid #1e2d45', flexShrink: 0 }}>
        <div className="relative" style={{ width: 260 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search machines..."
            style={{ ...inputStyle, paddingLeft: 32 }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#3b82f6')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#1e2d45')}
          />
        </div>
        <div className="flex items-center gap-1">
          {(['all', 'online', 'warning', 'critical', 'offline'] as const).map((tab) => {
            const active = statusFilter === tab;
            const count = statusCounts[tab] ?? 0;
            return (
              <button
                key={tab}
                onClick={() => { setStatusFilter(tab); setPage(0); }}
                style={{
                  padding: '5px 12px', fontSize: 11, fontWeight: active ? 600 : 500,
                  cursor: 'pointer', borderRadius: 3, letterSpacing: '0.3px', textTransform: 'uppercase',
                  background: active ? 'linear-gradient(180deg,#1a3a6e 0%,#0f2547 100%)' : 'transparent',
                  border: active ? '1px solid #3b82f6' : '1px solid #1e2d45',
                  color: active ? '#60a5fa' : '#94a3b8',
                }}
              >
                {tab} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Machine Grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center" style={{ height: '100%', gap: 12 }}>
            <Cpu size={48} style={{ color: '#475569', opacity: 0.5 }} />
            <span style={{ fontSize: 13, color: '#64748b' }}>{machines.length === 0 ? 'No machines yet. Add one to get started.' : 'No machines match your filters.'}</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
            {pageMachines.map((machine) => {
              const machineSensors = sensors.filter((s) => s.machine_id === machine.id);
              const isExpanded = expandedMachine === machine.id;
              const isSelected = selectedMachine?.id === machine.id;
              return (
                <div key={machine.id} className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
                  {/* Card header */}
                  <div className="flex items-start justify-between" style={{ padding: '10px 12px', borderBottom: '1px solid #1a2540' }}>
                    <div className="flex items-center gap-2.5" style={{ flex: 1, minWidth: 0 }}>
                      <span
                        className={machine.status === 'online' ? 'status-dot-active' : ''}
                        style={{ width: 9, height: 9, borderRadius: '50%', background: statusColor[machine.status], flexShrink: 0, boxShadow: machine.status === 'online' ? `0 0 6px ${statusColor[machine.status]}` : 'none' }}
                      />
                      <div className="flex flex-col" style={{ minWidth: 0 }}>
                        <span className="font-semibold truncate" style={{ fontSize: 13, color: '#e2e8f0' }}>{machine.name}</span>
                        <span className="flex items-center gap-1" style={{ fontSize: 10, color: '#64748b' }}>
                          <MapPin size={9} /> {machine.location || 'No location'}
                        </span>
                      </div>
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', color: statusColor[machine.status], padding: '2px 6px', border: `1px solid ${statusColor[machine.status]}40`, borderRadius: 3, background: `${statusColor[machine.status]}10` }}>
                      {statusLabel[machine.status]}
                    </span>
                  </div>

                  {/* Thresholds */}
                  <div className="flex flex-col gap-1.5" style={{ padding: '10px 12px' }}>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="flex items-center gap-1.5" style={{ color: '#64748b' }}><Activity size={11} className="val-cyan" /> RMS</span>
                      <span className="val-cyan">{machine.rms_min} – {machine.rms_max} g</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="flex items-center gap-1.5" style={{ color: '#64748b' }}><Thermometer size={11} className="val-orange" /> Temp</span>
                      <span className="val-orange">{machine.temp_min} – {machine.temp_max} °C</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="flex items-center gap-1.5" style={{ color: '#64748b' }}><Zap size={11} className="val-yellow" /> Current</span>
                      <span className="val-yellow">{machine.current_min} – {machine.current_max} A</span>
                    </div>
                  </div>

                  {/* Sensors section (expandable) */}
                  <div style={{ borderTop: '1px solid #1a2540' }}>
                    <button
                      onClick={() => setExpandedMachine(isExpanded ? null : machine.id)}
                      className="flex items-center justify-between w-full"
                      style={{ padding: '6px 12px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.5px' }}
                    >
                      <span className="flex items-center gap-1.5">
                        <Gauge size={11} style={{ color: '#3b82f6' }} />
                        SENSORS ({machineSensors.length})
                      </span>
                      <ChevronRight size={12} style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                    </button>
                    {isExpanded && (
                      <div style={{ padding: '0 12px 10px' }}>
                        {machineSensors.length > 0 && (
                          <div className="flex flex-col gap-1" style={{ marginBottom: 8 }}>
                            {machineSensors.map((sensor) => (
                              <div key={sensor.id} className="flex items-center justify-between" style={{ padding: '4px 8px', background: '#0a1220', border: '1px solid #1a2540', borderRadius: 3 }}>
                                <div className="flex items-center gap-2">
                                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: sensorStatusColor[sensor.status], flexShrink: 0 }} />
                                  <span style={{ fontSize: 11, color: '#cbd5e1' }}>{sensor.name}</span>
                                  <span style={{ fontSize: 9, color: '#64748b' }}>{sensorTypeLabels[sensor.type]}</span>
                                  <span style={{ fontSize: 9, color: '#475569' }}>{sensor.channel} · {sensor.unit}</span>
                                </div>
                                <button onClick={() => handleDeleteSensor(sensor)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 2 }} title="Delete sensor">
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {showSensorForm === machine.id ? (
                          <form onSubmit={(e) => handleSaveSensor(machine.id, e)} className="flex flex-col gap-2" style={{ padding: 8, background: '#0a1220', border: '1px solid #1e2d45', borderRadius: 3 }}>
                            <div className="flex items-center justify-between">
                              <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8' }}>ADD SENSOR</span>
                              <button type="button" onClick={() => setShowSensorForm(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0 }}><X size={12} /></button>
                            </div>
                            <input type="text" placeholder="Sensor name" value={sensorForm.name} onChange={(e) => setSensorForm({ ...sensorForm, name: e.target.value })} style={inputStyle} />
                            <div className="flex gap-2">
                              <select value={sensorForm.type} onChange={(e) => setSensorForm({ ...sensorForm, type: e.target.value as SensorType })} style={{ ...inputStyle, flex: 1 }}>
                                {Object.entries(sensorTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                              </select>
                              <input type="text" placeholder="Channel" value={sensorForm.channel} onChange={(e) => setSensorForm({ ...sensorForm, channel: e.target.value })} style={{ ...inputStyle, width: 70 }} />
                            </div>
                            <div className="flex gap-2">
                              <input type="text" placeholder="Unit" value={sensorForm.unit} onChange={(e) => setSensorForm({ ...sensorForm, unit: e.target.value })} style={{ ...inputStyle, width: 80 }} />
                              <input type="number" placeholder="Hz" value={sensorForm.samplingRate} onChange={(e) => setSensorForm({ ...sensorForm, samplingRate: parseInt(e.target.value) || 1000 })} style={{ ...inputStyle, flex: 1 }} />
                            </div>
                            <button type="submit" disabled={savingSensor} className="btn-monitor flex items-center justify-center gap-1.5" style={{ padding: '5px 12px', opacity: savingSensor ? 0.6 : 1 }}>
                              {savingSensor ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save Sensor
                            </button>
                          </form>
                        ) : (
                          <button onClick={() => setShowSensorForm(machine.id)} className="btn-secondary flex items-center justify-center gap-1.5 w-full" style={{ padding: '4px 10px' }}>
                            <Plus size={11} /> Add Sensor
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2" style={{ padding: '10px 12px', borderTop: '1px solid #1a2540' }}>
                    <button
                      onClick={() => handleMonitor(machine)}
                      className="btn-monitor flex items-center gap-1.5"
                      style={{ flex: 1, justifyContent: 'center', padding: '5px 10px' }}
                    >
                      <Monitor size={12} /> Monitor
                    </button>
                    <button
                      onClick={() => { selectMachine(machine.id); onNavigate('dashboard'); }}
                      className="btn-secondary flex items-center justify-center"
                      style={{ padding: '5px 10px' }}
                      title="Set Limits"
                    >
                      <Settings size={12} />
                    </button>
                    <button
                      onClick={() => handleDelete(machine)}
                      disabled={deleting === machine.id}
                      className="btn-danger flex items-center justify-center"
                      style={{ padding: '5px 10px', opacity: deleting === machine.id ? 0.5 : 1 }}
                    >
                      {deleting === machine.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-3" style={{ padding: '8px 16px', borderTop: '1px solid #1e2d45', flexShrink: 0 }}>
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={currentPage === 0} className="btn-secondary flex items-center gap-1" style={{ padding: '4px 10px', opacity: currentPage === 0 ? 0.4 : 1 }}>
            <ChevronLeft size={12} /> Prev
          </button>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>
            Page {currentPage + 1} of {pageCount} · {filtered.length} machines
          </span>
          <button onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={currentPage >= pageCount - 1} className="btn-secondary flex items-center gap-1" style={{ padding: '4px 10px', opacity: currentPage >= pageCount - 1 ? 0.4 : 1 }}>
            Next <ChevronRight size={12} />
          </button>
        </div>
      )}

      {/* AddMachineModal */}
      {showAddMachine && (
        <AddMachineModalLazy
          onClose={() => setShowAddMachine(false)}
          onCreated={() => { setShowAddMachine(false); void refreshMachines(); }}
        />
      )}
    </div>
  );
}

// Lazily import AddMachineModal to keep initial bundle smaller
import AddMachineModalDefault from '../components/AddMachineModal';
function AddMachineModalLazy(props: { onClose: () => void; onCreated: () => void }) {
  return <AddMachineModalDefault {...props} />;
}

export default MachinesPage;
