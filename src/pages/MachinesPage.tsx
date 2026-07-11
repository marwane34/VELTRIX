import { useState, useMemo, useEffect } from 'react';
import {
  Plus, Cpu, MapPin, Trash2, Settings2, Activity, Search,
  Thermometer, Waves, Zap, Gauge, Battery, ChevronDown, ChevronUp, X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useMonitoring } from '../contexts/MonitoringContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import AddMachineModal from '../components/AddMachineModal';
import SetLimitsModal from '../components/SetLimitsModal';
import type { Machine, Sensor, MachineStatus } from '../types';

/* ---------- constants ---------- */

const SENSOR_TYPES: Sensor['type'][] = [
  'vibration', 'temperature', 'current', 'frequency', 'rpm', 'voltage', 'pressure',
];

const SENSOR_UNITS: Record<string, string> = {
  vibration: 'g',
  temperature: '°C',
  current: 'A',
  frequency: 'Hz',
  rpm: 'RPM',
  voltage: 'V',
  pressure: 'bar',
};

const STATUS_TABS: { key: MachineStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'online', label: 'Online' },
  { key: 'warning', label: 'Warning' },
  { key: 'critical', label: 'Critical' },
  { key: 'offline', label: 'Offline' },
];

const STATUS_COLORS: Record<MachineStatus, string> = {
  online: '#22c55e',
  warning: '#eab308',
  critical: '#ef4444',
  offline: '#64748b',
};

const PAGE_SIZE = 8;

/* ---------- small helpers ---------- */

function sensorTypeIcon(type: Sensor['type']) {
  switch (type) {
    case 'vibration': return <Waves size={12} />;
    case 'temperature': return <Thermometer size={12} />;
    case 'current': return <Zap size={12} />;
    case 'frequency': return <Activity size={12} />;
    case 'rpm': return <Gauge size={12} />;
    case 'voltage': return <Zap size={12} />;
    case 'pressure': return <Gauge size={12} />;
    default: return <Activity size={12} />;
  }
}

function statusDot(status: MachineStatus) {
  const color = STATUS_COLORS[status] ?? '#64748b';
  return (
    <span
      className={status === 'online' ? 'status-dot-active' : ''}
      style={{
        display: 'inline-block',
        width: 8, height: 8, borderRadius: '50%',
        background: color,
        boxShadow: `0 0 6px ${color}80`,
        flexShrink: 0,
      }}
    />
  );
}

/* ---------- main component ---------- */

