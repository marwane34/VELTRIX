import { useState, useEffect } from 'react';
import { X, History, Thermometer, Activity, Zap, Gauge } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Machine, SensorSnapshot } from '../types';

interface ViewHistoryModalProps {
  machine: Machine | null;
  onClose: () => void;
}

const PAGE_SIZE = 15;

export default function ViewHistoryModal({ machine, onClose }: ViewHistoryModalProps) {
  const { user } = useAuth();
  const [snapshots, setSnapshots] = useState<SensorSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!machine || !user) return;
    setLoading(true);
    setPage(0);
    supabase
      .from('sensor_snapshots')
      .select('*')
      .eq('machine_id', machine.id)
      .order('recorded_at', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setSnapshots((data as SensorSnapshot[]) ?? []);
        setLoading(false);
      });
  }, [machine, user]);

  const totalPages = Math.ceil(snapshots.length / PAGE_SIZE);
  const pageData = snapshots.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#0e1726',
          border: '1px solid #1e2d45',
          borderRadius: 8,
          width: 720,
          maxWidth: '90vw',
          maxHeight: '80vh',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderBottom: '1px solid #1e2d45', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <History size={16} color="#3b82f6" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.5px' }}>
              HISTORY
              {machine ? ` — ${machine.name}` : ''}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 16, overflow: 'auto', flex: 1 }}>
          {!machine ? (
            <div style={{ textAlign: 'center', color: '#64748b', fontSize: 13, padding: 20 }}>
              No machine selected
            </div>
          ) : loading ? (
            <div style={{ textAlign: 'center', color: '#64748b', fontSize: 13, padding: 40 }}>
              Loading history...
            </div>
          ) : snapshots.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', fontSize: 13, padding: 40 }}>
              No sensor data recorded yet
            </div>
          ) : (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1e2d45' }}>
                    <th style={{ textAlign: 'left', padding: '6px 8px', color: '#94a3b8', fontWeight: 600, fontSize: 10, letterSpacing: '0.5px' }}>TIMESTAMP</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px', color: '#f97316', fontWeight: 600, fontSize: 10, letterSpacing: '0.5px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Thermometer size={10} /> TEMP</span>
                    </th>
                    <th style={{ textAlign: 'right', padding: '6px 8px', color: '#3b82f6', fontWeight: 600, fontSize: 10, letterSpacing: '0.5px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Activity size={10} /> VIB RMS</span>
                    </th>
                    <th style={{ textAlign: 'right', padding: '6px 8px', color: '#eab308', fontWeight: 600, fontSize: 10, letterSpacing: '0.5px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Zap size={10} /> CURRENT</span>
                    </th>
                    <th style={{ textAlign: 'right', padding: '6px 8px', color: '#06b6d4', fontWeight: 600, fontSize: 10, letterSpacing: '0.5px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Gauge size={10} /> RPM</span>
                    </th>
                    <th style={{ textAlign: 'right', padding: '6px 8px', color: '#94a3b8', fontWeight: 600, fontSize: 10, letterSpacing: '0.5px' }}>VOLT</th>
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #111827' }}>
                      <td style={{ padding: '5px 8px', color: '#94a3b8', fontSize: 10.5 }}>{formatTime(s.recorded_at)}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right', color: '#fb923c', fontSize: 10.5 }}>{s.temperature.toFixed(1)}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right', color: '#60a5fa', fontSize: 10.5 }}>{s.vibration_rms.toFixed(3)}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right', color: '#facc15', fontSize: 10.5 }}>{s.current.toFixed(2)}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right', color: '#22d3ee', fontSize: 10.5 }}>{s.rpm}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right', color: '#94a3b8', fontSize: 10.5 }}>{s.voltage.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 }}>
                  <button
                    className="btn-secondary"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    style={{ opacity: page === 0 ? 0.4 : 1, padding: '4px 10px' }}
                  >
                    Prev
                  </button>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>
                    Page {page + 1} of {totalPages}
                  </span>
                  <button
                    className="btn-secondary"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    style={{ opacity: page >= totalPages - 1 ? 0.4 : 1, padding: '4px 10px' }}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
