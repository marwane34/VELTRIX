import { useState } from 'react';
import {
  Plus, Cpu, MapPin, Trash2, Settings2, Activity, Search,
  Thermometer, Waves, Zap, Gauge, Battery, Gauge as PressureIcon,
  ChevronDown, ChevronUp, X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useMonitoring } from '../contexts/MonitoringContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { AddMachineModal } from '../components/AddMachineModal';
import { SetLimitsModal } from '../components/SetLimitsModal';
import type { Machine, Sensor } from '../types';

const SENSOR_TYPES = ['vibration', 'temperature', 'current', 'frequency', 'rpm', 'voltage', 'pressure'];
const UNITS: Record<string, string> = {
  vibration: 'g', temperature: '°C', current: 'A', frequency: 'Hz', rpm: 'RPM', voltage: 'V', pressure: 'bar',
};
const SENSOR_ICONS: Record<string, React.ElementType> = {
  vibration: Waves, temperature: Thermometer, current: Zap, frequency: Activity, rpm: Gauge, voltage: Battery, pressure: PressureIcon,
};

function statusColor(s: string) {
  return s === 'online' || s === 'active' ? '#22c55e' : s === 'warning' ? '#eab308' : s === 'critical' || s === 'error' ? '#ef4444' : '#64748b';
}

function typeIcon(type: string) {
  if (type === 'temperature') return '°C';
  if (type === 'current') return 'A';
  if (type === 'vibration') return 'g';
  if (type === 'rpm') return 'RPM';
  if (type === 'voltage') return 'V';
  if (type === 'pressure') return 'bar';
  if (type === 'frequency') return 'Hz';
  return type.charAt(0).toUpperCase();
}

const iStyle: React.CSSProperties = {
  background: '#060b14', border: '1px solid #1e2d45',
  color: '#e2e8f0', width: '100%', padding: '6px 10px',
  fontSize: 12, outline: 'none',
};

const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: '3px 8px', fontSize: 10, cursor: 'pointer',
  background: active ? 'linear-gradient(180deg,#1a3a6a 0%,#0f2040 100%)' : 'transparent',
  border: `1px solid ${active ? '#3b82f6' : '#1e2d45'}`,
  color: active ? '#93c5fd' : '#64748b',
});

