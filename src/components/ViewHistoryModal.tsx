import { useEffect, useState } from 'react';
import { X, History, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Machine, SensorSnapshot } from '../types';

interface Props {
  machine: Machine | null;
  onClose: () => void;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

/**
 * Modal that loads and displays the most recent `sensor_snapshots` for a
 * machine in a scrollable, horizontally-packed table.
 */
export default function ViewHistoryModal({ machine, onClose }: Props) {
  const { user } = useAuth();
  const [snapshots, setSnapshots] = useState<SensorSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!machine || !user) return;
      setLoading(true);
      setError(null);
      const { data, error: queryError } = await supabase
        .from('sensor_snapshots')
        .select('*')
        .eq('machine_id', machine.id)
        .order('recorded_at', { ascending: false })
        .limit(200);
      if (cancelled) return;
      setLoading(false);
      if (queryError) {
        setError(queryError.message);
        return;
      }
      setSnapshots((data ?? []) as SensorSnapshot[]);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [machine, user]);

  const cols = [
    { key: 'recorded_at', label: 'TIME', render: (s: SensorSnapshot) => fmtTime(s.recorded_at) },
    { key: 'temperature', label: 'TEMP', render: (s: SensorSnapshot) => `${s.temperature} °C` },
    { key: 'vibration_rms', label: 'RMS', render: (s: SensorSnapshot) => `${s.vibration_rms}` },
    { key: 'current', label: 'CURR', render: (s: SensorSnapshot) => `${s.current} A` },
    { key: 'rpm', label: 'RPM', render: (s: SensorSnapshot) => `${s.rpm}` },
    { key: 'voltage', label: 'VOLT', render: (s: SensorSnapshot) => `${s.voltage} V` },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-2xl" style={{ background: '#0e1726', border: '1px solid #1e2d45', boxShadow: '0 0 40px rgba(0,0,0,0.8)' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #1e2d45', background: 'linear-gradient(180deg,#151f33 0%,#0f1726 100%)' }}>
          <div className="flex items-center gap-2">
            <History size={14} className="text-blue-400" />
            <span className="text-xs font-semibold text-slate-200 tracking-wide">HISTORY — {machine?.name ?? '—'}</span>
          </div>
          <button onClick={onClose}><X size={14} className="text-slate-500 hover:text-slate-300" /></button>
        </div>

        <div className="p-4 flex flex-col gap-3" style={{ maxHeight: '70vh' }}>
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-blue-400" />
              <span className="text-xs text-slate-400 ml-2">Loading history…</span>
            </div>
          )}

          {error && (
            <div className="px-2 py-1.5 text-[10px] text-red-400" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
              {error}
            </div>
          )}

          {!loading && !error && snapshots.length === 0 && (
            <div className="text-[11px] text-slate-500 text-center py-8">No history records available.</div>
          )}

          {!loading && !error && snapshots.length > 0 && (
            <div className="overflow-auto" style={{ border: '1px solid #1e2d45', maxHeight: '55vh' }}>
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#0f1726', zIndex: 1 }}>
                  <tr>
                    {cols.map((c) => (
                      <th key={c.key} className="text-left px-3 py-2 text-[10px] font-semibold text-slate-400 tracking-wide" style={{ borderBottom: '1px solid #1e2d45' }}>
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {snapshots.map((s, i) => (
                    <tr key={s.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(30,45,69,0.25)' }}>
                      {cols.map((c) => (
                        <td key={c.key} className="px-3 py-1.5 text-[10.5px] text-slate-300" style={{ borderBottom: '1px solid #141e30', whiteSpace: 'nowrap' }}>
                          {c.render(s)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            {!loading && !error && snapshots.length > 0 && (
              <span className="text-[10px] text-slate-500">{snapshots.length} record{snapshots.length === 1 ? '' : 's'}</span>
            )}
            <button className="btn-secondary ml-auto" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}
