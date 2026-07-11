import { useState, useEffect } from 'react';
import { X, Loader as Loader2, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Machine, SensorSnapshot } from '../types';

interface ViewHistoryModalProps {
  machine: Machine | null;
  onClose: () => void;
}

const COLORS = {
  border: '#1e2d45',
  text: '#94a3b8',
  grid: '#1a2540',
};

export default function ViewHistoryModal({ machine, onClose }: ViewHistoryModalProps) {
  const [snapshots, setSnapshots] = useState<SensorSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!machine) return;
    setLoading(true);
    setError(null);
    supabase
      .from('sensor_snapshots')
      .select('*')
      .eq('machine_id', machine.id)
      .order('recorded_at', { ascending: false })
      .limit(50)
      .then(({ data, error: fetchError }) => {
        setLoading(false);
        if (fetchError) {
          setError(fetchError.message);
          return;
        }
        setSnapshots((data as SensorSnapshot[]) ?? []);
      });
  }, [machine]);

  if (!machine) return null;

  function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  const thStyle: React.CSSProperties = {
    color: COLORS.text,
    fontWeight: 600,
    textAlign: 'left',
    padding: '6px 8px',
    borderBottom: `1px solid ${COLORS.border}`,
    fontSize: 10,
  };

  const tdStyle: React.CSSProperties = {
    color: '#c8d6ea',
    padding: '5px 8px',
    borderBottom: `1px solid ${COLORS.grid}`,
    fontSize: 10,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div
        className="w-full max-w-2xl"
        style={{ background: '#0e1726', border: `1px solid ${COLORS.border}`, boxShadow: '0 0 40px rgba(0,0,0,0.8)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{
            borderBottom: `1px solid ${COLORS.border}`,
            background: 'linear-gradient(180deg,#151f33 0%,#0f1726 100%)',
          }}
        >
          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 tracking-wide">
            <Clock size={13} className="text-slate-400" />
            HISTORY — {machine.name}
          </span>
          <button onClick={onClose}>
            <X size={14} className="text-slate-500 hover:text-slate-300" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin" style={{ color: COLORS.text }} />
            </div>
          ) : error ? (
            <div className="text-[11px] px-3 py-2" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
              {error}
            </div>
          ) : snapshots.length === 0 ? (
            <div className="text-[11px] text-center py-12" style={{ color: COLORS.text }}>
              No history available
            </div>
          ) : (
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Time</th>
                    <th style={thStyle}>Temp (°C)</th>
                    <th style={thStyle}>Vib RMS</th>
                    <th style={thStyle}>Current (A)</th>
                    <th style={thStyle}>RPM</th>
                    <th style={thStyle}>Voltage</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.map((s) => (
                    <tr key={s.id} style={{ transition: 'background 0.15s' }}>
                      <td style={tdStyle}>{formatTime(s.recorded_at)}</td>
                      <td style={{ ...tdStyle, color: '#fb923c' }}>{s.temperature.toFixed(1)}</td>
                      <td style={{ ...tdStyle, color: '#60a5fa' }}>{s.vibration_rms.toFixed(3)}</td>
                      <td style={{ ...tdStyle, color: '#facc15' }}>{s.current.toFixed(2)}</td>
                      <td style={{ ...tdStyle, color: '#22d3ee' }}>{s.rpm}</td>
                      <td style={{ ...tdStyle, color: '#94a3b8' }}>{s.voltage.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end pt-3">
            <button onClick={onClose} className="btn-secondary">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
