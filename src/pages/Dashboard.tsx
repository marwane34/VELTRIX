import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Cpu, Activity, Thermometer, Zap, Gauge, Power, Play, Square,
  Settings, Bell, Maximize2, Minimize2, AlertTriangle, Lightbulb,
  Clock, TrendingUp, ChevronRight, Database, SlidersHorizontal, FileClock,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useMonitoring } from '../contexts/MonitoringContext';
import { useToast } from '../components/Toast';
import { Sidebar } from '../components/Sidebar';
import VibrationChart from '../components/VibrationChart';
import FrequencyChart from '../components/FrequencyChart';
import TemperatureChart from '../components/TemperatureChart';
import CurrentChart from '../components/CurrentChart';
import AddMachineModal from '../components/AddMachineModal';
import SetLimitsModal from '../components/SetLimitsModal';
import NotificationPanel from '../components/NotificationPanel';
import { ExportCenter, ExportLoadingOverlay } from '../components/ExportCenter';
import type { ExportAction } from '../components/ExportCenter';
import {
  exportPDF, exportExcel, exportCSV, exportScreenshot,
  exportMachineReport, exportAIReport, downloadBlob,
  saveReportRecord, timestamp, sanitizeFilename,
} from '../lib/exportUtils';
import type { ExportData } from '../lib/exportUtils';
import type { Machine, ExportType } from '../types';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

const panelHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '6px 10px',
  height: 28,
  background: 'linear-gradient(180deg,#0d1525 0%,#0b1220 100%)',
  borderBottom: '1px solid #1e2d45',
  flexShrink: 0,
};

const panelTitleStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.8px',
  color: '#c8d6ea',
};

const cardStyle: React.CSSProperties = {
  background: '#0e1726',
  border: '1px solid #1e2d45',
  borderRadius: 4,
  padding: '10px 12px',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

/**
 * Circular SVG gauge for the AI health score.
 */
function HealthGauge({ score, status }: { score: number; status: string }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = status === 'healthy' ? '#22c55e' : status === 'warning' ? '#eab308' : '#ef4444';
  return (
    <div className="relative flex items-center justify-center" style={{ width: 130, height: 130 }}>
      <svg width={130} height={130} viewBox="0 0 130 130">
        <circle cx={65} cy={65} r={radius} fill="none" stroke="#1e2d45" strokeWidth={9} />
        <circle
          cx={65} cy={65} r={radius} fill="none" stroke={color} strokeWidth={9}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 65 65)"
          style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-bold" style={{ fontSize: 28, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 8, color: '#64748b', letterSpacing: '1px', marginTop: 2 }}>HEALTH</span>
      </div>
    </div>
  );
}

/**
 * KPI metric card.
 */
