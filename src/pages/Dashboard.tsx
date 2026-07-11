import { useState, useCallback } from 'react';
import {
  Minus, Square, X, ChevronDown, BarChart2,
  RefreshCw, Save, Upload, Settings,
  Database, Layers, SlidersHorizontal, AlignJustify,
  Plus, AlertTriangle, Bell, Wifi,
} from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { VibrationChart } from '../components/VibrationChart';
import { FrequencyChart } from '../components/FrequencyChart';
import { TemperatureChart } from '../components/TemperatureChart';
import { CurrentChart } from '../components/CurrentChart';
import { AnomalyPanel } from '../components/AnomalyPanel';
import { AddMachineModal } from '../components/AddMachineModal';
import { SetLimitsModal } from '../components/SetLimitsModal';
import { ExportModal } from '../components/ExportModal';
import { ViewHistoryModal } from '../components/ViewHistoryModal';
import { NotificationPanel } from '../components/NotificationPanel';
import { useMonitoring } from '../contexts/MonitoringContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';

interface Props {
  onNavigate: (page: string) => void;
}

type ChartLayout = 'grid' | 'stacked' | 'compact';
type ConnStatus = 'checking' | 'online' | 'offline';

function PanelHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-between px-3 py-1.5"
      style={{ background: 'linear-gradient(180deg,#151f33 0%,#0f1726 100%)', borderBottom: '1px solid #1e2d45', minHeight: 30 }}
    >
      <span className="text-xs font-semibold text-slate-200 tracking-wide">{title}</span>
      {children}
    </div>
  );
}

function SpinIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="animate-spin">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Dashboard({ onNavigate }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    selectedMachine, monitoring, setMonitoring, simulateLoad, setSimulateLoad,
    vibration, freqBars, currentTrend, tempTrend, temperature, currentVal, rpm, timestamp,
    unreadCount, refreshMachines, markAlertsRead, saveSetting,
    refreshSensors, refreshSettings, persistSnapshot, aiAnalysis,
  } = useMonitoring();

  const [showAdd, setShowAdd] = useState(false);
  const [showLimits, setShowLimits] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showConnStatus, setShowConnStatus] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chartLayout, setChartLayout] = useState<ChartLayout>('grid');
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connStatus, setConnStatus] = useState<ConnStatus>('online');
  const [stopping, setStopping] = useState(false);

  const motorId = selectedMachine?.name.replace(/\s+/g, '').slice(0, 3).toUpperCase() ?? 'M1';

  // --- Toolbar action handlers ---
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshMachines(), refreshSensors(), refreshSettings()]);
      toast('Sensor data and charts refreshed', 'success');
    } catch {
      toast('Failed to refresh data', 'error');
    } finally {
      setRefreshing(false);
    }
  }, [refreshMachines, refreshSensors, refreshSettings, toast]);

  const handleSave = useCallback(async () => {
    if (!selectedMachine) { toast('No machine selected', 'warning'); return; }
    setSaving(true);
    try {
      await saveSetting(`machine_${selectedMachine.id}_rms_min`, String(selectedMachine.rms_min), 'thresholds');
      await saveSetting(`machine_${selectedMachine.id}_rms_max`, String(selectedMachine.rms_max), 'thresholds');
      await saveSetting(`machine_${selectedMachine.id}_temp_min`, String(selectedMachine.temp_min), 'thresholds');
      await saveSetting(`machine_${selectedMachine.id}_temp_max`, String(selectedMachine.temp_max), 'thresholds');
      await saveSetting(`machine_${selectedMachine.id}_current_min`, String(selectedMachine.current_min), 'thresholds');
      await saveSetting(`machine_${selectedMachine.id}_current_max`, String(selectedMachine.current_max), 'thresholds');
      toast('Settings saved to database', 'success');
    } catch {
      toast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  }, [selectedMachine, saveSetting, toast]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      await persistSnapshot();
      await Promise.all([refreshMachines(), refreshSensors()]);
      toast('Synced with backend', 'success');
    } catch {
      toast('Sync failed', 'error');
    } finally {
      setSyncing(false);
    }
  }, [persistSnapshot, refreshMachines, refreshSensors, toast]);

  const handleCheckConnection = useCallback(async () => {
    setConnStatus('checking');
    try {
      const { error } = await supabase.from('machines').select('id').limit(1);
      setConnStatus(error ? 'offline' : 'online');
    } catch {
      setConnStatus('offline');
    }
  }, []);

  const handleNotifications = useCallback(() => {
    setShowNotifications(true);
  }, []);

  const handleExport = useCallback(() => {
    setShowExport(true);
  }, []);

  const handleStopMonitoring = useCallback(() => {
    setStopping(true);
    setTimeout(() => {
      setMonitoring(false);
      setSimulateLoad(false);
      setStopping(false);
      toast('Monitoring stopped safely', 'success');
    }, 600);
  }, [setMonitoring, setSimulateLoad, toast]);

  const handleAddMachine = useCallback(() => {
    setShowAdd(true);
  }, []);

  const handleSetLimits = useCallback(() => {
    if (!selectedMachine) { toast('No machine selected', 'warning'); return; }
    setShowLimits(true);
  }, [selectedMachine, toast]);

  const cycleChartLayout = useCallback(() => {
    setChartLayout((prev) => {
      const next = prev === 'grid' ? 'stacked' : prev === 'stacked' ? 'compact' : 'grid';
      toast(`Chart layout: ${next}`, 'info');
      return next;
    });
  }, [toast]);

  const handleSettingsClick = useCallback(() => {
    setShowSettingsMenu((prev) => !prev);
  }, []);

  const btn = (icon: React.ReactNode, opts: {
    onClick: () => void;
    title: string;
    loading?: boolean;
    disabled?: boolean;
    badge?: number;
    active?: boolean;
  }) => (
    <button
      onClick={opts.onClick}
      title={opts.title}
      disabled={opts.disabled || opts.loading}
      className="toolbar-icon-btn relative"
      style={{
        width: 'auto',
        padding: '0 6px',
        opacity: opts.disabled ? 0.4 : 1,
        cursor: opts.disabled ? 'not-allowed' : 'pointer',
        ...(opts.active ? { borderColor: '#3b82f6', color: '#60a5fa' } : {}),
      }}
    >
      {opts.loading ? <SpinIcon size={10} /> : icon}
      {opts.badge != null && opts.badge > 0 && (
        <span
          className="absolute -top-1 -right-1 text-xs rounded-full flex items-center justify-center"
          style={{ width: 14, height: 14, background: '#ef4444', color: '#fff', fontSize: 8, fontWeight: 'bold' }}
        >
          {opts.badge > 9 ? '9+' : opts.badge}
        </span>
      )}
    </button>
  );

  // --- Chart layout rendering ---
  const renderCharts = () => {
    if (chartLayout === 'stacked') {
      return (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex flex-col" style={{ flex: '1 1 0', minHeight: 0, borderBottom: '1px solid #1e2d45' }}>
            <PanelHeader title="Vibration Time Domain"><BarChart2 size={12} className="text-slate-500" /></PanelHeader>
            <div className="flex-1 chart-bg overflow-hidden"><VibrationChart data={vibration} /></div>
          </div>
          <div className="flex flex-col" style={{ flex: '1 1 0', minHeight: 0, borderBottom: '1px solid #1e2d45' }}>
            <PanelHeader title="Vibration Frequency Spectrum"><BarChart2 size={12} className="text-slate-500" /></PanelHeader>
            <div className="flex-1 chart-bg overflow-hidden"><FrequencyChart bars={freqBars} /></div>
          </div>
          <div className="flex flex-col" style={{ flex: '1 1 0', minHeight: 0, borderBottom: '1px solid #1e2d45' }}>
            <PanelHeader title="Temperature Trend">
              <span className="val-yellow font-bold text-xs">{temperature.toFixed(1)}°C</span>
            </PanelHeader>
            <div className="flex-1 chart-bg overflow-hidden"><TemperatureChart data={tempTrend} temperature={temperature} /></div>
          </div>
          <div className="flex flex-col" style={{ flex: '1 1 0', minHeight: 0 }}>
            <PanelHeader title="Current Trend">
              <span className="text-xs font-bold text-slate-200">{currentVal.toFixed(1)} A</span>
            </PanelHeader>
            <div className="flex-1 chart-bg overflow-hidden"><CurrentChart data={currentTrend} /></div>
          </div>
        </div>
      );
    }

    if (chartLayout === 'compact') {
      return (
        <div className="flex flex-1 overflow-hidden">
          <div className="flex flex-col" style={{ flex: '1 1 0', borderRight: '1px solid #1e2d45', minWidth: 0 }}>
            <PanelHeader title="Vibration"><BarChart2 size={12} className="text-slate-500" /></PanelHeader>
            <div className="flex-1 chart-bg overflow-hidden"><VibrationChart data={vibration} /></div>
          </div>
          <div className="flex flex-col" style={{ flex: '1 1 0', borderRight: '1px solid #1e2d45', minWidth: 0 }}>
            <PanelHeader title="Frequency"><BarChart2 size={12} className="text-slate-500" /></PanelHeader>
            <div className="flex-1 chart-bg overflow-hidden"><FrequencyChart bars={freqBars} /></div>
          </div>
          <div className="flex flex-col" style={{ flex: '1 1 0', borderRight: '1px solid #1e2d45', minWidth: 0 }}>
            <PanelHeader title="Temp">
              <span className="val-yellow font-bold text-xs">{temperature.toFixed(1)}°C</span>
            </PanelHeader>
            <div className="flex-1 chart-bg overflow-hidden"><TemperatureChart data={tempTrend} temperature={temperature} /></div>
          </div>
          <div className="flex flex-col" style={{ flex: '1 1 0', minWidth: 0 }}>
            <PanelHeader title="Current">
              <span className="text-xs font-bold text-slate-200">{currentVal.toFixed(1)} A</span>
            </PanelHeader>
            <div className="flex-1 chart-bg overflow-hidden"><CurrentChart data={currentTrend} /></div>
          </div>
        </div>
      );
    }

    // Default grid layout (original)
    return (
      <>
        <div className="flex" style={{ flex: '0 0 auto', height: 224, borderBottom: '1px solid #1e2d45' }}>
          <div className="flex flex-col" style={{ flex: '1 1 0', borderRight: '1px solid #1e2d45', minWidth: 0 }}>
            <PanelHeader title="Vibration Time Domain"><BarChart2 size={12} className="text-slate-500" /></PanelHeader>
            <div className="flex-1 chart-bg overflow-hidden"><VibrationChart data={vibration} /></div>
            <div className="flex items-center gap-3 px-3 py-1" style={{ background: '#080d14', borderTop: '1px solid #1a2540' }}>
              <div className="flex items-center gap-1"><div style={{ width: 14, height: 2, background: '#3b82f6' }} /><span style={{ fontSize: 9, color: '#64748b' }}>X Axis</span></div>
              <div className="flex items-center gap-1"><div style={{ width: 14, height: 2, background: '#22c55e' }} /><span style={{ fontSize: 9, color: '#64748b' }}>Y Axis</span></div>
              <div className="flex items-center gap-1"><div style={{ width: 10, height: 8, background: '#eab308' }} /></div>
              <div style={{ fontSize: 9, color: '#4a5f7a' }}>Time (s)</div>
            </div>
          </div>
          <div className="flex flex-col" style={{ flex: '1 1 0', borderRight: '1px solid #1e2d45', minWidth: 0 }}>
            <PanelHeader title="Vibration Frequency Spectrum"><BarChart2 size={12} className="text-slate-500" /></PanelHeader>
            <div className="flex-1 chart-bg overflow-hidden"><FrequencyChart bars={freqBars} /></div>
          </div>
          <div className="flex flex-col" style={{ flex: '0.75 1 0', minWidth: 0 }}>
            <PanelHeader title="Temperature Trend">
              <div className="flex items-center gap-1.5">
                <span className="val-yellow font-bold text-xs">{temperature.toFixed(1)}°C</span>
                <div className="px-1" style={{ background: '#166534', border: '1px solid #22c55e' }}>
                  <AlignJustify size={9} className="text-green-400" />
                </div>
              </div>
            </PanelHeader>
            <div className="flex-1 chart-bg overflow-hidden"><TemperatureChart data={tempTrend} temperature={temperature} /></div>
          </div>
        </div>
        <div className="flex" style={{ flex: '1 1 0', minHeight: 0 }}>
          <div className="flex flex-col" style={{ flex: '1.4 1 0', borderRight: '1px solid #1e2d45', minWidth: 0 }}>
            <PanelHeader title="Current Trend">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-200">{currentVal.toFixed(1)} A</span>
                <div className="px-1 py-0.5" style={{ background: '#166534', border: '1px solid #22c55e' }}>
                  <AlignJustify size={9} className="text-green-400" />
                </div>
              </div>
            </PanelHeader>
            <div className="flex-1 chart-bg overflow-hidden"><CurrentChart data={currentTrend} /></div>
          </div>
          <div className="flex flex-col" style={{ flex: '1 1 0', minWidth: 0, background: '#0d1420' }}>
            <PanelHeader title="Anomaly Detection" />
            <div className="p-3 space-y-2.5 overflow-y-auto">
              <div
                className="flex items-center gap-2 px-3 py-2"
                style={{
                  background: aiAnalysis?.status === 'critical'
                    ? 'linear-gradient(135deg,#1a0000 0%,#2a0a0a 100%)'
                    : aiAnalysis?.status === 'warning'
                    ? 'linear-gradient(135deg,#1a1500 0%,#2a1f00 100%)'
                    : 'linear-gradient(135deg,#001a00 0%,#0a1a0a 100%)',
                  border: `1px solid ${aiAnalysis?.status === 'critical' ? '#ef4444' : aiAnalysis?.status === 'warning' ? '#ca8a04' : '#22c55e'}`,
                  borderLeft: `3px solid ${aiAnalysis?.status === 'critical' ? '#ef4444' : aiAnalysis?.status === 'warning' ? '#eab308' : '#22c55e'}`,
                }}
              >
                <AlertTriangle
                  size={16}
                  className={
                    aiAnalysis?.status === 'critical' ? 'text-red-400 shrink-0'
                    : aiAnalysis?.status === 'warning' ? 'text-yellow-400 shrink-0'
                    : 'text-green-400 shrink-0'
                  }
                />
                <span
                  className="text-xs font-semibold"
                  style={{
                    color: aiAnalysis?.status === 'critical' ? '#fca5a5'
                    : aiAnalysis?.status === 'warning' ? '#fde047'
                    : '#86efac',
                  }}
                >
                  {aiAnalysis?.status === 'critical' ? 'CRITICAL: Immediate Action Required'
                    : aiAnalysis?.status === 'warning' ? `Warning: ${aiAnalysis?.anomalies[0] ?? 'Anomaly Detected'}`
                    : 'System Operating Normally'}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 w-24">Status:</span>
                  <AlertTriangle size={11} className={aiAnalysis?.status === 'critical' ? 'text-red-400' : aiAnalysis?.status === 'warning' ? 'text-yellow-400' : 'text-green-400'} />
                  <span className="font-semibold" style={{ color: aiAnalysis?.status === 'critical' ? '#f87171' : aiAnalysis?.status === 'warning' ? '#facc15' : '#4ade80' }}>
                    {aiAnalysis?.status === 'critical' ? 'Critical' : aiAnalysis?.status === 'warning' ? 'Warning' : 'Healthy'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 w-24">Vibration Alert:</span>
                  <span className="text-slate-200 font-medium">
                    {aiAnalysis && aiAnalysis.bearingWear > 35 ? '2x RPM Detected' : 'Normal'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 w-24">Temperature:</span>
                  <span className="font-medium" style={{ color: aiAnalysis && aiAnalysis.overheatRisk > 30 ? '#f87171' : '#4ade80' }}>
                    {aiAnalysis && aiAnalysis.overheatRisk > 30 ? 'Elevated' : 'Normal'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 w-24">RPM:</span>
                  <span className="text-slate-200 font-medium">{rpm} RPM</span>
                </div>
                {aiAnalysis && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 w-24">Health:</span>
                    <span className="font-bold" style={{ color: aiAnalysis.healthScore >= 70 ? '#4ade80' : aiAnalysis.healthScore >= 40 ? '#facc15' : '#f87171' }}>
                      {aiAnalysis.healthScore}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="dashboard-root">
      {/* Title Bar */}
      <div className="title-bar">
        <div style={{ width: 80 }} />
        <span className="title-bar-title">Predictive Maintenance Dashboard</span>
        <div className="title-bar-controls">
          <button className="win-btn"><Minus size={8} /></button>
          <button className="win-btn"><Square size={7} /></button>
          <button className="win-btn" style={{ borderColor: '#5a2020' }}><X size={8} /></button>
        </div>
      </div>

      {/* Main layout */}
      <div className="main-layout">
        {/* Left Sidebar */}
        {sidebarOpen && (
          <Sidebar
            onAddMachine={() => setShowAdd(true)}
            onSaveSettings={async () => {
              if (!selectedMachine) return;
              await saveSetting(`machine_${selectedMachine.id}_rms_min`, String(selectedMachine.rms_min), 'thresholds');
              await saveSetting(`machine_${selectedMachine.id}_rms_max`, String(selectedMachine.rms_max), 'thresholds');
              await saveSetting(`machine_${selectedMachine.id}_temp_min`, String(selectedMachine.temp_min), 'thresholds');
              await saveSetting(`machine_${selectedMachine.id}_temp_max`, String(selectedMachine.temp_max), 'thresholds');
              await saveSetting(`machine_${selectedMachine.id}_current_min`, String(selectedMachine.current_min), 'thresholds');
              await saveSetting(`machine_${selectedMachine.id}_current_max`, String(selectedMachine.current_max), 'thresholds');
              setShowLimits(true);
            }}
          />
        )}

        {/* Content area */}
        <div className="content-area">
          {/* Top toolbar */}
          <div
            className="flex items-center justify-between px-3 py-1.5"
            style={{ background: 'linear-gradient(180deg,#131c2e 0%,#0d1220 100%)', borderBottom: '1px solid #1e2d45', height: 38, flexShrink: 0 }}
          >
            <div className="flex items-center gap-2">
              {/* Menu toggle */}
              {btn(<AlignJustify size={10} />, {
                onClick: () => setSidebarOpen((v) => !v),
                title: sidebarOpen ? 'Hide sidebar' : 'Show sidebar',
                active: sidebarOpen,
              })}
              {/* Machine selector */}
              <div
                className="flex items-center gap-2 px-3 py-1 cursor-pointer"
                style={{ background: 'linear-gradient(180deg,#1a2540 0%,#0f1a2e 100%)', border: '1px solid #2a3f60', minWidth: 140 }}
                onClick={() => onNavigate('machines')}
                title="Switch machine"
              >
                <Plus size={11} className="text-slate-400" />
                <span className="text-xs font-medium text-slate-200 truncate max-w-28">
                  {selectedMachine?.name ?? 'No Machine'}
                </span>
                <div className="flex items-center gap-0.5 ml-auto">
                  <AlignJustify size={9} className="text-slate-500" />
                  <ChevronDown size={9} className="text-slate-500" />
                </div>
              </div>
            </div>

            {/* Right toolbar */}
            <div className="flex items-center gap-1">
              {/* Notifications */}
              {btn(<Bell size={10} />, {
                onClick: handleNotifications,
                title: 'Notifications',
                badge: unreadCount,
              })}
              {/* Export */}
              {btn(<Upload size={10} />, {
                onClick: handleExport,
                title: 'Export data',
                disabled: !selectedMachine,
              })}
              {/* Sync */}
              {btn(<Database size={10} />, {
                onClick: handleSync,
                title: 'Sync with backend',
                loading: syncing,
                disabled: !selectedMachine,
              })}
              {/* Save */}
              {btn(<Save size={10} />, {
                onClick: handleSave,
                title: 'Save settings to database',
                loading: saving,
                disabled: !selectedMachine,
              })}
              {/* Refresh */}
              {btn(<RefreshCw size={10} />, {
                onClick: handleRefresh,
                title: 'Reload sensor data and charts',
                loading: refreshing,
              })}
              {/* Settings dropdown */}
              <div className="relative">
                {btn(
                  <>
                    <Settings size={9} />
                    <ChevronDown size={8} />
                  </>,
                  {
                    onClick: handleSettingsClick,
                    title: 'Settings',
                    active: showSettingsMenu,
                  },
                )}
                {showSettingsMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowSettingsMenu(false)} />
                    <div
                      className="absolute right-0 top-full mt-1 z-50"
                      style={{
                        background: '#0e1726',
                        border: '1px solid #1e2d45',
                        minWidth: 180,
                        boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
                      }}
                    >
                      <button
                        onClick={() => { handleSetLimits(); setShowSettingsMenu(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-[#1a2540] transition-colors"
                      >
                        <SlidersHorizontal size={11} className="text-blue-400" /> Set Machine Limits
                      </button>
                      <button
                        onClick={() => { setShowHistory(true); setShowSettingsMenu(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-[#1a2540] transition-colors"
                      >
                        <BarChart2 size={11} className="text-blue-400" /> View History
                      </button>
                      <button
                        onClick={() => { setShowExport(true); setShowSettingsMenu(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-[#1a2540] transition-colors"
                      >
                        <Upload size={11} className="text-blue-400" /> Export Data
                      </button>
                      <button
                        onClick={() => { onNavigate('analytics'); setShowSettingsMenu(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-[#1a2540] transition-colors"
                      >
                        <BarChart2 size={11} className="text-blue-400" /> Analytics
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Charts area + right panel */}
          <div className="flex flex-1 overflow-hidden">
            {/* Main charts column */}
            <div className="flex flex-col flex-1 overflow-hidden">
              {renderCharts()}

              {/* Control buttons bar */}
              <div
                className="flex items-center gap-2 px-3 py-2"
                style={{ borderTop: '1px solid #1e2d45', background: 'linear-gradient(180deg,#0f1726 0%,#080d14 100%)', flexShrink: 0 }}
              >
                <button
                  className={monitoring ? 'btn-monitor' : 'btn-secondary'}
                  onClick={() => setMonitoring(!monitoring)}
                >
                  {monitoring ? 'Start Monitoring' : 'Stop Monitoring'}
                </button>
                <button
                  className={simulateLoad ? 'btn-monitor' : 'btn-secondary'}
                  onClick={() => setSimulateLoad(!simulateLoad)}
                >
                  Simulate Load
                </button>
                <button className="btn-secondary" onClick={() => setShowExport(true)}>Export Data</button>
                <button className="btn-secondary" onClick={() => setShowHistory(true)}>View History</button>
                <button className="btn-secondary" onClick={handleSetLimits}>Set Machine Limits</button>
              </div>

              {/* Status bar */}
              <div
                className="flex items-center justify-between px-3 py-1.5"
                style={{ borderTop: '1px solid #1e2d45', background: '#07090f', flexShrink: 0, fontSize: 10 }}
              >
                <div className="flex items-center gap-3 text-slate-400">
                  <span>Timestamp: {timestamp}</span>
                  <span style={{ color: '#1e2d45' }}>|</span>
                  <span>Motor ID: {motorId}</span>
                  <span style={{ color: '#1e2d45' }}>|</span>
                  <span>Sampling Rate: 1 kHz</span>
                  <span style={{ color: '#1e2d45' }}>|</span>
                  <span className="text-slate-500">{user?.email}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div
                    className={monitoring ? 'status-dot-active rounded-full' : 'rounded-full'}
                    style={{ width: 7, height: 7, background: monitoring ? '#22c55e' : '#64748b' }}
                  />
                  <span className="text-slate-300">{monitoring ? 'Connected' : 'Disconnected'}</span>
                </div>
              </div>

              {/* Bottom icon toolbar */}
              <div className="bottom-toolbar">
                {/* Sync */}
                {btn(<Database size={10} />, {
                  onClick: handleSync,
                  title: 'Sync with backend',
                  loading: syncing,
                  disabled: !selectedMachine,
                })}
                {/* Charts layout switch */}
                {btn(<Layers size={10} />, {
                  onClick: cycleChartLayout,
                  title: `Chart layout: ${chartLayout} (click to switch)`,
                  active: chartLayout !== 'grid',
                })}
                {/* Connection status */}
                <div className="relative">
                  {btn(
                    <Wifi size={10} />,
                    {
                      onClick: () => { setShowConnStatus((v) => !v); handleCheckConnection(); },
                      title: 'Server connection status',
                    },
                  )}
                  {showConnStatus && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowConnStatus(false)} />
                      <div
                        className="absolute bottom-full left-0 mb-1 z-50 px-3 py-2"
                        style={{
                          background: '#0e1726',
                          border: '1px solid #1e2d45',
                          minWidth: 180,
                          boxShadow: '0 -4px 20px rgba(0,0,0,0.6)',
                        }}
                      >
                        <div className="flex items-center gap-2 text-xs">
                          {connStatus === 'checking' ? (
                            <><SpinIcon size={10} /><span className="text-slate-400">Checking...</span></>
                          ) : connStatus === 'online' ? (
                            <><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} /><span className="text-green-400">Server Online</span></>
                          ) : (
                            <><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} /><span className="text-red-400">Server Offline</span></>
                          )}
                        </div>
                        <div className="text-xs text-slate-600 mt-1">Supabase PostgreSQL</div>
                      </div>
                    </>
                  )}
                </div>
                {/* Add machine */}
                {btn(<Plus size={10} />, {
                  onClick: handleAddMachine,
                  title: 'Add machine',
                })}
                {/* Stop monitoring */}
                {btn(<AlignJustify size={10} />, {
                  onClick: handleStopMonitoring,
                  title: monitoring ? 'Stop monitoring safely' : 'Monitoring stopped',
                  loading: stopping,
                  disabled: !monitoring,
                })}
                {/* Settings */}
                {btn(<SlidersHorizontal size={10} />, {
                  onClick: handleSetLimits,
                  title: 'Open settings / limits',
                  disabled: !selectedMachine,
                })}
                <div className="flex-1" />
                <div className="flex gap-1 items-center">
                  <div style={{ width: 8, height: 8, borderRadius: 1, background: monitoring ? '#22c55e' : '#64748b' }} />
                  <div style={{ width: 8, height: 8, borderRadius: 1, background: '#3b82f6' }} />
                </div>
              </div>
            </div>

            {/* Right Anomaly Log Panel */}
            <AnomalyPanel />
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAdd && <AddMachineModal onClose={() => setShowAdd(false)} onCreated={refreshMachines} />}
      {showLimits && selectedMachine && <SetLimitsModal machine={selectedMachine} onClose={() => setShowLimits(false)} onSaved={refreshMachines} />}
      {showExport && <ExportModal machine={selectedMachine} onClose={() => setShowExport(false)} />}
      {showHistory && <ViewHistoryModal machine={selectedMachine} onClose={() => setShowHistory(false)} />}
      {showNotifications && <NotificationPanel onClose={() => setShowNotifications(false)} />}
    </div>
  );
}
