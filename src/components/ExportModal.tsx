import { useState, useEffect } from 'react';
import { X, Download, FileText, FileJson } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Machine, SensorSnapshot } from '../types';

interface ExportModalProps {
  machine: Machine | null;
  onClose: () => void;
}

type ExportFormat = 'csv' | 'json';

export default function ExportModal({ machine, onClose }: ExportModalProps) {
  const { user } = useAuth();
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [snapshots, setSnapshots] = useState<SensorSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!machine || !user) return;
    setLoading(true);
    supabase
      .from('sensor_snapshots')
      .select('*')
      .eq('machine_id', machine.id)
      .order('recorded_at', { ascending: false })
      .limit(500)
      .then(({ data }) => {
        setSnapshots((data as SensorSnapshot[]) ?? []);
        setLoading(false);
      });
  }, [machine, user]);

  function handleExport() {
    if (!machine || snapshots.length === 0) return;
    setExporting(true);

    let content = '';
    let filename = '';
    let mime = '';

    if (format === 'csv') {
      const headers = ['id', 'machine_id', 'temperature', 'vibration_rms', 'current', 'rpm', 'voltage', 'recorded_at'];
      const rows = snapshots.map((s) =>
        [s.id, s.machine_id, s.temperature, s.vibration_rms, s.current, s.rpm, s.voltage, s.recorded_at].join(',')
      );
      content = [headers.join(','), ...rows].join('\n');
      filename = `${machine.name.replace(/\s+/g, '_')}_export.csv`;
      mime = 'text/csv';
    } else {
      content = JSON.stringify(snapshots, null, 2);
      filename = `${machine.name.replace(/\s+/g, '_')}_export.json`;
      mime = 'application/json';
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    setExporting(false);
  }

  const formatButton = (fmt: ExportFormat, label: string, Icon: typeof FileText) => {
    const active = format === fmt;
    return (
      <button
        key={fmt}
        type="button"
        onClick={() => setFormat(fmt)}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          padding: '14px',
          background: active ? '#3b82f615' : '#060b14',
          border: `1px solid ${active ? '#3b82f6' : '#1e2d45'}`,
          borderRadius: 6,
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
      >
        <Icon size={24} color={active ? '#3b82f6' : '#64748b'} />
        <span style={{ fontSize: 11, fontWeight: 600, color: active ? '#3b82f6' : '#94a3b8' }}>{label}</span>
      </button>
    );
  };

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
          width: 440,
          maxWidth: '90vw',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderBottom: '1px solid #1e2d45',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Download size={16} color="#3b82f6" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.5px' }}>
              EXPORT DATA
              {machine ? ` — ${machine.name}` : ''}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!machine ? (
            <div style={{ textAlign: 'center', color: '#64748b', fontSize: 13, padding: 20 }}>
              No machine selected
            </div>
          ) : (
            <>
              {/* Data count */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', background: '#060b14', borderRadius: 4,
                border: '1px solid #1e2d45',
              }}>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>Available Records</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#60a5fa' }}>
                  {loading ? '...' : snapshots.length}
                </span>
              </div>

              {/* Format selection */}
              <div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>
                  Export Format
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {formatButton('csv', 'CSV', FileText)}
                  {formatButton('json', 'JSON', FileJson)}
                </div>
              </div>

              {/* Export button */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-monitor"
                  onClick={handleExport}
                  disabled={exporting || loading || snapshots.length === 0}
                  style={{ opacity: exporting || loading || snapshots.length === 0 ? 0.6 : 1 }}
                >
                  {exporting ? 'Exporting...' : `Export ${format.toUpperCase()}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
