import { useState, useEffect, useMemo } from 'react';
import { Cpu, Plus, Search, Trash2, SlidersHorizontal, Activity, Thermometer, Zap, ChevronDown, ChevronUp, Gauge, MapPin } from 'lucide-react';
import { useMonitoring } from '../contexts/MonitoringContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import type { Machine, MachineStatus, Sensor } from '../types';
import AddMachineModal from '../components/AddMachineModal';
import SetLimitsModal from '../components/SetLimitsModal';

type StatusFilter = 'all' | MachineStatus;

const STATUS_COLORS: Record<MachineStatus, string> = {
  online: '#22c55e',
  offline: '#64748b',
  warning: '#eab308',
  critical: '#ef4444',
};

const PAGE_SIZE = 9;

export function MachinesPage() {
  const { machines, refreshMachines, sensors, refreshSensors, selectMachine, monitoring, setMonitoring } = useMonitoring();
  const { user } = useAuth();
  const { success, error } = useToast();

  const [showAdd, setShowAdd] = useState(false);
  const [limitsMachine, setLimitsMachine] = useState<Machine | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    refreshMachines();
    refreshSensors();
  }, [refreshMachines, refreshSensors]);

  const filtered = useMemo(() => {
    return machines.filter((m) => {
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return m.name.toLowerCase().includes(q) ||
          m.location.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [machines, statusFilter, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => { setPage(0); }, [search, statusFilter]);

  async function handleDelete(machine: Machine) {
    if (!confirm(`Delete machine "${machine.name}"? This cannot be undone.`)) return;
    setDeleting(machine.id);
    const { error: delError } = await supabase.from('machines').delete().eq('id', machine.id);
    setDeleting(null);
    if (delError) {
      error(delError.message);
    } else {
      success('Machine deleted');
      refreshMachines();
    }
  }

  function handleMonitor(machine: Machine) {
    selectMachine(machine.id);
    setMonitoring(true);
  }

  const machineSensors = (mid: string) => sensors.filter((s) => s.machine_id === mid);

  const statusTabs: { id: StatusFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: machines.length },
    { id: 'online', label: 'Online', count: machines.filter((m) => m.status === 'online').length },
    { id: 'warning', label: 'Warning', count: machines.filter((m) => m.status === 'warning').length },
    { id: 'critical', label: 'Critical', count: machines.filter((m) => m.status === 'critical').length },
    { id: 'offline', label: 'Offline', count: machines.filter((m) => m.status === 'offline').length },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', borderBottom: '1px solid #1e2d45',
        background: 'linear-gradient(180deg, #0d1220 0%, #080d14 100%)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Cpu size={18} color="#3b82f6" />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', letterSpacing: '1px' }}>
            MACHINE MANAGEMENT
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, color: '#3b82f6',
            background: '#3b82f620', padding: '2px 8px', borderRadius: 8,
          }}>
            {machines.length}
          </span>
        </div>
        <button className="btn-monitor" onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={13} />
          Add Machine
        </button>
      </div>

      {/* Filter bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px', borderBottom: '1px solid #1e2d45',
        flexShrink: 0,
      }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
          <Search size={13} color="#64748b" style={{ position: 'absolute', left: 8, top: 8 }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search machines..."
            style={{
              width: '100%', background: '#060b14', border: '1px solid #1e2d45',
              color: '#e2e8f0', padding: '6px 10px 6px 28px', borderRadius: 4,
              fontSize: 12, outline: 'none',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {statusTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              style={{
                padding: '5px 12px', borderRadius: 4, cursor: 'pointer',
                fontSize: 11, fontWeight: 600,
                background: statusFilter === tab.id ? '#3b82f615' : 'transparent',
                border: '1px solid',
                borderColor: statusFilter === tab.id ? '#3b82f6' : '#1e2d45',
                color: statusFilter === tab.id ? '#60a5fa' : '#94a3b8',
              }}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Machine grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#64748b', fontSize: 13, padding: 40 }}>
            No machines found. Click "Add Machine" to get started.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 12,
          }}>
            {pageData.map((machine) => {
              const mSensors = machineSensors(machine.id);
              const isExpanded = expandedId === machine.id;
              const statusColor = STATUS_COLORS[machine.status];
              return (
                <div
                  key={machine.id}
                  className="panel"
                  style={{ borderRadius: 6, overflow: 'hidden' }}
                >
                  {/* Card header */}
                  <div style={{
                    padding: '10px 12px', borderBottom: '1px solid #1e2d45',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: statusColor,
                        boxShadow: `0 0 6px ${statusColor}`,
                      }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>
                        {machine.name}
                      </span>
                    </div>
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: statusColor,
                      textTransform: 'uppercase', letterSpacing: '0.5px',
                    }}>
                      {machine.status}
                    </span>
                  </div>

                  {/* Card body */}
                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#64748b', marginBottom: 8 }}>
                      <MapPin size={11} />
                      {machine.location || 'No location set'}
                    </div>
                    {machine.description && (
                      <div style={{ fontSize: 10.5, color: '#94a3b8', marginBottom: 8, lineHeight: 1.3 }}>
                        {machine.description}
                      </div>
                    )}

                    {/* Thresholds */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6,
                      marginBottom: 8,
                    }}>
                      <Threshold icon={Activity} color="#3b82f6" label="RMS" min={machine.rms_min} max={machine.rms_max} />
                      <Threshold icon={Thermometer} color="#f97316" label="Temp" min={machine.temp_min} max={machine.temp_max} unit="°" />
                      <Threshold icon={Zap} color="#eab308" label="Curr" min={machine.current_min} max={machine.current_max} />
                    </div>

                    {/* Sensor count + expand */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : machine.id)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '6px 8px', background: '#060b14', border: '1px solid #1e2d45',
                        borderRadius: 4, cursor: 'pointer', color: '#94a3b8', fontSize: 10,
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Gauge size={11} />
                        Sensors ({mSensors.length})
                      </span>
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>

                    {/* Expanded sensor list */}
                    {isExpanded && (
                      <div style={{ marginTop: 8, background: '#060b14', borderRadius: 4, border: '1px solid #1e2d45' }}>
                        {mSensors.length === 0 ? (
                          <div style={{ padding: '8px 10px', fontSize: 10, color: '#64748b' }}>
                            No sensors assigned to this machine
                          </div>
                        ) : (
                          mSensors.map((s: Sensor) => (
                            <div key={s.id} style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '6px 10px', borderBottom: '1px solid #111827', fontSize: 10,
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{
                                  width: 5, height: 5, borderRadius: '50%',
                                  background: s.status === 'active' ? '#22c55e' : '#64748b',
                                }} />
                                <span style={{ color: '#cbd5e1' }}>{s.name}</span>
                              </div>
                              <div style={{ display: 'flex', gap: 8, color: '#64748b' }}>
                                <span>{s.type}</span>
                                <span>{s.unit}</span>
                                <span>{s.sampling_rate}Hz</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                      <button
                        className="btn-monitor"
                        onClick={() => handleMonitor(machine)}
                        style={{ flex: 1, fontSize: 11, padding: '5px 8px' }}
                      >
                        Monitor
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => setLimitsMachine(machine)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '5px 8px' }}
                      >
                        <SlidersHorizontal size={11} />
                        Limits
                      </button>
                      <button
                        onClick={() => handleDelete(machine)}
                        disabled={deleting === machine.id}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          padding: '5px 8px', background: '#ef444410',
                          border: '1px solid #ef444440', borderRadius: 4,
                          cursor: 'pointer', color: '#ef4444',
                          opacity: deleting === machine.id ? 0.5 : 1,
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '8px 16px', borderTop: '1px solid #1e2d45',
        }}>
          <button className="btn-secondary" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} style={{ opacity: page === 0 ? 0.4 : 1, padding: '4px 10px' }}>
            Prev
          </button>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>Page {page + 1} of {totalPages}</span>
          <button className="btn-secondary" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} style={{ opacity: page >= totalPages - 1 ? 0.4 : 1, padding: '4px 10px' }}>
            Next
          </button>
        </div>
      )}

      {/* Modals */}
      {showAdd && (
        <AddMachineModal
          onClose={() => setShowAdd(false)}
          onCreated={() => { refreshMachines(); success('Machine added successfully'); }}
        />
      )}
      {limitsMachine && (
        <SetLimitsModal
          machine={limitsMachine}
          onClose={() => setLimitsMachine(null)}
          onSaved={() => { refreshMachines(); success('Limits saved successfully'); }}
        />
      )}
    </div>
  );
}

function Threshold({ icon: Icon, color, label, min, max, unit }: {
  icon: typeof Activity; color: string; label: string; min: number; max: number; unit?: string;
}) {
  return (
    <div style={{
      padding: '4px 6px', background: '#060b14', borderRadius: 3,
      border: '1px solid #1e2d45', textAlign: 'center',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, marginBottom: 2 }}>
        <Icon size={9} color={color} />
        <span style={{ fontSize: 8, color: '#64748b', fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: 9, color }}>
        {min}–{max}{unit ?? ''}
      </div>
    </div>
  );
}

export default MachinesPage;