function AddSensorInline({ machineId, onClose, onCreated }: {
  machineId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [type, setType] = useState('vibration');
  const [channel, setChannel] = useState('X');
  const [samplingRate, setSamplingRate] = useState('1000');
  const [minValue, setMinValue] = useState('0');
  const [maxValue, setMaxValue] = useState('100');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    const { error: err } = await supabase.from('sensors').insert({
      user_id: user.id,
      name: name.trim() || `${type.charAt(0).toUpperCase() + type.slice(1)} Sensor`,
      type,
      machine_id: machineId,
      channel,
      unit: UNITS[type] || 'g',
      sampling_rate: parseInt(samplingRate) || 1000,
      min_value: parseFloat(minValue) || 0,
      max_value: parseFloat(maxValue) || 100,
    });
    setLoading(false);
    if (err) { toast(err.message, 'error'); return; }
    toast('Sensor added', 'success');
    onCreated();
    onClose();
  }

  return (
    <div className="panel p-3 mb-3" style={{ borderColor: '#3b82f640' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-200">Add Sensor</span>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X size={12} /></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <input style={iStyle} placeholder="Sensor name" value={name} onChange={(e) => setName(e.target.value)} />
          <select style={iStyle} value={type} onChange={(e) => setType(e.target.value)}>
            {SENSOR_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <select style={iStyle} value={channel} onChange={(e) => setChannel(e.target.value)}>
            {['X', 'Y', 'Z', 'CH1', 'CH2', 'CH3'].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="number" style={iStyle} placeholder="Hz" value={samplingRate} onChange={(e) => setSamplingRate(e.target.value)} />
          <input type="number" step="0.1" style={iStyle} placeholder="Min" value={minValue} onChange={(e) => setMinValue(e.target.value)} />
          <input type="number" step="0.1" style={iStyle} placeholder="Max" value={maxValue} onChange={(e) => setMaxValue(e.target.value)} />
        </div>
        <button type="submit" disabled={loading} className="btn-monitor w-full py-1.5 text-xs">
          {loading ? 'Adding...' : 'Add Sensor'}
        </button>
      </form>
    </div>
  );
}

function MachineSensors({ machine, sensors, onRefresh }: {
  machine: Machine;
  sensors: Sensor[];
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const machineSensors = sensors.filter((s) => s.machine_id === machine.id);

  async function deleteSensor(id: string) {
    if (!confirm('Delete this sensor?')) return;
    setDeleting(id);
    await supabase.from('sensors').delete().eq('id', id);
    setDeleting(null);
    toast('Sensor deleted', 'success');
    onRefresh();
  }

  async function toggleStatus(sensor: Sensor) {
    const newStatus = sensor.status === 'active' ? 'inactive' : 'active';
    await supabase.from('sensors').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', sensor.id);
    onRefresh();
  }

  return (
    <div className="mt-3" style={{ borderTop: '1px solid #1e2d45', paddingTop: 10 }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
          Sensors ({machineSensors.length})
        </span>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="btn-secondary px-2 py-0.5 text-xs flex items-center gap-1"
        >
          <Plus size={9} /> Add
        </button>
      </div>

      {showAdd && (
        <AddSensorInline
          machineId={machine.id}
          onClose={() => setShowAdd(false)}
          onCreated={onRefresh}
        />
      )}

      {machineSensors.length === 0 && !showAdd ? (
        <div className="text-xs text-slate-600 py-2 text-center">No sensors configured for this machine</div>
      ) : (
        <div className="space-y-1.5">
          {machineSensors.map((s) => {
            const Icon = SENSOR_ICONS[s.type] ?? Activity;
            return (
              <div key={s.id} className="flex items-center gap-2 px-2 py-1.5" style={{ background: '#060b14', border: '1px solid #1a2540' }}>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: statusColor(s.status), boxShadow: `0 0 4px ${statusColor(s.status)}` }} />
                <Icon size={11} className="text-slate-500 shrink-0" />
                <span className="text-xs text-slate-300 font-medium flex-1 truncate">{s.name}</span>
                <span className="text-xs text-slate-600">{s.channel}</span>
                <span className="text-xs font-bold px-1.5 py-0.5" style={{ background: '#0d1f3c', border: '1px solid #1e4080', color: '#60a5fa' }}>
                  {typeIcon(s.type)}
                </span>
                <span className="text-xs text-slate-600">{s.sampling_rate}Hz</span>
                <button
                  onClick={() => toggleStatus(s)}
                  title={s.status === 'active' ? 'Deactivate' : 'Activate'}
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <Settings2 size={10} />
                </button>
                <button
                  onClick={() => deleteSensor(s.id)}
                  disabled={deleting === s.id}
                  title="Delete sensor"
                  className="text-slate-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function MachinesPage() {
  const { machines, sensors, refreshMachines, refreshSensors, selectMachine } = useMonitoring();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [editLimits, setEditLimits] = useState<Machine | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [expandedMachine, setExpandedMachine] = useState<string | null>(null);
  const pageSize = 8;

  async function deleteMachine(id: string) {
    if (!confirm('Delete this machine and all its data?')) return;
    setDeleting(id);
    await supabase.from('machines').delete().eq('id', id);
    setDeleting(null);
    toast('Machine deleted', 'success');
    refreshMachines();
  }

  const filtered = machines.filter((m) => {
    if (search && !m.name.toLowerCase().includes(search.toLowerCase()) && !(m.location || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== 'all' && m.status !== filterStatus) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="flex flex-col h-full" style={{ background: '#0b0f1a' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: '1px solid #1e2d45', background: 'linear-gradient(180deg,#111827 0%,#0b0f1a 100%)' }}>
        <div className="flex items-center gap-2">
          <Cpu size={16} className="text-blue-400" />
          <h2 className="text-sm font-semibold text-slate-200 tracking-wide">MACHINE MANAGEMENT</h2>
          <span className="text-xs px-1.5 py-0.5" style={{ background: '#0d1f3c', border: '1px solid #1e4080', color: '#60a5fa' }}>
            {machines.length} machines
          </span>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-monitor flex items-center gap-1.5 px-3 py-1.5">
          <Plus size={11} />
          <span>Add Machine</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 px-5 py-2 shrink-0" style={{ borderBottom: '1px solid #1e2d45', background: '#080d14' }}>
        <div className="flex items-center gap-1.5">
          <Search size={12} className="text-slate-600" />
          <input
            type="text"
            placeholder="Search by name or location..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ background: '#060b14', border: '1px solid #1e2d45', color: '#e2e8f0', padding: '4px 8px', fontSize: 11, outline: 'none', width: 200 }}
          />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-600">Status:</span>
          {['all', 'online', 'warning', 'critical', 'offline'].map((s) => (
            <button key={s} style={tabStyle(filterStatus === s)} onClick={() => { setFilterStatus(s); setPage(1); }}>
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Machine grid */}
      <div className="flex-1 overflow-y-auto p-5">
        {paginated.length === 0 ? (
          <div className="text-center py-20">
            <Cpu size={40} className="text-slate-700 mx-auto mb-4" />
            <div className="text-sm text-slate-400 mb-2">{machines.length === 0 ? 'No machines configured' : 'No machines match your filters'}</div>
            <div className="text-xs text-slate-600 mb-5">{machines.length === 0 ? 'Add your first machine to start monitoring' : 'Try adjusting your search or filters'}</div>
            {machines.length === 0 && <button onClick={() => setShowAdd(true)} className="btn-monitor px-6 py-2">Add Machine</button>}
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
            {paginated.map((m) => {
              const machineSensors = sensors.filter((s) => s.machine_id === m.id);
              const isExpanded = expandedMachine === m.id;
              return (
                <div key={m.id} className="panel p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: statusColor(m.status), boxShadow: `0 0 4px ${statusColor(m.status)}` }} />
                        <span className="text-sm font-semibold text-slate-200">{m.name}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <MapPin size={10} className="text-slate-600" />
                        <span className="text-xs text-slate-500">{m.location || 'No location'}</span>
                      </div>
                    </div>
                    <span
                      className="text-xs px-2 py-0.5 font-semibold"
                      style={{
                        background: `${statusColor(m.status)}18`,
                        border: `1px solid ${statusColor(m.status)}40`,
                        color: statusColor(m.status),
                      }}
                    >
                      {m.status.toUpperCase()}
                    </span>
                  </div>

                  {m.description && <p className="text-xs text-slate-500">{m.description}</p>}

                  {/* Thresholds */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Vibration', val: `${m.rms_min}–${m.rms_max}g`, color: '#3b82f6' },
                      { label: 'Temp', val: `${m.temp_min}–${m.temp_max}°C`, color: '#ef4444' },
                      { label: 'Current', val: `${m.current_min}–${m.current_max}A`, color: '#eab308' },
                    ].map((t) => (
                      <div key={t.label} className="text-center px-2 py-1.5" style={{ background: '#060b14', border: '1px solid #1a2540' }}>
                        <div className="text-xs font-bold" style={{ color: t.color }}>{t.val}</div>
                        <div className="text-xs text-slate-600">{t.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Sensor count summary */}
                  <div
                    className="flex items-center gap-2 px-2 py-1.5 cursor-pointer"
                    style={{ background: '#0d1520', border: '1px solid #1e2d45' }}
                    onClick={() => setExpandedMachine(isExpanded ? null : m.id)}
                  >
                    <Activity size={11} className="text-blue-400" />
                    <span className="text-xs text-slate-300 flex-1">
                      {machineSensors.length} sensor{machineSensors.length !== 1 ? 's' : ''} attached
                    </span>
                    {isExpanded ? <ChevronUp size={12} className="text-slate-500" /> : <ChevronDown size={12} className="text-slate-500" />}
                  </div>

                  {/* Expanded sensor list */}
                  {isExpanded && (
                    <MachineSensors
                      machine={m}
                      sensors={sensors}
                      onRefresh={refreshSensors}
                    />
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => { selectMachine(m.id); }}
                      className="btn-monitor flex items-center gap-1 flex-1 py-1.5 justify-center"
                    >
                      <Activity size={10} /> Monitor
                    </button>
                    <button onClick={() => setEditLimits(m)} className="btn-secondary flex items-center gap-1 flex-1 py-1.5 justify-center">
                      <Settings2 size={10} /> Limits
                    </button>
                    <button
                      onClick={() => deleteMachine(m.id)}
                      disabled={deleting === m.id}
                      className="btn-secondary py-1.5 px-2.5"
                      title="Delete machine"
                      style={{ borderColor: '#3b1818', color: '#f87171' }}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>

                  <div className="text-xs text-slate-600">Added {new Date(m.created_at).toLocaleDateString()}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 px-5 py-2 shrink-0" style={{ borderTop: '1px solid #1e2d45', background: '#060b14' }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary px-3 py-1 text-xs"
            style={{ opacity: page === 1 ? 0.4 : 1 }}
          >
            Prev
          </button>
          <span className="text-xs text-slate-400">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-secondary px-3 py-1 text-xs"
            style={{ opacity: page === totalPages ? 0.4 : 1 }}
          >
            Next
          </button>
        </div>
      )}

      {showAdd && <AddMachineModal onClose={() => setShowAdd(false)} onCreated={refreshMachines} />}
      {editLimits && <SetLimitsModal machine={editLimits} onClose={() => setEditLimits(null)} onSaved={refreshMachines} />}
    </div>
  );
}
