import { useState, useEffect } from 'react';
import { X, Download, Loader2, FileText, FileJson } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Machine, SensorSnapshot } from '../types';

interface ExportModalProps {
  machine: Machine | null;
  onClose: () => void;
}

const COLORS = {
  border: '#1e2d45',
  text: '#94a3b8',
};

type ExportFormat = 'csv' | 'json';

export default function ExportModal({ machine, onClose }: ExportModalProps) {
  const [snapshots, setSnapshots] = useState<SensorSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState<ExportFormat>('csv');

  useEffect(() => {
    if (!machine) return;
    setLoading(true);
    setError(null);
    supabase
      .from('sensor_snapshots')
      .select('*')
      .eq('machine_id', machine.id)
      .order('recorded_at', { ascending: false })
      .limit(500)
      .then(({ data, error: fetchError }) => {
        setLoading(false);
        if (fetchError) {
          setError(fetchError.message);
          return;
        }
        setSnapshots((data as SensorSnapshot[]) ?? []);
      });
  }, [machine]);

  function doExport() {
    if (!machine || snapshots.length === 0) return;
    setExporting(true);

    try {
      const filename = `${machine.name.replace(/\s+/g, '_')}_export.${format}`;
      let content: string;
      let mime: string;

      if (format === 'csv') {
        const headers = [
          'id', 'machine_id', 'temperature', 'vibration_rms', 'current', 'rpm', 'voltage', 'recorded_at',
        ];
        const rows = snapshots.map((s) =>
          [s.id, s.machine_id, s.temperature, s.vibration_rms, s.current, s.rpm, s.voltage, s.recorded_at].join(','),
        );
        content = [headers.join(','), ...rows].join('\n');
        mime = 'text/csv';
      } else {
        content = JSON.stringify(snapshots, null, 2);
        mime = 'application/json';
      }

      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Export failed');
    }

    setExporting(false);
  }

  if (!machine) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div
        className="w-full max-w-md"
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
          <span className="text-xs font-semibold text-slate-200 tracking-wide">
            EXPORT DATA — {machine.name}
          </span>
          <button onClick={onClose}>
            <X size={14} className="text-slate-500 hover:text-slate-300" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin" style={{ color: COLORS.text }} />
            </div>
          ) : error ? (
            <div className="text-[11px] px-3 py-2" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
              {error}
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="flex items-center justify-between text-[11px]" style={{ color: COLORS.text }}>
                <span>Records available</span>
                <span className="font-bold text-slate-200">{snapshots.length}</span>
              </div>

              {/* Format selection */}
              <div>
                <div className="text-[10px] mb-2 tracking-wider" style={{ color: COLORS.text }}>
                  EXPORT FORMAT
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setFormat('csv')}
                    className="flex items-center gap-2 px-3 py-2 text-xs transition-all"
                    style={{
                      background: format === 'csv' ? 'rgba(59,130,246,0.15)' : '#060b14',
                      border: `1px solid ${format === 'csv' ? '#3b82f6' : COLORS.border}`,
                      color: format === 'csv' ? '#60a5fa' : COLORS.text,
                    }}
                  >
                    <FileText size={14} />
                    CSV
                  </button>
                  <button
                    onClick={() => setFormat('json')}
                    className="flex items-center gap-2 px-3 py-2 text-xs transition-all"
                    style={{
                      background: format === 'json' ? 'rgba(59,130,246,0.15)' : '#060b14',
                      border: `1px solid ${format === 'json' ? '#3b82f6' : COLORS.border}`,
                      color: format === 'json' ? '#60a5fa' : COLORS.text,
                    }}
                  >
                    <FileJson size={14} />
                    JSON
                  </button>
                </div>
              </div>

              {snapshots.length === 0 && (
                <div className="text-[11px] text-center py-4" style={{ color: COLORS.text }}>
                  No data available to export
                </div>
              )}

              {/* Buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onClose} className="btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={doExport}
                  disabled={exporting || snapshots.length === 0}
                  className="btn-monitor flex items-center gap-1.5"
                >
                  {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                  {exporting ? 'Exporting...' : 'Export'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
