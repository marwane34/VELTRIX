import { useState, useRef } from 'react';
import { Activity, Thermometer, Zap, Heart, BrainCircuit, Bell, TrendingUp } from 'lucide-react';
import { useMonitoring } from '../contexts/MonitoringContext';
import { useToast } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';
import { Sidebar } from '../components/Sidebar';
import { ExportCenter, ExportLoadingOverlay, type ExportAction } from '../components/ExportCenter';
import { NotificationPanel } from '../components/NotificationPanel';
import AnomalyPanel from '../components/AnomalyPanel';
import VibrationChart from '../components/VibrationChart';
import FrequencyChart from '../components/FrequencyChart';
import TemperatureChart from '../components/TemperatureChart';
import CurrentChart from '../components/CurrentChart';
import {
  exportPDF,
  exportExcel,
  exportCSV,
  exportScreenshot,
  exportMachineReport,
  exportAIReport,
  downloadBlob,
  sanitizeFilename,
  saveReportRecord,
} from '../lib/exportUtils';
import type { ExportData } from '../types';

export function Dashboard() {
  const {
    selectedMachine,
    readings,
    frequencyData,
    aiPrediction,
    anomalies,
    recommendations,
    healthTrend,
    limits,
    loading,
  } = useMonitoring();
  const { showSuccess, showError, showInfo } = useToast();
  const { user } = useAuth();

  const [exporting, setExporting] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Compute health score from failureRisk (AIPrediction has no healthScore field)
  const healthScore = aiPrediction
    ? Math.max(0, Math.min(100, 100 - aiPrediction.failureRisk))
    : 0;

  // Latest readings for KPI cards
  const latest = readings.length > 0 ? readings[readings.length - 1] : null;
  const vibration = latest?.vibration ?? 0;
  const temperature = latest?.temperature ?? 0;
  const current = latest?.current ?? 0;

  const buildExportData = (): ExportData | null => {
    if (!selectedMachine) return null;
    return {
      machine: selectedMachine,
      readings,
      frequencyData,
      aiPrediction,
      anomalies,
      recommendations,
      healthTrend,
      limits,
      exportedAt: new Date().toISOString(),
      exportedBy: user?.email ?? 'Unknown',
    };
  };

  const handleExport = async (action: ExportAction) => {
    if (!selectedMachine) {
      showError('Please select a machine first.');
      return;
    }

    const data = buildExportData();
    if (!data) {
      showError('No data available to export.');
      return;
    }

    setExporting(true);

    try {
      let blob: Blob;
      let fileExt: string;
      let mime: string;

      switch (action) {
        case 'pdf':
          blob = await exportPDF(data);
          fileExt = 'pdf';
          mime = 'application/pdf';
          break;
        case 'excel':
          blob = await exportExcel(data);
          fileExt = 'xlsx';
          mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;
        case 'csv':
          blob = await exportCSV(data);
          fileExt = 'csv';
          mime = 'text/csv';
          break;
        case 'screenshot':
          if (!dashboardRef.current) {
            showError('Dashboard element not found for screenshot.');
            setExporting(false);
            return;
          }
          blob = await exportScreenshot(dashboardRef.current);
          fileExt = 'png';
          mime = 'image/png';
          break;
        case 'machine_report':
          blob = await exportMachineReport(data);
          fileExt = 'pdf';
          mime = 'application/pdf';
          break;
        case 'ai_report':
          blob = await exportAIReport(data);
          fileExt = 'pdf';
          mime = 'application/pdf';
          break;
        default:
          showError(`Unknown export type: ${action}`);
          setExporting(false);
          return;
      }

      const fileName = `${sanitizeFilename(selectedMachine.name)}_${action}_${Date.now()}.${fileExt}`;
      downloadBlob(blob, fileName);

      // Persist report record to Supabase
      await saveReportRecord({
        machineId: selectedMachine.id,
        machineName: selectedMachine.name,
        exportType: action,
        fileName,
        fileSize: blob.size,
        createdBy: user?.email ?? 'Unknown',
      });

      showSuccess(`Export completed: ${fileName}`);

      // Show Electron desktop notification if available
      if (window.electronAPI?.showNotification) {
        window.electronAPI.showNotification('VELTRIX Export Complete', `${action.toUpperCase()} export saved: ${fileName}`);
      }
    } catch (e: any) {
      console.error('[Dashboard] Export failed:', e);
      showError(`Export failed: ${e?.message ?? 'Unknown error'}`);
    } finally {
      setExporting(false);
    }
  };

  const handleAddMachine = () => {
    showInfo('Use the Machines page to add new machines.');
  };

  if (loading && !selectedMachine) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!selectedMachine) {
    return (
      <div style={{ display: 'flex', height: '100%' }}>
        <Sidebar onAddMachine={handleAddMachine} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          <div style={{ textAlign: 'center' }}>
            <Activity size={40} style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: 14 }}>No machine selected. Add or select a machine to view the dashboard.</p>
          </div>
        </div>
      </div>
    );
  }

  // KPI card data
  const kpiCards = [
    { icon: Activity, label: 'Vibration RMS', value: vibration.toFixed(3), unit: 'g', color: 'var(--accent-blue)' },
    { icon: Thermometer, label: 'Temperature', value: temperature.toFixed(1), unit: '°C', color: 'var(--accent-orange)' },
    { icon: Zap, label: 'Current', value: current.toFixed(2), unit: 'A', color: 'var(--accent-yellow)' },
    { icon: Heart, label: 'Health Score', value: healthScore.toFixed(0), unit: '%', color: healthScore > 70 ? 'var(--accent-green)' : healthScore > 40 ? 'var(--accent-yellow)' : 'var(--accent-red)' },
  ];

  return (
    <>
      <div style={{ display: 'flex', height: '100%' }}>
        <Sidebar onAddMachine={handleAddMachine} />
        <div ref={dashboardRef} style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Header bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{selectedMachine.name}</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {selectedMachine.location || 'No location'} • {selectedMachine.description || 'No description'}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setShowNotifications(true)} style={{ gap: 6 }}>
                <Bell size={14} />
                Notifications
                {(anomalies.length + recommendations.length) > 0 && (
                  <span className="badge badge-critical" style={{ marginLeft: 2 }}>
                    {anomalies.length + recommendations.length}
                  </span>
                )}
              </button>
              <ExportCenter onExport={handleExport} exporting={exporting} />
            </div>
          </div>

          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, flexShrink: 0 }}>
            {kpiCards.map((card, i) => {
              const Icon = card.icon;
              return (
                <div key={i} className="panel" style={{ padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 6, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={16} color={card.color} />
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      {card.label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{card.value}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{card.unit}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 2x2 Chart Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flexShrink: 0 }}>
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">Vibration Trend</span>
              </div>
              <div style={{ padding: 8 }}>
                <VibrationChart data={readings.map((r) => r.vibration)} height={160} />
              </div>
            </div>
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">Frequency Spectrum</span>
              </div>
              <div style={{ padding: 8 }}>
                <FrequencyChart data={frequencyData} height={160} />
              </div>
            </div>
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">Temperature Trend</span>
              </div>
              <div style={{ padding: 8 }}>
                <TemperatureChart data={readings.map((r) => r.temperature)} height={160} />
              </div>
            </div>
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">Current Trend</span>
              </div>
              <div style={{ padding: 8 }}>
                <CurrentChart data={readings.map((r) => r.current)} height={160} />
              </div>
            </div>
          </div>

          {/* AI Prediction Panel */}
          <div className="panel" style={{ flexShrink: 0 }}>
            <div className="panel-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BrainCircuit size={14} color="var(--accent-purple)" />
                <span className="panel-title">AI Prediction</span>
              </div>
              {aiPrediction && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Trend: <span style={{ color: aiPrediction.trend === 'improving' ? 'var(--accent-green)' : aiPrediction.trend === 'degrading' ? 'var(--accent-red)' : 'var(--text-secondary)' }}>{aiPrediction.trend}</span>
                </span>
              )}
            </div>
            <div style={{ padding: 14 }}>
              {aiPrediction ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  <div>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Health Score</span>
                    <div style={{ fontSize: 20, fontWeight: 700, color: healthScore > 70 ? 'var(--accent-green)' : healthScore > 40 ? 'var(--accent-yellow)' : 'var(--accent-red)' }}>
                      {healthScore.toFixed(0)}%
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Failure Risk</span>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-red)' }}>
                      {(aiPrediction.failureRisk * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>RUL</span>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-blue)' }}>
                      {aiPrediction.rulHours.toFixed(0)}h
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Confidence</span>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-secondary)' }}>
                      {(aiPrediction.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No AI prediction data available.</p>
              )}
            </div>
          </div>

          {/* Anomaly Panel + Recommendations */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flexShrink: 0 }}>
            <AnomalyPanel anomalies={anomalies} />
            <div className="panel">
              <div className="panel-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrendingUp size={14} color="var(--accent-green)" />
                  <span className="panel-title">Recommendations</span>
                  {recommendations.length > 0 && (
                    <span className="badge badge-info">{recommendations.length}</span>
                  )}
                </div>
              </div>
              <div style={{ padding: 8, maxHeight: 200, overflowY: 'auto' }}>
                {recommendations.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center' }}>
                    <TrendingUp size={24} color="var(--accent-green)" style={{ margin: '0 auto 8px' }} />
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No recommendations</p>
                  </div>
                ) : (
                  recommendations.map((rec) => (
                    <div
                      key={rec.id}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 6,
                        marginBottom: 4,
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-primary)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span className={`badge badge-${rec.priority === 'high' ? 'critical' : rec.priority === 'medium' ? 'warning' : 'info'}`}>
                          {rec.priority}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{rec.component}</span>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>{rec.action}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{rec.description}</p>
                      <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>ETA: {rec.eta}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Panel (conditional) */}
      {showNotifications && <NotificationPanel onClose={() => setShowNotifications(false)} />}

      {/* Export Loading Overlay (conditional) */}
      {exporting && <ExportLoadingOverlay message="Generating export..." />}
    </>
  );
}

export default Dashboard;
