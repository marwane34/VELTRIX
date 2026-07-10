import { useState } from 'react';
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
import { useMonitoring } from '../contexts/MonitoringContext';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  onNavigate: (page: string) => void;
}

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

export function Dashboard({ onNavigate }: Props) {
  const { user } = useAuth();
  const {
    selectedMachine, monitoring, setMonitoring, simulateLoad, setSimulateLoad,
    vibration, freqBars, currentTrend, tempTrend, temperature, currentVal, rpm, timestamp,
    unreadCount, refreshMachines, markAlertsRead, saveSetting,
  } = useMonitoring();

  const [showAdd, setShowAdd] = useState(false);
  const [showLimits, setShowLimits] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const motorId = selectedMachine?.name.replace(/\s+/g,'').slice(0,3).toUpperCase() ?? 'M1';

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

        {/* Content area */}
        <div className="content-area">
          {/* Top toolbar */}
          <div
            className="flex items-center justify-between px-3 py-1.5"
            style={{ background: 'linear-gradient(180deg,#131c2e 0%,#0d1220 100%)', borderBottom: '1px solid #1e2d45', height: 38, flexShrink: 0 }}
          >
            <div className="flex items-center gap-2">
              {/* Machine selector */}
              <div
                className="flex items-center gap-2 px-3 py-1 cursor-pointer"
                style={{ background: 'linear-gradient(180deg,#1a2540 0%,#0f1a2e 100%)', border: '1px solid #2a3f60', minWidth: 140 }}
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
              {/* Alert bell */}
              <button
                onClick={() => { markAlertsRead(); onNavigate('alerts'); }}
                className="toolbar-icon-btn relative px-2"
                style={{ width: 'auto' }}
              >
                <Bell size={10} />
                {unreadCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 text-xs rounded-full flex items-center justify-center"
                    style={{ width: 14, height: 14, background: '#ef4444', color: '#fff', fontSize: 8, fontWeight: 'bold' }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <button className="toolbar-icon-btn"><Upload size={10} /></button>
              <button className="toolbar-icon-btn"><Database size={10} /></button>
              <button className="toolbar-icon-btn"><Save size={10} /></button>
              <button className="toolbar-icon-btn"><RefreshCw size={10} /></button>
              <button className="toolbar-icon-btn px-1.5 flex items-center gap-0.5" style={{ width: 'auto' }}>
                <Settings size={9} /><ChevronDown size={8} />
              </button>
            </div>
          </div>

          {/* Charts area + right panel */}
          <div className="flex flex-1 overflow-hidden">
            {/* Main charts column */}
            <div className="flex flex-col flex-1 overflow-hidden">

              {/* TOP ROW: 3 chart panels */}
              <div className="flex" style={{ flex: '0 0 auto', height: 224, borderBottom: '1px solid #1e2d45' }}>

                {/* Vibration Time Domain */}
                <div className="flex flex-col" style={{ flex: '1 1 0', borderRight: '1px solid #1e2d45', minWidth: 0 }}>
                  <PanelHeader title="Vibration Time Domain">
                    <BarChart2 size={12} className="text-slate-500" />
                  </PanelHeader>
                  <div className="flex-1 chart-bg overflow-hidden">
                    <VibrationChart data={vibration} />
                  </div>
                  <div className="flex items-center gap-3 px-3 py-1" style={{ background: '#080d14', borderTop: '1px solid #1a2540' }}>
                    <div className="flex items-center gap-1">
                      <div style={{ width: 14, height: 2, background: '#3b82f6' }} />
                      <span style={{ fontSize: 9, color: '#64748b' }}>X Axis</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div style={{ width: 14, height: 2, background: '#22c55e' }} />
                      <span style={{ fontSize: 9, color: '#64748b' }}>Y Axis</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div style={{ width: 10, height: 8, background: '#eab308' }} />
                    </div>
                    <div style={{ fontSize: 9, color: '#4a5f7a' }}>Time (s)</div>
                  </div>
                </div>

                {/* Vibration Frequency Spectrum */}
                <div className="flex flex-col" style={{ flex: '1 1 0', borderRight: '1px solid #1e2d45', minWidth: 0 }}>
                  <PanelHeader title="Vibration Frequency Spectrum">
                    <BarChart2 size={12} className="text-slate-500" />
                  </PanelHeader>
                  <div className="flex-1 chart-bg overflow-hidden">
                    <FrequencyChart bars={freqBars} />
                  </div>
                </div>

                {/* Temperature Trend */}
                <div className="flex flex-col" style={{ flex: '0.75 1 0', minWidth: 0 }}>
                  <PanelHeader title="Temperature Trend">
                    <div className="flex items-center gap-1.5">
                      <span className="val-yellow font-bold text-xs">{temperature.toFixed(1)}°C</span>
                      <div className="px-1" style={{ background: '#166534', border: '1px solid #22c55e' }}>
                        <AlignJustify size={9} className="text-green-400" />
                      </div>
                    </div>
                  </PanelHeader>
                  <div className="flex-1 chart-bg overflow-hidden">
                    <TemperatureChart data={tempTrend} temperature={temperature} />
                  </div>
                </div>
              </div>

              {/* BOTTOM ROW: Current Trend + Anomaly Warning */}
              <div className="flex" style={{ flex: '1 1 0', minHeight: 0 }}>

                {/* Current Trend */}
                <div className="flex flex-col" style={{ flex: '1.4 1 0', borderRight: '1px solid #1e2d45', minWidth: 0 }}>
                  <PanelHeader title="Current Trend">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200">{currentVal.toFixed(1)} A</span>
                      <div className="px-1 py-0.5" style={{ background: '#166534', border: '1px solid #22c55e' }}>
                        <AlignJustify size={9} className="text-green-400" />
                      </div>
                    </div>
                  </PanelHeader>
                  <div className="flex-1 chart-bg overflow-hidden">
                    <CurrentChart data={currentTrend} />
                  </div>
                </div>

                {/* Anomaly Detection (inline warning panel) */}
                <div className="flex flex-col" style={{ flex: '1 1 0', minWidth: 0, background: '#0d1420' }}>
                  <PanelHeader title="Anomaly Detection" />
                  <div className="p-3 space-y-2.5 overflow-y-auto">
                    <div
                      className="flex items-center gap-2 px-3 py-2"
                      style={{
                        background: 'linear-gradient(135deg,#1a1500 0%,#2a1f00 100%)',
                        border: '1px solid #ca8a04',
                        borderLeft: '3px solid #eab308',
                      }}
                    >
                      <AlertTriangle size={16} className="text-yellow-400 shrink-0" />
                      <span className="text-yellow-300 text-xs font-semibold">Warning: Bearing Wear Detected</span>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 w-24">Status:</span>
                        <AlertTriangle size={11} className="text-yellow-400" />
                        <span className="text-yellow-400 font-semibold">Warning</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 w-24">Vibration Alert:</span>
                        <span className="text-slate-200 font-medium">2x RPM Detected</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 w-24">Temperature:</span>
                        <span className="val-red font-medium">Elevated</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 w-24">RPM:</span>
                        <span className="text-slate-200 font-medium">{rpm} RPM</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

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
                <button className="btn-secondary" onClick={() => selectedMachine && setShowLimits(true)}>Set Machine Limits</button>
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
                <button className="toolbar-icon-btn"><Database size={10} /></button>
                <button className="toolbar-icon-btn"><Layers size={10} /></button>
                <button className="toolbar-icon-btn"><Wifi size={10} /></button>
                <button className="toolbar-icon-btn"><Plus size={10} /></button>
                <button className="toolbar-icon-btn"><AlignJustify size={10} /></button>
                <button className="toolbar-icon-btn"><SlidersHorizontal size={10} /></button>
                <div className="flex-1" />
                <div className="flex gap-1 items-center">
                  <div style={{ width: 8, height: 8, borderRadius: 1, background: '#22c55e' }} />
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
    </div>
  );
}
