import { useState, useRef, useEffect } from 'react';
import { FileText, FileSpreadsheet, FileType2, Camera, ChartBar as FileBarChart, BrainCircuit, ChevronUp, Download } from 'lucide-react';
export type ExportAction = 'pdf' | 'excel' | 'csv' | 'screenshot' | 'machine_report' | 'ai_report';
interface ExportCenterProps { onExport: (action: ExportAction) => void; exporting: boolean; exportLabel?: string; }
const exportItems: { action: ExportAction; label: string; icon: any; desc: string }[] = [
  { action: 'pdf', label: 'Export as PDF', icon: FileText, desc: 'Professional A4 report' },
  { action: 'excel', label: 'Export as Excel', icon: FileSpreadsheet, desc: 'Multi-sheet workbook' },
  { action: 'csv', label: 'Export as CSV', icon: FileType2, desc: 'Raw sensor data' },
  { action: 'screenshot', label: 'Screenshot', icon: Camera, desc: 'Dashboard capture' },
  { action: 'machine_report', label: 'Machine Report', icon: FileBarChart, desc: 'Detailed machine PDF' },
  { action: 'ai_report', label: 'AI Prediction Report', icon: BrainCircuit, desc: 'AI analysis report' },
];
export function ExportCenter({ onExport, exporting, exportLabel = 'Export Data' }: ExportCenterProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="btn btn-primary" onClick={() => setOpen(!open)} disabled={exporting} style={{ gap: 6 }}>
        {exporting ? <div className="loading-spinner" style={{ width: 14, height: 14 }} /> : <Download size={14} />}
        {exportLabel}
        <ChevronUp size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>
      {open && !exporting && (
        <div className="export-dropdown">
          {exportItems.map(item => {
            const Icon = item.icon;
            return (
              <div key={item.action} className="export-dropdown-item" onClick={() => { onExport(item.action); setOpen(false); }}>
                <div className="icon"><Icon size={16} /></div>
                <div><div className="label">{item.label}</div><div className="desc">{item.desc}</div></div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
export function ExportLoadingOverlay({ message }: { message: string }) {
  return (
    <div className="export-loading-overlay">
      <div className="spinner" />
      <p style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{message}</p>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Please wait...</p>
    </div>
  );
}
