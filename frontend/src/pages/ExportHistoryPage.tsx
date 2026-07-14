import { useState, useEffect, useCallback } from 'react';
import { Download, Trash2, FileText, Search, History } from 'lucide-react';
import { useToast } from '../components/Toast';
import { Sidebar } from '../components/Sidebar';
import { supabase } from '../lib/supabase';
import { deleteReportRecord } from '../lib/exportUtils';
import type { Report, ExportType } from '../types';

const EXPORT_TYPE_COLORS: Record<ExportType, { bg: string; color: string }> = {
  pdf: { bg: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-red)' },
  excel: { bg: 'rgba(34, 197, 94, 0.15)', color: 'var(--accent-green)' },
  csv: { bg: 'rgba(34, 197, 94, 0.15)', color: 'var(--accent-green)' },
  screenshot: { bg: 'rgba(168, 85, 247, 0.15)', color: 'var(--accent-purple)' },
  machine_report: { bg: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)' },
  ai_report: { bg: 'rgba(168, 85, 247, 0.15)', color: 'var(--accent-purple)' },
};

const EXPORT_TYPE_LABELS: Record<ExportType, string> = {
  pdf: 'PDF',
  excel: 'Excel',
  csv: 'CSV',
  screenshot: 'Screenshot',
  machine_report: 'Machine Report',
  ai_report: 'AI Report',
};

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function ExportHistoryPage() {
  const { showSuccess, showError, showInfo } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports((data as Report[]) || []);
    } catch (e: any) {
      console.error('[ExportHistoryPage] Failed to load reports:', e);
      showError('Failed to load export history.');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleDelete = async (report: Report) => {
    const ok = await deleteReportRecord(report.id);
    if (ok) {
      setReports((prev) => prev.filter((r) => r.id !== report.id));
      showSuccess(`Report "${report.report_name}" deleted.`);
    } else {
      showError('Failed to delete report. Please try again.');
    }
  };

  const handleDownloadInfo = (report: Report) => {
    showInfo(`File: ${report.file_path} (${formatSize(report.file_size)})`);
  };

  // Filter reports
  const filtered = reports.filter((r) => {
    const matchesSearch = r.report_name.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || r.export_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const exportTypes: (ExportType | 'all')[] = ['all', 'pdf', 'excel', 'csv', 'screenshot', 'machine_report', 'ai_report'];

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <Sidebar onAddMachine={() => {}} />
      <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Export History</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            View and manage previously generated reports
          </p>
        </div>

        {/* Search + Filter Bar */}
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />
            <input
              className="input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by report name..."
              style={{ paddingLeft: 32 }}
            />
          </div>
          <select
            className="input"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ width: 180, cursor: 'pointer' }}
          >
            {exportTypes.map((t) => (
              <option key={t} value={t}>
                {t === 'all' ? 'All Types' : EXPORT_TYPE_LABELS[t as ExportType]}
              </option>
            ))}
          </select>
        </div>

        {/* Reports Table */}
        <div className="panel" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ overflowX: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Report Name</th>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</th>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Size</th>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '40px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
                        <div className="loading-spinner" style={{ width: 16, height: 16 }} />
                        Loading reports...
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <History size={32} />
                        <p style={{ fontSize: 13 }}>
                          {reports.length === 0 ? 'No exports generated yet.' : 'No reports match your filters.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((report) => {
                    const colors = EXPORT_TYPE_COLORS[report.export_type] || EXPORT_TYPE_COLORS.pdf;
                    return (
                      <tr
                        key={report.id}
                        style={{ borderBottom: '1px solid var(--border-primary)' }}
                      >
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FileText size={14} color="var(--text-muted)" />
                            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{report.report_name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            className="badge"
                            style={{ background: colors.bg, color: colors.color }}
                          >
                            {EXPORT_TYPE_LABELS[report.export_type] || report.export_type}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                          {formatSize(report.file_size)}
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                          {new Date(report.created_at).toLocaleString()}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 4 }}>
                            <button
                              className="btn-icon"
                              onClick={() => handleDownloadInfo(report)}
                              title="View file info"
                              style={{ width: 28, height: 28 }}
                            >
                              <Download size={14} />
                            </button>
                            <button
                              className="btn-icon"
                              onClick={() => handleDelete(report)}
                              title="Delete report"
                              style={{ width: 28, height: 28, color: 'var(--accent-red)' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary footer */}
        {!loading && filtered.length > 0 && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', flexShrink: 0 }}>
            Showing {filtered.length} of {reports.length} report{reports.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}

export default ExportHistoryPage;
