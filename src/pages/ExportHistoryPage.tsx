import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileClock, Search, Download, Trash2, Loader2, FileText, FileSpreadsheet,
  Camera, FileBarChart, BrainCircuit, Filter, X, ChevronLeft,
  ChevronRight, Calendar, Cpu, HardDrive,
} from 'lucide-react';
import { useMonitoring } from '../contexts/MonitoringContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { deleteReportRecord } from '../lib/exportUtils';
import type { Report, ExportType, Machine } from '../types';

interface ExportHistoryPageProps {
  onNavigate: (page: string) => void;
}

const exportTypeConfig: Record<ExportType, { label: string; icon: typeof FileText; color: string }> = {
  pdf: { label: 'PDF', icon: FileText, color: '#ef4444' },
  excel: { label: 'Excel', icon: FileSpreadsheet, color: '#22c55e' },
  csv: { label: 'CSV', icon: FileText, color: '#3b82f6' },
  screenshot: { label: 'Screenshot', icon: Camera, color: '#a855f7' },
  machine_report: { label: 'Machine Report', icon: FileBarChart, color: '#fb923c' },
  ai_report: { label: 'AI Report', icon: BrainCircuit, color: '#22d3ee' },
};

const inputStyle: React.CSSProperties = {
  background: '#0a1220', border: '1px solid #1e2d45', color: '#e2e8f0',
  fontSize: 12, padding: '6px 10px', outline: 'none', width: '100%',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const PAGE_SIZE = 15;

/**
 * ExportHistoryPage — view, search, filter, download, and delete previous reports.
 * Fetches from the 'reports' table filtered by the current user.
 */
export function ExportHistoryPage({ onNavigate }: ExportHistoryPageProps) {
  const { machines } = useMonitoring();
  const { user } = useAuth();
  const { toast } = useToast();

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [machineFilter, setMachineFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'all' | ExportType>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Report | null>(null);

  const fetchReports = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setReports((data as Report[]) ?? []);
    } catch (err) {
      toast('Failed to load reports: ' + (err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const machineMap = useMemo(() => {
    const map: Record<string, Machine> = {};
    machines.forEach((m) => { map[m.id] = m; });
    return map;
  }, [machines]);

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      // Search by report_name
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!r.report_name.toLowerCase().includes(q) && !(r.created_by ?? '').toLowerCase().includes(q)) return false;
      }
      // Filter by machine
      if (machineFilter !== 'all' && r.machine_id !== machineFilter) return false;
      // Filter by export type
      if (typeFilter !== 'all' && r.export_type !== typeFilter) return false;
      // Filter by date range
      if (fromDate) {
        const from = new Date(fromDate).getTime();
        if (new Date(r.created_at).getTime() < from) return false;
      }
      if (toDate) {
        const to = new Date(toDate).getTime() + 86400000; // include the full day
        if (new Date(r.created_at).getTime() > to) return false;
      }
      return true;
    });
  }, [reports, search, machineFilter, typeFilter, fromDate, toDate]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageReports = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: reports.length };
    (['pdf', 'excel', 'csv', 'screenshot', 'machine_report', 'ai_report'] as ExportType[]).forEach((t) => {
      counts[t] = reports.filter((r) => r.export_type === t).length;
    });
    return counts;
  }, [reports]);

  function handleDownload(report: Report) {
    // Files are generated client-side at export time and not stored on a server.
    // We inform the user to re-export from the dashboard for fresh data.
    toast('File was generated on export. Re-export from dashboard for fresh data.', 'info');
  }

  async function handleDelete(report: Report) {
    setDeleting(report.id);
    try {
      await deleteReportRecord(report.id);
      setReports((prev) => prev.filter((r) => r.id !== report.id));
      toast('Report record deleted', 'success');
      setConfirmDelete(null);
    } catch (err) {
      toast('Failed to delete: ' + (err as Error).message, 'error');
    } finally {
      setDeleting(null);
    }
  }

  function clearFilters() {
    setSearch('');
    setMachineFilter('all');
    setTypeFilter('all');
    setFromDate('');
    setToDate('');
    setPage(0);
  }

  const hasFilters = search || machineFilter !== 'all' || typeFilter !== 'all' || fromDate || toDate;

  return (
    <div className="flex flex-col" style={{ height: '100%', background: '#060b14' }}>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ padding: '12px 16px', borderBottom: '1px solid #1e2d45', flexShrink: 0 }}>
        <div className="flex items-center gap-3">
          <FileClock size={20} style={{ color: '#3b82f6' }} />
          <span className="font-bold tracking-wider" style={{ fontSize: 14, color: '#e2e8f0' }}>EXPORT HISTORY</span>
          <span className="flex items-center justify-center font-bold" style={{ minWidth: 24, height: 22, padding: '0 8px', fontSize: 11, color: '#60a5fa', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 3 }}>
            {reports.length}
          </span>
        </div>
        <button onClick={() => onNavigate('dashboard')} className="btn-secondary flex items-center gap-2" style={{ padding: '5px 12px' }}>
          <ChevronLeft size={13} /> Back to Dashboard
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3" style={{ padding: '12px 16px', borderBottom: '1px solid #1e2d45', flexShrink: 0 }}>
        {/* Search row */}
        <div className="flex items-center gap-3">
          <div className="relative" style={{ flex: 1, maxWidth: 360 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search by report name..."
              style={{ ...inputStyle, paddingLeft: 32 }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#3b82f6')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#1e2d45')}
            />
          </div>
          {hasFilters && (
            <button onClick={clearFilters} className="btn-secondary flex items-center gap-1.5" style={{ padding: '5px 10px' }}>
              <X size={12} /> Clear Filters
            </button>
          )}
        </div>

        {/* Filter dropdowns row */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Machine filter */}
          <div className="flex items-center gap-2">
            <Cpu size={13} style={{ color: '#64748b' }} />
            <select value={machineFilter} onChange={(e) => { setMachineFilter(e.target.value); setPage(0); }} style={{ ...inputStyle, width: 'auto', minWidth: 150 }}>
              <option value="all">All Machines</option>
              {machines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          {/* Type filter */}
          <div className="flex items-center gap-2">
            <Filter size={13} style={{ color: '#64748b' }} />
            <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value as 'all' | ExportType); setPage(0); }} style={{ ...inputStyle, width: 'auto', minWidth: 150 }}>
              <option value="all">All Types</option>
              {(Object.keys(exportTypeConfig) as ExportType[]).map((t) => (
                <option key={t} value={t}>{exportTypeConfig[t].label} ({typeCounts[t] ?? 0})</option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2">
            <Calendar size={13} style={{ color: '#64748b' }} />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPage(0); }}
              style={{ ...inputStyle, width: 'auto', colorScheme: 'dark' }}
              title="From date"
            />
            <span style={{ color: '#64748b', fontSize: 11 }}>to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPage(0); }}
              style={{ ...inputStyle, width: 'auto', colorScheme: 'dark' }}
              title="To date"
            />
          </div>

          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#64748b' }}>
            {filtered.length} of {reports.length} reports
          </span>
        </div>
      </div>

      {/* Table / Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {loading ? (
          <div className="flex flex-col items-center justify-center" style={{ height: '100%', gap: 12 }}>
            <Loader2 size={32} className="animate-spin" style={{ color: '#3b82f6' }} />
            <span style={{ fontSize: 12, color: '#64748b' }}>Loading export history...</span>
          </div>
        ) : reports.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center" style={{ height: '100%', gap: 16 }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#0e1726', border: '1px solid #1e2d45', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileClock size={36} style={{ color: '#475569' }} />
            </div>
            <div className="flex flex-col items-center gap-2">
              <span style={{ fontSize: 15, fontWeight: 600, color: '#94a3b8' }}>No Export Reports Yet</span>
              <span style={{ fontSize: 12, color: '#64748b', textAlign: 'center', maxWidth: 360 }}>
                Reports generated from the dashboard (PDF, Excel, CSV, screenshots, machine reports, and AI reports) will appear here.
              </span>
            </div>
            <button onClick={() => onNavigate('dashboard')} className="btn-monitor flex items-center gap-2" style={{ padding: '8px 16px' }}>
              <ChevronLeft size={14} /> Go to Dashboard
            </button>
          </div>
        ) : filtered.length === 0 ? (
          /* No results after filtering */
          <div className="flex flex-col items-center justify-center" style={{ height: '100%', gap: 12 }}>
            <Search size={40} style={{ color: '#475569', opacity: 0.5 }} />
            <span style={{ fontSize: 13, color: '#64748b' }}>No reports match your filters.</span>
            <button onClick={clearFilters} className="btn-secondary" style={{ padding: '5px 12px' }}>Clear Filters</button>
          </div>
        ) : (
          /* Reports table */
          <div className="panel" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: '#0d1525', borderBottom: '1px solid #1e2d45' }}>
                    {['Report Name', 'Machine', 'Type', 'Created By', 'Date', 'File Size', 'Actions'].map((h) => (
                      <th key={h} style={{
                        padding: '8px 12px', textAlign: h === 'Actions' ? 'center' : 'left',
                        fontWeight: 600, color: '#94a3b8', fontSize: 10, letterSpacing: '0.5px',
                        whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageReports.map((report, i) => {
                    const typeCfg = exportTypeConfig[report.export_type] ?? exportTypeConfig.pdf;
                    const machine = report.machine_id ? machineMap[report.machine_id] : null;
                    return (
                      <tr key={report.id} style={{ background: i % 2 === 0 ? 'transparent' : '#0a122008', borderBottom: '1px solid #1a2540' }}>
                        {/* Report Name */}
                        <td style={{ padding: '8px 12px', maxWidth: 240 }}>
                          <div className="flex items-center gap-2">
                            <typeCfg.icon size={14} style={{ color: typeCfg.color, flexShrink: 0 }} />
                            <span className="truncate" style={{ color: '#e2e8f0', fontWeight: 500 }} title={report.report_name}>
                              {report.report_name}
                            </span>
                          </div>
                        </td>
                        {/* Machine */}
                        <td style={{ padding: '8px 12px' }}>
                          {machine ? (
                            <span style={{ color: '#cbd5e1' }}>{machine.name}</span>
                          ) : (
                            <span style={{ color: '#475569', fontStyle: 'italic' }}>—</span>
                          )}
                        </td>
                        {/* Type */}
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{
                            fontSize: 9, fontWeight: 700, letterSpacing: '0.5px',
                            padding: '2px 8px', borderRadius: 3,
                            color: typeCfg.color,
                            background: `${typeCfg.color}15`,
                            border: `1px solid ${typeCfg.color}40`,
                            whiteSpace: 'nowrap',
                          }}>
                            {typeCfg.label.toUpperCase()}
                          </span>
                        </td>
                        {/* Created By */}
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ color: '#94a3b8', fontSize: 11 }}>{report.created_by}</span>
                        </td>
                        {/* Date */}
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ color: '#64748b', fontSize: 11, whiteSpace: 'nowrap' }}>{formatDate(report.created_at)}</span>
                        </td>
                        {/* File Size */}
                        <td style={{ padding: '8px 12px' }}>
                          <span className="flex items-center gap-1" style={{ color: '#94a3b8', fontSize: 11, whiteSpace: 'nowrap' }}>
                            <HardDrive size={11} style={{ color: '#475569' }} />
                            {formatFileSize(report.file_size)}
                          </span>
                        </td>
                        {/* Actions */}
                        <td style={{ padding: '8px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <button
                            onClick={() => handleDownload(report)}
                            className="toolbar-icon-btn"
                            style={{ width: 28, height: 24, display: 'inline-flex', marginRight: 4 }}
                            title="Download"
                          >
                            <Download size={12} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(report)}
                            disabled={deleting === report.id}
                            className="toolbar-icon-btn"
                            style={{ width: 28, height: 24, display: 'inline-flex', color: '#f87171', borderColor: '#7f1d1d' }}
                            title="Delete"
                          >
                            {deleting === report.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-3" style={{ padding: '8px 16px', borderTop: '1px solid #1e2d45', flexShrink: 0 }}>
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={currentPage === 0} className="btn-secondary flex items-center gap-1" style={{ padding: '4px 10px', opacity: currentPage === 0 ? 0.4 : 1 }}>
            <ChevronLeft size={12} /> Prev
          </button>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>
            Page {currentPage + 1} of {pageCount} · {filtered.length} reports
          </span>
          <button onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={currentPage >= pageCount - 1} className="btn-secondary flex items-center gap-1" style={{ padding: '4px 10px', opacity: currentPage >= pageCount - 1 ? 0.4 : 1 }}>
            Next <ChevronRight size={12} />
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: 'rgba(6,11,20,0.8)' }}
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="flex flex-col gap-4"
            style={{
              background: '#0e1726', border: '1px solid #2a3f60', borderRadius: 6,
              padding: 24, maxWidth: 420, width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trash2 size={20} style={{ color: '#ef4444' }} />
              </div>
              <div className="flex flex-col">
                <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>Delete Report?</span>
                <span style={{ fontSize: 12, color: '#64748b' }}>This action cannot be undone.</span>
              </div>
            </div>
            <div style={{ padding: '10px 12px', background: '#0a1220', border: '1px solid #1e2d45', borderRadius: 4 }}>
              <span style={{ fontSize: 11, color: '#94a3b8', wordBreak: 'break-all' }}>{confirmDelete.report_name}</span>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary" style={{ padding: '7px 16px' }}>
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deleting === confirmDelete.id}
                className="btn-danger flex items-center gap-2"
                style={{ padding: '7px 16px', opacity: deleting === confirmDelete.id ? 0.5 : 1 }}
              >
                {deleting === confirmDelete.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExportHistoryPage;
