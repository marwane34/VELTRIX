import { useState } from 'react';
import { X, Download, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Machine } from '../types';

interface Props {
  machine: Machine | null;
  onClose: () => void;
}

export function ExportModal({ machine, onClose }: Props) {
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [range, setRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    if (!machine) return;
    setLoading(true);

    const now = new Date();
    const rangeMs: Record<string, number> = { '1h': 3600000, '24h': 86400000, '7d': 604800000, '30d': 2592000000 };
    const since = new Date(now.getTime() - rangeMs[range]).toISOString();

    const { data } = await supabase
      .from('sensor_snapshots')
      .select('*')
      .eq('machine_id', machine.id)
      .gte('recorded_at', since)
      .order('recorded_at', { ascending: true });

    setLoading(false);
    if (!data || data.length === 0) { alert('No data available for selected range.'); return; }

    let content = '';
    let filename = '';

    if (format === 'csv') {
      const headers = ['recorded_at', 'temperature', 'vibration_rms', 'current', 'rpm', 'voltage'];
      const rows = data.map((r) => headers.map((h) => (r as Record<string, unknown>)[h]).join(','));
      content = [headers.join(','), ...rows].join('\n');
      filename = `${machine.name.replace(/\s+/g, '_')}_${range}.csv`;
    } else {
      content = JSON.stringify(data, null, 2);
      filename = `${machine.name.replace(/\s+/g, '_')}_${range}.json`;
    }

    const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  const btnStyle = (active: boolean) => ({
    background: active ? 'linear-gradient(180deg,#1a3a6a 0%,#0f2040 100%)' : '#060b14',
    border: `1px solid ${active ? '#3b82f6' : '#1e2d45'}`,
    color: active ? '#93c5fd' : '#64748b',
    padding: '5px 12px', fontSize: 11, cursor: 'pointer',
  } as React.CSSProperties);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-sm" style={{ background: '#0e1726', border: '1px solid #1e2d45', boxShadow: '0 0 40px rgba(0,0,0,0.8)' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #1e2d45', background: 'linear-gradient(180deg,#151f33 0%,#0f1726 100%)' }}>
          <div className="flex items-center gap-2">
            <Download size={13} className="text-blue-400" />
            <span className="text-xs font-semibold text-slate-200 tracking-wide">EXPORT DATA</span>
          </div>
          <button onClick={onClose}><X size={14} className="text-slate-500 hover:text-slate-300" /></button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <div className="text-xs text-slate-400 mb-2">Machine: <span className="text-slate-200">{machine?.name ?? 'None'}</span></div>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-2">Format</div>
            <div className="flex gap-1">
              <button style={btnStyle(format === 'csv')} onClick={() => setFormat('csv')}>CSV</button>
              <button style={btnStyle(format === 'json')} onClick={() => setFormat('json')}>JSON</button>
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-2">Time Range</div>
            <div className="flex gap-1 flex-wrap">
              {(['1h','24h','7d','30d'] as const).map((r) => (
                <button key={r} style={btnStyle(range === r)} onClick={() => setRange(r)}>{r}</button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-2" style={{ background: '#060b14', border: '1px solid #1e2d45' }}>
            <FileText size={11} className="text-slate-500" />
            <span className="text-xs text-slate-500">Data includes: temperature, vibration, current, RPM, voltage</span>
          </div>

          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary flex-1 py-2">Cancel</button>
            <button onClick={handleExport} disabled={loading || !machine} className="btn-monitor flex-1 py-2">
              {loading ? 'Exporting...' : 'Export'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
