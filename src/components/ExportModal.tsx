import { useEffect, useState } from 'react';
import { X, Download, FileText, FileJson, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Machine, SensorSnapshot } from '../types';

interface Props {
  machine: Machine | null;
  onClose: () => void;
}

/**
 * Modal that fetches recent `sensor_snapshots` for the given machine and lets
 * the user download them as CSV or JSON via Blob URLs.
 */
export default function ExportModal({ machine, onClose }: Props) {
  const { user } = useAuth();
  const [snapshots, setSnapshots] = useState<SensorSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

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
        .limit(1000);
      if (cancelled) return;
      setLoading(false);
      if (queryError) {
        setError(queryError.message);
        return;
      }
      setSnapshots((data ?? []) as SensorSnapshot[]);
      setDone(true);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [machine, user]);

  function downloadBlob(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportCSV() {
    if (!snapshots.length) return;
    const headers = ['id', 'machine_id', 'temperature', 'vibration_rms', 'current', 'rpm', 'voltage', 'recorded_at'];
    const rows = snapshots.map((s) =>
      [s.id, s.machine_id, s.temperature, s.vibration_rms, s.current, s.rpm, s.voltage, s.recorded_at]
        .map((v) => {
          const cell = String(v ?? '');
          return cell.includes(',') || cell.includes('"') ? `"${cell.replace(/"/g, '""')}"` : cell;
        })
        .join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    downloadBlob(csv, `${machine?.name ?? 'machine'}_snapshots.csv`, 'text/csv;charset=utf-8;');
  }

  function exportJSON() {
    if (!snapshots.length) return;
    downloadBlob(JSON.stringify(snapshots, null, 2), `${machine?.name ?? 'machine'}_snapshots.json`, 'application/json');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md" style={{ background: '#0e1726', border: '1px solid #1e2d45', boxShadow: '0 0 40px rgba(0,0,0,0.8)' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #1e2d45', background: 'linear-gradient(180deg,#151f33 0%,#0f1726 100%)' }}>
          <div className="flex items-center gap-2">
            <Download size={14} className="text-blue-400" />
            <span className="text-xs font-semibold text-slate-200 tracking-wide">EXPORT DATA — {machine?.name ?? '—'}</span>
          </div>
          <button onClick={onClose}><X size={14} className="text-slate-500 hover:text-slate-300" /></button>
        </div>

        <div className="p-4 flex flex-col gap-3">
          {loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={20} className="animate-spin text-blue-400" />
              <span className="text-xs text-slate-400 ml-2">Loading snapshots…</span>
            </div>
          )}

          {error && (
            <div className="px-2 py-1.5 text-[10px] text-red-400" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
              {error}
            </div>
          )}

          {done && !error && (
            <>
              <div className="px-3 py-2 text-[11px] text-slate-300" style={{ background: '#080d14', border: '1px solid #1e2d45' }}>
                <span className="text-slate-400">Loaded </span>
                <span className="val-blue font-semibold">{snapshots.length}</span>
                <span className="text-slate-400"> snapshot{snapshots.length === 1 ? '' : 's'} for </span>
                <span className="text-slate-200">{machine?.name}</span>
              </div>

              {snapshots.length === 0 ? (
                <div className="text-[11px] text-slate-500 text-center py-4">No snapshots available to export.</div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button className="btn-secondary flex items-center justify-center gap-2 py-3" onClick={exportCSV}>
                    <FileText size={16} className="text-green-400" />
                    <div className="flex flex-col items-start">
                      <span className="text-xs font-semibold">CSV</span>
                      <span className="text-[9px] text-slate-500">Spreadsheet</span>
                    </div>
                  </button>
                  <button className="btn-secondary flex items-center justify-center gap-2 py-3" onClick={exportJSON}>
                    <FileJson size={16} className="text-yellow-400" />
                    <div className="flex flex-col items-start">
                      <span className="text-xs font-semibold">JSON</span>
                      <span className="text-[9px] text-slate-500">Structured</span>
                    </div>
                  </button>
                </div>
              )}
            </>
          )}

          <div className="flex items-center justify-end pt-1">
            <button className="btn-secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}