function KpiCard({ icon: Icon, label, value, unit, color }: {
  icon: typeof Cpu; label: string; value: string | number; unit?: string; color: string;
}) {
  return (
    <div style={cardStyle}>
      <div className="flex items-center gap-1.5">
        <Icon size={12} style={{ color }} />
        <span style={{ fontSize: 8.5, fontWeight: 600, letterSpacing: '0.5px', color: '#64748b' }}>{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="font-bold" style={{ fontSize: 18, color }}>{value}</span>
        {unit && <span style={{ fontSize: 10, color: '#64748b' }}>{unit}</span>}
      </div>
    </div>
  );
}

/**
 * AI risk metric card (bearingWear, overheatRisk, failureRisk).
 */
function RiskCard({ label, value, icon: Icon }: { label: string; value: number; icon: typeof AlertTriangle }) {
  const color = value > 70 ? '#ef4444' : value > 40 ? '#eab308' : '#22c55e';
  return (
    <div style={cardStyle}>
      <div className="flex items-center gap-1.5">
        <Icon size={12} style={{ color }} />
        <span style={{ fontSize: 9, fontWeight: 600, color: '#94a3b8' }}>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-bold" style={{ fontSize: 22, color }}>{value}%</span>
        <div style={{ flex: 1, height: 5, background: '#1e2d45', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${value}%`, height: '100%', background: color, transition: 'width 0.4s ease' }} />
        </div>
      </div>
    </div>
  );
}

/**
 * Dashboard — main SCADA predictive maintenance dashboard.
 * Features a frameless title bar, sidebar, center charts, AI health score,
 * KPI cards, monitoring controls, anomaly/recommendation/RUL panels,
 * and a bottom toolbar with the ExportCenter dropdown.
 */
export function Dashboard({ onNavigate }: DashboardProps) {
  const {
    machines, selectedMachine, selectMachine, monitoring, setMonitoring,
    simulateLoad, setSimulateLoad, vibration, freqBars, currentTrend,
    tempTrend, healthTrend, temperature, currentVal, rmsX, rmsY, rpm,
    aiAnalysis, recentAlerts, unreadCount, refreshMachines, liveReading,
  } = useMonitoring();
  const { user } = useAuth();
  const { toast } = useToast();

  const [showAddMachine, setShowAddMachine] = useState(false);
  const [showSetLimits, setShowSetLimits] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState('');
  const [dbConnected, setDbConnected] = useState(true);

  const dashboardRef = useRef<HTMLDivElement>(null);

  // Check DB connectivity
  useEffect(() => {
    const checkDb = async () => {
      try {
        const { error } = await (await import('../lib/supabase')).supabase
          .from('machines')
          .select('id')
          .limit(1);
        setDbConnected(!error);
      } catch {
        setDbConnected(false);
      }
    };
    checkDb();
    const interval = setInterval(checkDb, 30000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().then(() => setFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setFullscreen(false)).catch(() => {});
    }
  }, []);

  async function handleExport(action: ExportAction) {
    if (!selectedMachine) {
      toast('Select a machine first', 'error');
      return;
    }
    setExporting(true);
    const msgs: Record<ExportAction, string> = {
      pdf: 'Generating PDF report...',
      excel: 'Generating Excel workbook...',
      csv: 'Generating CSV file...',
      screenshot: 'Capturing dashboard screenshot...',
      machine_report: 'Generating machine report...',
      ai_report: 'Generating AI prediction report...',
    };
    setExportMsg(msgs[action]);
    try {
      const exportData: ExportData = {
        machine: selectedMachine,
        aiAnalysis,
        alerts: recentAlerts,
        vibration,
        freqBars,
        tempTrend,
        currentTrend,
        healthTrend,
        temperature,
        currentVal,
        rmsX,
        rmsY,
        rpm,
        voltage: liveReading?.voltage ?? 220,
        operator: user?.email ?? 'Unknown',
      };
      let blob: Blob;
      let ext: string;
      let exportType: ExportType;
      switch (action) {
        case 'pdf':
          blob = await exportPDF(exportData); ext = 'pdf'; exportType = 'pdf'; break;
        case 'excel':
          blob = await exportExcel(exportData); ext = 'xlsx'; exportType = 'excel'; break;
        case 'csv':
          blob = await exportCSV(exportData); ext = 'csv'; exportType = 'csv'; break;
        case 'screenshot':
          blob = await exportScreenshot(dashboardRef.current!); ext = 'png'; exportType = 'screenshot'; break;
        case 'machine_report':
          blob = await exportMachineReport(exportData); ext = 'pdf'; exportType = 'machine_report'; break;
        case 'ai_report':
          blob = await exportAIReport(exportData); ext = 'pdf'; exportType = 'ai_report'; break;
      }
      const filename = `${sanitizeFilename(selectedMachine.name)}_${timestamp()}.${ext}`;
      downloadBlob(blob, filename);
      await saveReportRecord({
        reportName: filename,
        machineId: selectedMachine.id,
        exportType,
        createdBy: user?.email ?? 'Unknown',
        filePath: filename,
        fileSize: blob.size,
      });
      toast(`${ext.toUpperCase()} exported successfully`, 'success');
    } catch (err) {
      toast('Export failed: ' + (err as Error).message, 'error');
    } finally {
      setExporting(false);
      setExportMsg('');
    }
  }

  const statusBadge = aiAnalysis
    ? {
        healthy: { label: 'HEALTHY', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
        warning: { label: 'WARNING', color: '#eab308', bg: 'rgba(234,179,8,0.12)' },
        critical: { label: 'CRITICAL', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
      }[aiAnalysis.status]
    : null;

  return (
    <div className="dashboard-root" ref={dashboardRef}>
      {/* ---- Title Bar ---- */}
      <div className="title-bar" onDoubleClick={toggleFullscreen}>
        {/* Left: Logo + VELTRIX */}
        <div className="flex items-center gap-2" style={{ minWidth: 160, pointerEvents: 'auto' }}>
          <img src="/assets/veltrix-logo.svg" alt="VELTRIX" width={16} height={16} style={{ display: 'block' }} />
          <span className="font-bold tracking-wide" style={{ fontSize: 12, color: '#e2e8f0' }}>VELTRIX</span>
        </div>
        {/* Center: Title */}
        <span className="title-bar-title">Predictive Maintenance Dashboard</span>
        {/* Right: LIVE/IDLE status + fullscreen */}
        <div className="flex items-center gap-3" style={{ minWidth: 160, justifyContent: 'flex-end', pointerEvents: 'auto' }}>
          <span
            className="flex items-center gap-1.5"
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '1px',
              color: monitoring ? '#22c55e' : '#64748b',
            }}
          >
            <span
              className={monitoring ? 'status-dot-active' : ''}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: monitoring ? '#22c55e' : '#64748b',
                boxShadow: monitoring ? '0 0 6px #22c55e' : 'none',
              }}
            />
            {monitoring ? 'LIVE' : 'IDLE'}
          </span>
          <button
            onClick={toggleFullscreen}
            className="toolbar-icon-btn"
            title={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {fullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        </div>
      </div>

      {/* ---- Main Layout ---- */}
      <div className="main-layout">
        {/* Left Sidebar */}
        <Sidebar onAddMachine={() => setShowAddMachine(true)} />

        {/* Center Content */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: 8 }}>
          {machines.length === 0 ? (
            <div className="flex flex-col items-center justify-center" style={{ height: '100%', gap: 16 }}>
              <Cpu size={48} style={{ color: '#475569', opacity: 0.5 }} />
              <div className="flex flex-col items-center gap-2">
                <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 600 }}>No Machines Configured</span>
                <span style={{ fontSize: 12, color: '#64748b' }}>Add your first machine to begin monitoring.</span>
              </div>
              <button onClick={() => setShowAddMachine(true)} className="btn-monitor flex items-center gap-2">
                <Cpu size={14} /> Add Machine
              </button>
            </div>
          ) : !selectedMachine ? (
            <div className="flex items-center justify-center" style={{ height: '100%' }}>
              <span style={{ fontSize: 13, color: '#64748b' }}>Select a machine from the sidebar.</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {/* Row 1: Vibration + Frequency */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, height: 200 }}>
                <div className="panel chart-bg flex flex-col">
                  <div style={panelHeaderStyle}>
                    <span style={panelTitleStyle}>VIBRATION WAVEFORM</span>
                    <span className="flex items-center gap-3 text-[9px]">
                      <span className="val-blue">X: {rmsX.toFixed(3)}g</span>
                      <span className="val-cyan">Y: {rmsY.toFixed(3)}g</span>
                    </span>
                  </div>
                  <div style={{ flex: 1, padding: 4 }}>
                    <VibrationChart data={vibration} />
                  </div>
                </div>
                <div className="panel chart-bg flex flex-col">
                  <div style={panelHeaderStyle}>
                    <span style={panelTitleStyle}>FREQUENCY SPECTRUM</span>
                    <span className="text-[9px] val-blue">{freqBars.length > 0 ? `${Math.max(...freqBars.map(f => f.freq))} Hz` : '—'}</span>
                  </div>
                  <div style={{ flex: 1, padding: 4 }}>
                    <FrequencyChart data={freqBars} />
                  </div>
                </div>
              </div>

              {/* Row 2: Temperature + Current */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, height: 200 }}>
                <div className="panel chart-bg flex flex-col">
                  <div style={panelHeaderStyle}>
                    <span style={panelTitleStyle}>TEMPERATURE TREND</span>
                    <span className="text-[9px] val-orange">{temperature.toFixed(1)} °C</span>
                  </div>
                  <div style={{ flex: 1, padding: 4 }}>
                    <TemperatureChart data={tempTrend} />
                  </div>
                </div>
                <div className="panel chart-bg flex flex-col">
                  <div style={panelHeaderStyle}>
                    <span style={panelTitleStyle}>CURRENT TREND</span>
                    <span className="text-[9px] val-yellow">{currentVal.toFixed(2)} A</span>
                  </div>
                  <div style={{ flex: 1, padding: 4 }}>
                    <CurrentChart data={currentTrend} />
                  </div>
                </div>
              </div>

              {/* AI Health Score Section */}
              {aiAnalysis && (
                <div className="panel" style={{ padding: 12 }}>
                  <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
                    <Activity size={14} style={{ color: '#3b82f6' }} />
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', color: '#c8d6ea' }}>AI HEALTH ANALYSIS</span>
                    {statusBadge && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: '1px',
                          padding: '2px 8px',
                          borderRadius: 3,
                          color: statusBadge.color,
                          background: statusBadge.bg,
                          border: `1px solid ${statusBadge.color}40`,
                        }}
                      >
                        {statusBadge.label}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr', gap: 12, alignItems: 'center' }}>
                    {/* Gauge */}
                    <HealthGauge score={aiAnalysis.healthScore} status={aiAnalysis.status} />
                    {/* Risk metrics */}
                    <RiskCard label="Bearing Wear" value={aiAnalysis.bearingWear} icon={AlertTriangle} />
                    <RiskCard label="Overheat Risk" value={aiAnalysis.overheatRisk} icon={Thermometer} />
                    <RiskCard label="Failure Risk" value={aiAnalysis.failureRisk} icon={AlertTriangle} />
                  </div>
                </div>
              )}

              {/* KPI Cards Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
                <KpiCard icon={Activity} label="HEALTH" value={aiAnalysis?.healthScore ?? '—'} color="#22c55e" />
                <KpiCard icon={Activity} label="BEARING" value={aiAnalysis ? `${aiAnalysis.bearingWear}%` : '—'} color="#3b82f6" />
                <KpiCard icon={Thermometer} label="TEMP" value={temperature.toFixed(1)} unit="°C" color="#fb923c" />
                <KpiCard icon={Zap} label="CURRENT" value={currentVal.toFixed(2)} unit="A" color="#facc15" />
                <KpiCard icon={Gauge} label="RPM" value={rpm} color="#22d3ee" />
                <KpiCard icon={Zap} label="VOLTAGE" value={liveReading?.voltage ?? 220} unit="V" color="#60a5fa" />
              </div>

              {/* Monitoring Controls */}
              <div className="panel flex items-center gap-3" style={{ padding: '8px 12px' }}>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.5px', color: '#94a3b8' }}>MONITORING:</span>
                <button
                  onClick={() => setMonitoring(true)}
                  className="btn-monitor flex items-center gap-1.5"
                  style={{ opacity: monitoring ? 1 : 0.5, padding: '5px 12px' }}
                >
                  <Play size={11} /> Start
                </button>
                <button
                  onClick={() => { setMonitoring(true); setSimulateLoad(false); }}
                  className="btn-secondary flex items-center gap-1.5"
                  style={{ opacity: monitoring && !simulateLoad ? 1 : 0.6, padding: '5px 12px' }}
                >
                  Normal
                </button>
                <button
                  onClick={() => setMonitoring(false)}
                  className="btn-danger flex items-center gap-1.5"
                  style={{ opacity: monitoring ? 0.6 : 1, padding: '5px 12px' }}
                >
                  <Square size={11} /> Stop
                </button>
                <label className="flex items-center gap-2" style={{ marginLeft: 'auto', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={simulateLoad}
                    onChange={(e) => setSimulateLoad(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>Simulate Fault Load</span>
                </label>
                <span className="flex items-center gap-1" style={{ fontSize: 9, color: '#64748b' }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22d3ee' }} />
                  {liveReading ? 'LIVE DATA' : 'SIMULATED'}
                </span>
              </div>

              {/* Bottom Row: Anomalies, Recommendations, RUL */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {/* Anomalies */}
                <div className="panel flex flex-col" style={{ maxHeight: 220 }}>
                  <div style={panelHeaderStyle}>
                    <AlertTriangle size={12} style={{ color: '#eab308' }} />
                    <span style={panelTitleStyle}>ANOMALIES</span>
                    <span style={{ fontSize: 9, color: '#64748b' }}>{aiAnalysis?.anomalies.length ?? 0}</span>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto' }}>
                    {aiAnalysis && aiAnalysis.anomalies.length > 0 ? (
                      aiAnalysis.anomalies.map((a, i) => (
                        <div key={i} className="anomaly-log-item flex items-start gap-2" style={{ color: '#cbd5e1' }}>
                          <span className="val-yellow" style={{ fontWeight: 700, flexShrink: 0 }}>!</span>
                          <span>{a}</span>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center justify-center" style={{ height: '100%', padding: 20 }}>
                        <span style={{ fontSize: 11, color: '#22c55e' }}>No anomalies detected</span>
                      </div>
                    )}
                  </div>
                </div>
                {/* Recommendations */}
                <div className="panel flex flex-col" style={{ maxHeight: 220 }}>
                  <div style={panelHeaderStyle}>
                    <Lightbulb size={12} style={{ color: '#3b82f6' }} />
                    <span style={panelTitleStyle}>RECOMMENDATIONS</span>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
                    {aiAnalysis?.recommendation ? (
                      <span style={{ fontSize: 11, color: '#cbd5e1', lineHeight: 1.6 }}>{aiAnalysis.recommendation}</span>
                    ) : (
                      <span style={{ fontSize: 11, color: '#64748b' }}>No recommendations at this time.</span>
                    )}
                  </div>
                </div>
                {/* RUL */}
                <div className="panel flex flex-col" style={{ maxHeight: 220 }}>
                  <div style={panelHeaderStyle}>
                    <Clock size={12} style={{ color: '#22d3ee' }} />
                    <span style={panelTitleStyle}>REMAINING USEFUL LIFE</span>
                  </div>
                  <div style={{ flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold val-cyan" style={{ fontSize: 32 }}>{aiAnalysis?.rulHours ?? '—'}</span>
                      <span style={{ fontSize: 12, color: '#64748b' }}>hours</span>
                    </div>
                    {aiAnalysis && (
                      <div style={{ height: 6, background: '#1e2d45', borderRadius: 3, overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${Math.min((aiAnalysis.rulHours / 10000) * 100, 100)}%`,
                            height: '100%',
                            background: aiAnalysis.rulHours > 5000 ? '#22c55e' : aiAnalysis.rulHours > 1000 ? '#eab308' : '#ef4444',
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>
                    )}
                    <span style={{ fontSize: 9, color: '#64748b' }}>Estimated time to failure</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Collapsible Settings Panel */}
        {showSettings && selectedMachine && (
          <div
            style={{
              width: 280,
              minWidth: 280,
              background: '#0b1220',
              borderLeft: '1px solid #1e2d45',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
            }}
          >
            <div style={panelHeaderStyle}>
              <SlidersHorizontal size={12} style={{ color: '#3b82f6' }} />
              <span style={panelTitleStyle}>MACHINE SETTINGS</span>
              <button onClick={() => setShowSettings(false)} className="toolbar-icon-btn" style={{ width: 20, height: 20 }}>
                <ChevronRight size={12} />
              </button>
            </div>
            <div className="flex flex-col gap-3" style={{ padding: 12 }}>
              {/* Machine info */}
              <div style={{ ...cardStyle, gap: 6 }}>
                <div className="flex items-center gap-2">
                  <span
                    className={selectedMachine.status === 'online' ? 'status-dot-active' : ''}
                    style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: { online: '#22c55e', offline: '#64748b', warning: '#eab308', critical: '#ef4444' }[selectedMachine.status],
                    }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{selectedMachine.name}</span>
                </div>
                <span style={{ fontSize: 10, color: '#64748b' }}>{selectedMachine.location || 'No location set'}</span>
                <span style={{ fontSize: 10, color: '#64748b' }}>{selectedMachine.description || 'No description'}</span>
              </div>

              {/* Thresholds */}
              <div style={{ ...cardStyle, gap: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.5px' }}>THRESHOLDS</span>
                <div className="flex justify-between text-[10px]">
                  <span style={{ color: '#64748b' }}>RMS:</span>
                  <span className="val-cyan">{selectedMachine.rms_min}–{selectedMachine.rms_max} g</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span style={{ color: '#64748b' }}>Temp:</span>
                  <span className="val-orange">{selectedMachine.temp_min}–{selectedMachine.temp_max} °C</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span style={{ color: '#64748b' }}>Current:</span>
                  <span className="val-yellow">{selectedMachine.current_min}–{selectedMachine.current_max} A</span>
                </div>
              </div>

              {/* Actions */}
              <button
                onClick={() => setShowSetLimits(true)}
                className="btn-secondary flex items-center justify-center gap-2 w-full"
              >
                <Settings size={13} /> Set Limits
              </button>
              <button
                onClick={() => onNavigate('export_history')}
                className="btn-secondary flex items-center justify-center gap-2 w-full"
              >
                <FileClock size={13} /> Export History
              </button>
              <button
                onClick={() => onNavigate('analytics')}
                className="btn-secondary flex items-center justify-center gap-2 w-full"
              >
                <TrendingUp size={13} /> Analytics & Reports
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ---- Bottom Toolbar ---- */}
      <div className="bottom-toolbar">
        {/* Left: icon buttons */}
        <button className="toolbar-icon-btn" title="Machines" onClick={() => onNavigate('machines')}>
          <Cpu size={13} />
        </button>
        <button className="toolbar-icon-btn" title="Alerts" onClick={() => onNavigate('alerts')}>
          <Bell size={13} />
          {unreadCount > 0 && (
            <span
              className="flex items-center justify-center font-bold"
              style={{
                position: 'absolute', top: -4, right: -4, minWidth: 14, height: 14, padding: '0 3px',
                fontSize: 8, color: '#fff', background: '#ef4444', borderRadius: 8, border: '1px solid #0d1220',
              }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
        <button className="toolbar-icon-btn" title="Analytics" onClick={() => onNavigate('analytics')}>
          <TrendingUp size={13} />
        </button>
        <button className="toolbar-icon-btn" title="Communication" onClick={() => onNavigate('communication')}>
          <Power size={13} />
        </button>

        <div style={{ width: 1, height: 16, background: '#1e2d45', margin: '0 4px' }} />

        {/* Notifications button */}
        <button
          onClick={() => setShowNotifications(true)}
          className="btn-secondary flex items-center gap-1.5"
          style={{ padding: '3px 10px' }}
        >
          <Bell size={11} />
          <span style={{ fontSize: 11 }}>Notifications</span>
          {unreadCount > 0 && (
            <span style={{ fontSize: 9, color: '#ef4444', fontWeight: 700 }}>({unreadCount})</span>
          )}
        </button>

        {/* Settings toggle */}
        <button
          onClick={() => setShowSettings((v) => !v)}
          className="toolbar-icon-btn"
          title="Toggle settings panel"
          style={{ opacity: showSettings ? 1 : 0.5 }}
        >
          <Settings size={13} />
        </button>

        {/* Right side: Export + DB status */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="flex items-center gap-1.5" style={{ fontSize: 9, color: dbConnected ? '#22c55e' : '#ef4444' }}>
            <Database size={11} />
            <span>{dbConnected ? 'DB Connected' : 'DB Offline'}</span>
          </span>
          <ExportCenter onExport={handleExport} exporting={exporting} />
        </div>
      </div>

      {/* ---- Modals ---- */}
      {showAddMachine && (
        <AddMachineModal
          onClose={() => setShowAddMachine(false)}
          onCreated={() => { setShowAddMachine(false); void refreshMachines(); }}
        />
      )}
      {showSetLimits && selectedMachine && (
        <SetLimitsModal
          machine={selectedMachine}
          onClose={() => setShowSetLimits(false)}
          onSaved={() => { setShowSetLimits(false); void refreshMachines(); }}
        />
      )}
      {showNotifications && (
        <NotificationPanel onClose={() => setShowNotifications(false)} />
      )}

      {/* Export Loading Overlay */}
      {exporting && <ExportLoadingOverlay message={exportMsg} />}
    </div>
  );
}

export default Dashboard;
