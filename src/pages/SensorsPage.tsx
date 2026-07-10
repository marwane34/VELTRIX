import { useState } from 'react';
import { Plus, Wifi, Trash2, Cpu, Settings2, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useMonitoring } from '../contexts/MonitoringContext';
import { useAuth } from '../contexts/AuthContext';
import { AddSensorModal } from '../components/AddSensorModal';
import { AssignSensorModal } from '../components/AssignSensorModal';
import type { Sensor } from '../types';

export function SensorsPage() {
  const { sensors, machines, refreshSensors } = useMonitoring();
  const { user } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [assignSensor, setAssignSensor] = useState<Sensor | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  async function deleteSensor(id: string) {
    if (!confirm('Delete this sensor?')) return;
    setDeleting(id);
    await supabase.from('sensors').delete().eq('id', id);
    setDeleting(null);
    refreshSensors();
  }

  async function toggleStatus(sensor: Sensor) {
    const newStatus = sensor.status === 'active' ? 'inactive' : 'active';
    await supabase.from('sensors').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', sensor.id);
    refreshSensors();
  }

  const filtered = sensors.filter((s) => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType !== 'all' && s.type !== filterType) return false;
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  function machineName(id: string | null) {
    if (!id) return 'Unassigned';
    return machines.find((m) => m.id === id)?.name ?? 'Unknown';
  }

  function statusColor(s: string) {
    return s === 'active' ? '#22c55e' : s === 'error' ? '#ef4444' : '#64748b';
  }

  function typeIcon(type: string) {
    if (type === 'temperature') return '°C';
    if (type === 'current') return 'A';
    if (type === 'vibration') return 'g';
    if (type === 'rpm') return 'RPM';
    if (type === 'voltage') return 'V';
    return type.charAt(0).toUpperCase();
  }

  const selectStyle = {
    background: '#060b14', border: '1px solid #1e2d45', color: '#94a3b8',
    padding: '4px 8px', fontSize: 11, outline: 'none',
  } as React.CSSProperties;

  const tabStyle = (active: boolean) => ({
    padding: '3px 8px', fontSize: 10, cursor: 'pointer',
    background: active ? 'linear-gradient(180deg,#1a3a6a 0%,#0f2040 100%)' : 'transparent',
    border: `1px solid ${active ? '#3b82f6' : '#1e2d45'}`,
    color: active ? '#93c5fd' : '#64748b',
  } as React.CSSProperties);

  return (
    <div className="flex flex-col h-full" style={{ background: '#0b0f1a' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: '1px solid #1e2d45', background: 'linear-gradient(180deg,#111827 0%,#0b0f1a 100%)' }}>
        <div className="flex items-center gap-2">
          <Wifi size={16} className="text-blue-400" />
          <h2 className="text-sm font-semibold text-slate-200 tracking-wide">SENSOR MANAGEMENT</h2>
          <span className="text-xs px-1.5 py-0.5" style={{ background: '#0d1f3c', border: '1px solid #1e4080', color: '#60a5fa' }}>
            {sensors.length} sensors
          </span>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-monitor flex items-center gap-1.5 px-3 py-1.5">
          <Plus size={11} />
          <span>Add Sensor</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 px-5 py-2 shrink-0" style={{ borderBottom: '1px solid #1e2d45', background: '#080d14' }}>
        <div className="flex items-center gap-1.5">
          <Search size={12} className="text-slate-600" />
          <input
            type="text"
            placeholder="Search sensors..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ background: '#060b14', border: '1px solid #1e2d45', color: '#e2e8f0', padding: '4px 8px', fontSize: 11, outline: 'none', width: 180 }}
          />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-600">Type:</span>
          {['all', 'vibration', 'temperature', 'current', 'rpm', 'voltage'].map((t) => (
            <button key={t} style={tabStyle(filterType === t)} onClick={() => { setFilterType(t); setPage(1); }}>
              {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 ml-2">
          <span className="text-xs text-slate-600">Status:</span>
          {['all', 'active', 'inactive', 'error'].map((s) => (
            <button key={s} style={tabStyle(filterStatus === s)} onClick={() => { setFilterStatus(s); setPage(1); }}>
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Sensor grid */}
      <div className="flex-1 overflow-y-auto p-5">
        {paginated.length === 0 ? (
          <div className="text-center py-20">
            <Wifi size={40} className="text-slate-700 mx-auto mb-4" />
            <div className="text-sm text-slate-400 mb-2">No sensors configured</div>
            <div className="text-xs text-slate-600 mb-5">Add your first sensor to start collecting data</div>
            <button onClick={() => setShowAdd(true)} className="btn-monitor px-6 py-2">Add Sensor</button>
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {paginated.map((s) => (
              <div key={s.id} className="panel p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: statusColor(s.status), boxShadow: `0 0 4px ${statusColor(s.status)}` }} />
                      <span className="text-sm font-semibold text-slate-200">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <Cpu size={10} className="text-slate-600" />
                      <span className="text-xs text-slate-500">{machineName(s.machine_id)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold px-2 py-0.5" style={{ background: '#0d1f3c', border: '1px solid #1e4080', color: '#60a5fa' }}>
                      {typeIcon(s.type)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center px-2 py-1.5" style={{ background: '#060b14', border: '1px solid #1a2540' }}>
                    <div className="text-xs font-bold text-slate-300">{s.channel}</div>
                    <div className="text-xs text-slate-600">Channel</div>
                  </div>
                  <div className="text-center px-2 py-1.5" style={{ background: '#060b14', border: '1px solid #1a2540' }}>
                    <div className="text-xs font-bold text-slate-300">{s.sampling_rate}</div>
                    <div className="text-xs text-slate-600">Hz</div>
                  </div>
                  <div className="text-center px-2 py-1.5" style={{ background: '#060b14', border: '1px solid #1a2540' }}>
                    <div className="text-xs font-bold text-slate-300">{s.min_value}-{s.max_value}</div>
                    <div className="text-xs text-slate-600">{s.unit}</div>
                  </div>
                </div>

                {s.description && <p className="text-xs text-slate-500">{s.description}</p>}

                <div className="flex gap-2 pt-1">
                  <button onClick={() => toggleStatus(s)} className="btn-secondary flex items-center gap-1 flex-1 py-1.5 justify-center">
                    <Settings2 size={10} /> {s.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => setAssignSensor(s)} className="btn-secondary flex items-center gap-1 flex-1 py-1.5 justify-center">
                    <Cpu size={10} /> Assign
                  </button>
                  <button
                    onClick={() => deleteSensor(s.id)}
                    disabled={deleting === s.id}
                    className="btn-secondary py-1.5 px-2.5"
                    title="Delete sensor"
                    style={{ borderColor: '#3b1818', color: '#f87171' }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}
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

      {showAdd && <AddSensorModal onClose={() => setShowAdd(false)} onCreated={refreshSensors} />}
      {assignSensor && <AssignSensorModal sensor={assignSensor} machines={machines} onClose={() => setAssignSensor(null)} onSaved={refreshSensors} />}
    </div>
  );
}