export function MachinesPage() {
  const { machines, sensors, refreshMachines, refreshSensors, selectMachine } = useMonitoring();
  const { user } = useAuth();
  const { toast } = useToast();

  const [showAdd, setShowAdd] = useState(false);
  const [limitsMachine, setLimitsMachine] = useState<Machine | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<MachineStatus | 'all'>('all');
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<string | null>(null);
  const [sensorDeleting, setSensorDeleting] = useState<string | null>(null);
  const [sensorToggling, setSensorToggling] = useState<string | null>(null);

  // inline add-sensor form per machine
  const [sensorFormMachine, setSensorFormMachine] = useState<string | null>(null);
  const [sensorForm, setSensorForm] = useState({
    name: '',
    type: 'vibration' as Sensor['type'],
    channel: '',
    samplingRate: '1000',
  });
  const [sensorSaving, setSensorSaving] = useState(false);

  /* ----- derived ----- */

  const filtered = useMemo(() => {
    let list = machines;
    if (statusFilter !== 'all') list = list.filter((m) => m.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.location.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q),
      );
    }
    return list;
  }, [machines, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  useEffect(() => {
    if (page >= totalPages) setPage(totalPages - 1);
  }, [totalPages, page]);

  const sensorsByMachine = useMemo(() => {
    const map: Record<string, Sensor[]> = {};
    for (const s of sensors) {
      const mid = s.machine_id ?? '';
      if (!map[mid]) map[mid] = [];
      map[mid].push(s);
    }
    return map;
  }, [sensors]);

  /* ----- handlers ----- */

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDeleteMachine(m: Machine) {
    if (!confirm(`Delete machine "${m.name}"? This will also remove its sensors.`)) return;
    setDeleting(m.id);
    const { error } = await supabase.from('machines').delete().eq('id', m.id);
    setDeleting(null);
    if (error) {
      toast(error.message, 'error');
      return;
    }
    await refreshMachines();
    await refreshSensors();
    toast('Machine deleted', 'success');
  }

  function openSensorForm(machineId: string) {
    setSensorFormMachine(machineId);
    setSensorForm({ name: '', type: 'vibration', channel: '', samplingRate: '1000' });
  }

  async function handleAddSensor(machineId: string) {
    if (!user) return;
    if (!sensorForm.name.trim()) {
      toast('Sensor name is required', 'error');
      return;
    }
    setSensorSaving(true);
    const { error } = await supabase.from('sensors').insert({
      user_id: user.id,
      machine_id: machineId,
      name: sensorForm.name.trim(),
      type: sensorForm.type,
      channel: sensorForm.channel.trim() || `CH${Math.floor(Math.random() * 8) + 1}`,
      unit: SENSOR_UNITS[sensorForm.type] ?? '',
      status: 'active',
      sampling_rate: parseInt(sensorForm.samplingRate, 10) || 1000,
      min_value: 0,
      max_value: 100,
      description: '',
    });
    setSensorSaving(false);
    if (error) {
      toast(error.message, 'error');
      return;
    }
    await refreshSensors();
    toast('Sensor added', 'success');
    setSensorFormMachine(null);
  }

  async function handleToggleSensor(sensor: Sensor) {
    const newStatus: Sensor['status'] = sensor.status === 'active' ? 'inactive' : 'active';
    setSensorToggling(sensor.id);
    const { error } = await supabase
      .from('sensors')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', sensor.id);
    setSensorToggling(null);
    if (error) {
      toast(error.message, 'error');
      return;
    }
    await refreshSensors();
    toast(`Sensor ${newStatus === 'active' ? 'activated' : 'deactivated'}`, 'success');
  }

  async function handleDeleteSensor(sensor: Sensor) {
    if (!confirm(`Delete sensor "${sensor.name}"?`)) return;
    setSensorDeleting(sensor.id);
    const { error } = await supabase.from('sensors').delete().eq('id', sensor.id);
    setSensorDeleting(null);
    if (error) {
      toast(error.message, 'error');
      return;
    }
    await refreshSensors();
    toast('Sensor deleted', 'success');
  }

  function handleMonitor(m: Machine) {
    selectMachine(m.id);
  }

  /* ---------- render ---------- */

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ background: 'linear-gradient(180deg,#0d1525 0%,#080d14 100%)', borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-3">
          <Cpu size={20} style={{ color: 'var(--accent-cyan)' }} />
          <span className="text-sm font-semibold text-slate-200 tracking-wide">MACHINE MANAGEMENT</span>
          <span
            className="text-xs font-bold px-2 py-0.5"
            style={{ background: '#0e1726', border: '1px solid var(--border-subtle)', color: 'var(--accent-cyan)', borderRadius: 3 }}
          >
            {machines.length}
          </span>
        </div>
        <button className="btn-monitor flex items-center gap-1.5" onClick={() => setShowAdd(true)}>
          <Plus size={14} /> Add Machine
        </button>
      </div>

      {/* Filter bar */}
      <div
        className="flex items-center gap-3 px-4 py-2 flex-shrink-0"
        style={{ background: '#0e1726', borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="relative flex items-center" style={{ minWidth: 220 }}>
          <Search size={13} style={{ position: 'absolute', left: 8, color: '#64748b' }} />
          <input
            type="text"
            placeholder="Search machines..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-8 pr-3 py-1.5 text-xs"
            style={{
              background: '#060b14', border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)', borderRadius: 3, outline: 'none',
            }}
          />
        </div>
        <div className="flex items-center gap-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setStatusFilter(tab.key); setPage(0); }}
              className="px-3 py-1.5 text-xs font-medium transition-all"
              style={{
                background: statusFilter === tab.key ? '#1a2540' : 'transparent',
                border: `1px solid ${statusFilter === tab.key ? '#3b82f6' : 'var(--border-subtle)'}`,
                color: statusFilter === tab.key ? 'var(--accent-blue)' : '#64748b',
                borderRadius: 3,
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Machine grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {pageItems.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm">
            No machines found. Click "Add Machine" to create one.
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))' }}>
            {pageItems.map((m) => {
              const machineSensors = sensorsByMachine[m.id] ?? [];
              const isExpanded = expanded.has(m.id);
              return (
                <div key={m.id} className="panel" style={{ borderRadius: 4 }}>
                  {/* Card header */}
                  <div
                    className="flex items-start justify-between px-3 py-2.5"
                    style={{ borderBottom: isExpanded ? '1px solid var(--border-subtle)' : 'none' }}
                  >
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      {statusDot(m.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-200 truncate">{m.name}</span>
                          <span
                            className="text-xs px-1.5 py-0.5 uppercase tracking-wide"
                            style={{
                              background: `${STATUS_COLORS[m.status]}15`,
                              color: STATUS_COLORS[m.status],
                              borderRadius: 2,
                              fontSize: 9,
                              fontWeight: 600,
                            }}
                          >
                            {m.status}
                          </span>
                        </div>
                        {m.location && (
                          <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-500">
                            <MapPin size={10} /> {m.location}
                          </div>
                        )}
                        {m.description && (
                          <div className="text-xs text-slate-500 mt-1 truncate">{m.description}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Threshold grid */}
                  <div className="grid grid-cols-3 gap-px px-3 py-2" style={{ background: '#0a1020' }}>
                    <ThresholdItem icon={<Waves size={11} />} label="Vibration" min={m.rms_min} max={m.rms_max} unit="g" color="#22d3ee" />
                    <ThresholdItem icon={<Thermometer size={11} />} label="Temp" min={m.temp_min} max={m.temp_max} unit="°C" color="#fb923c" />
                    <ThresholdItem icon={<Zap size={11} />} label="Current" min={m.current_min} max={m.current_max} unit="A" color="#60a5fa" />
                  </div>

                  {/* Expandable sensor section */}
                  {isExpanded && (
                    <div style={{ background: '#080d14' }}>
                      {/* Sensor count + add button */}
                      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <span className="text-xs text-slate-400 font-medium">
                          Sensors ({machineSensors.length})
                        </span>
                        <button
                          onClick={() => openSensorForm(m.id)}
                          className="flex items-center gap-1 text-xs px-2 py-1"
                          style={{ background: '#0e1726', border: '1px solid var(--border-subtle)', color: 'var(--accent-cyan)', borderRadius: 3, cursor: 'pointer' }}
                        >
                          <Plus size={11} /> Add Sensor
                        </button>
                      </div>

                      {/* Inline add-sensor form */}
                      {sensorFormMachine === m.id && (
                        <div className="px-3 py-2.5" style={{ background: '#0a1020', borderBottom: '1px solid var(--border-subtle)' }}>
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <input
                              type="text"
                              placeholder="Sensor name"
                              value={sensorForm.name}
                              onChange={(e) => setSensorForm((p) => ({ ...p, name: e.target.value }))}
                              className="px-2 py-1 text-xs"
                              style={{ background: '#060b14', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: 3, outline: 'none' }}
                            />
                            <select
                              value={sensorForm.type}
                              onChange={(e) => setSensorForm((p) => ({ ...p, type: e.target.value as Sensor['type'] }))}
                              className="px-2 py-1 text-xs"
                              style={{ background: '#060b14', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: 3, outline: 'none' }}
                            >
                              {SENSOR_TYPES.map((t) => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <input
                              type="text"
                              placeholder="Channel (e.g. CH1)"
                              value={sensorForm.channel}
                              onChange={(e) => setSensorForm((p) => ({ ...p, channel: e.target.value }))}
                              className="px-2 py-1 text-xs"
                              style={{ background: '#060b14', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: 3, outline: 'none' }}
                            />
                            <input
                              type="number"
                              placeholder="Sampling rate (Hz)"
                              value={sensorForm.samplingRate}
                              onChange={(e) => setSensorForm((p) => ({ ...p, samplingRate: e.target.value }))}
                              className="px-2 py-1 text-xs"
                              style={{ background: '#060b14', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: 3, outline: 'none' }}
                            />
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSensorFormMachine(null)}
                              className="flex items-center gap-1 text-xs px-2.5 py-1"
                              style={{ background: '#1a2540', border: '1px solid var(--border-subtle)', color: '#94a3b8', borderRadius: 3, cursor: 'pointer' }}
                            >
                              <X size={11} /> Cancel
                            </button>
                            <button
                              onClick={() => handleAddSensor(m.id)}
                              disabled={sensorSaving}
                              className="flex items-center gap-1 text-xs px-2.5 py-1"
                              style={{ background: 'linear-gradient(180deg,#1a4a1a 0%,#0f2e0f 100%)', border: '1px solid #22c55e', color: '#22c55e', borderRadius: 3, cursor: 'pointer', opacity: sensorSaving ? 0.5 : 1 }}
                            >
                              {sensorSaving ? <span className="animate-spin" style={{ display: 'inline-block', width: 11, height: 11, border: '1.5px solid #22c55e', borderTopColor: 'transparent', borderRadius: '50%' }} /> : <Plus size={11} />}
                              Save
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Sensor list */}
                      {machineSensors.length === 0 ? (
                        <div className="px-3 py-4 text-center text-xs text-slate-600">
                          No sensors configured for this machine.
                        </div>
                      ) : (
                        <div>
                          {machineSensors.map((s) => (
                            <div
                              key={s.id}
                              className="flex items-center gap-2 px-3 py-2"
                              style={{ borderBottom: '1px solid #0d1525' }}
                            >
                              <span style={{ color: s.status === 'active' ? '#22c55e' : '#64748b' }}>
                                {sensorTypeIcon(s.type)}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-slate-200 truncate">{s.name}</span>
                                  <span
                                    className="text-xs uppercase"
                                    style={{ fontSize: 8, padding: '1px 4px', borderRadius: 2, background: s.status === 'active' ? '#22c55e15' : '#64748b15', color: s.status === 'active' ? '#22c55e' : '#64748b' }}
                                  >
                                    {s.status}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                  <span>{s.type}</span>
                                  <span>•</span>
                                  <span>{s.channel}</span>
                                  <span>•</span>
                                  <span>{s.unit}</span>
                                  <span>•</span>
                                  <span>{s.sampling_rate} Hz</span>
                                </div>
                              </div>
                              <button
                                onClick={() => handleToggleSensor(s)}
                                disabled={sensorToggling === s.id}
                                title={s.status === 'active' ? 'Deactivate' : 'Activate'}
                                className="toolbar-icon-btn"
                                style={{ width: 24, height: 22 }}
                              >
                                {sensorToggling === s.id ? (
                                  <span className="animate-spin" style={{ display: 'inline-block', width: 10, height: 10, border: '1.5px solid #64748b', borderTopColor: 'transparent', borderRadius: '50%' }} />
                                ) : (
                                  <Battery size={11} />
                                )}
                              </button>
                              <button
                                onClick={() => handleDeleteSensor(s)}
                                disabled={sensorDeleting === s.id}
                                title="Delete sensor"
                                className="toolbar-icon-btn"
                                style={{ width: 24, height: 22, color: '#f87171' }}
                              >
                                {sensorDeleting === s.id ? (
                                  <span className="animate-spin" style={{ display: 'inline-block', width: 10, height: 10, border: '1.5px solid #f87171', borderTopColor: 'transparent', borderRadius: '50%' }} />
                                ) : (
                                  <Trash2 size={11} />
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-1.5 px-3 py-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <button
                      onClick={() => handleMonitor(m)}
                      className="btn-monitor flex items-center gap-1"
                      style={{ fontSize: 11, padding: '4px 10px' }}
                    >
                      <Activity size={12} /> Monitor
                    </button>
                    <button
                      onClick={() => setLimitsMachine(m)}
                      className="btn-secondary flex items-center gap-1"
                      style={{ fontSize: 11, padding: '4px 10px' }}
                    >
                      <Settings2 size={12} /> Limits
                    </button>
                    <button
                      onClick={() => toggleExpand(m.id)}
                      className="btn-secondary flex items-center gap-1"
                      style={{ fontSize: 11, padding: '4px 10px' }}
                    >
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      {isExpanded ? 'Collapse' : 'Sensors'}
                    </button>
                    <div className="flex-1" />
                    <button
                      onClick={() => handleDeleteMachine(m)}
                      disabled={deleting === m.id}
                      title="Delete machine"
                      className="toolbar-icon-btn"
                      style={{ color: '#f87171' }}
                    >
                      {deleting === m.id ? (
                        <span className="animate-spin" style={{ display: 'inline-block', width: 10, height: 10, border: '1.5px solid #f87171', borderTopColor: 'transparent', borderRadius: '50%' }} />
                      ) : (
                        <Trash2 size={12} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination footer */}
      {filtered.length > 0 && (
        <div
          className="flex items-center justify-between px-4 py-2 flex-shrink-0"
          style={{ background: '#0e1726', borderTop: '1px solid var(--border-subtle)' }}
        >
          <span className="text-xs text-slate-500">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="btn-secondary"
              style={{ fontSize: 11, padding: '3px 10px', opacity: page === 0 ? 0.4 : 1 }}
            >
              Prev
            </button>
            <span className="text-xs text-slate-400 px-2">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="btn-secondary"
              style={{ fontSize: 11, padding: '3px 10px', opacity: page >= totalPages - 1 ? 0.4 : 1 }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAdd && (
        <AddMachineModal
          onClose={() => setShowAdd(false)}
          onCreated={async () => {
            await refreshMachines();
            toast('Machine added', 'success');
          }}
        />
      )}
      {limitsMachine && (
        <SetLimitsModal
          machine={limitsMachine}
          onClose={() => setLimitsMachine(null)}
          onSaved={async () => {
            await refreshMachines();
            toast('Limits updated', 'success');
          }}
        />
      )}
    </div>
  );
}

/* ---------- threshold item sub-component ---------- */

function ThresholdItem({
  icon, label, min, max, unit, color,
}: {
  icon: React.ReactNode;
  label: string;
  min: number;
  max: number;
  unit: string;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center py-1" style={{ background: '#0e1726', margin: 1, borderRadius: 2 }}>
      <div className="flex items-center gap-1 mb-0.5" style={{ color }}>
        {icon}
        <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{label}</span>
      </div>
      <span className="text-xs font-mono" style={{ color: '#94a3b8' }}>
        {min}–{max} {unit}
      </span>
    </div>
  );
}

export default MachinesPage;
