import { useState, useRef, useEffect, ReactNode } from 'react';
import {
  FileText, FileSpreadsheet, FileType2, Camera, FileBarChart, BrainCircuit, ChevronUp, Loader2,
} from 'lucide-react';

export type ExportAction = 'pdf' | 'excel' | 'csv' | 'screenshot' | 'machine_report' | 'ai_report';

interface ExportCenterProps {
  onExport: (action: ExportAction) => void;
  exporting: boolean;
  exportLabel?: string;
}

const MENU_ITEMS: { action: ExportAction; label: string; icon: typeof FileText; desc: string }[] = [
  { action: 'pdf', label: 'Export as PDF', icon: FileText, desc: 'Professional A4 report' },
  { action: 'excel', label: 'Export as Excel', icon: FileSpreadsheet, desc: 'All tables (.xlsx)' },
  { action: 'csv', label: 'Export as CSV', icon: FileType2, desc: 'Raw sensor data' },
  { action: 'screenshot', label: 'Dashboard Screenshot', icon: Camera, desc: 'PNG image' },
  { action: 'machine_report', label: 'Machine Report', icon: FileBarChart, desc: 'Full machine PDF' },
  { action: 'ai_report', label: 'AI Prediction Report', icon: BrainCircuit, desc: 'AI analysis PDF' },
];

export function ExportCenter({ onExport, exporting, exportLabel = 'Export Data' }: ExportCenterProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={exporting}
        className="btn-secondary flex items-center gap-1.5"
        style={{ opacity: exporting ? 0.6 : 1, cursor: exporting ? 'wait' : 'pointer' }}
      >
        {exporting ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
        <span>{exporting ? 'Exporting...' : exportLabel}</span>
        <ChevronUp size={10} style={{ opacity: open ? 1 : 0.5, transition: 'transform 0.15s', transform: open ? 'rotate(0deg)' : 'rotate(180deg)' }} />
      </button>
      {open && !exporting && (
        <div className="export-dropdown">
          {MENU_ITEMS.map((item) => (
            <div
              key={item.action}
              className="export-dropdown-item"
              onClick={() => { onExport(item.action); setOpen(false); }}
            >
              <item.icon size={14} style={{ color: '#3b82f6', flexShrink: 0 }} />
              <div className="flex flex-col">
                <span style={{ fontWeight: 600, fontSize: 12 }}>{item.label}</span>
                <span style={{ fontSize: 10, color: '#64748b' }}>{item.desc}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ExportLoadingOverlay({ message }: { message: string }) {
  return (
    <div className="export-loading-overlay">
      <div className="flex flex-col items-center gap-4">
        <div style={{ width: 48, height: 48, border: '3px solid #1e2d45', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>{message}</span>
        <span style={{ fontSize: 11, color: '#64748b' }}>Generating report...</span>
      </div>
    </div>
  );
}
