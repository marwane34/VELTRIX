import { useState } from 'react';
import {
  RefreshCw, Save, Upload, Settings, Database, Layers, SlidersHorizontal,
  Square, Plus, Bell, Activity, X, Cpu, Thermometer, Zap, Gauge, ShieldCheck,
  AlertTriangle, Flame, Wrench, Clock, Lightbulb, Play, TrendingUp,
} from 'lucide-react';
import { useMonitoring } from '../contexts/MonitoringContext';
import { useToast } from '../components/Toast';
import { Sidebar } from '../components/Sidebar';
import VibrationChart from '../components/VibrationChart';
import FrequencyChart from '../components/FrequencyChart';
import TemperatureChart from '../components/TemperatureChart';
import CurrentChart from '../components/CurrentChart';
import AddMachineModal from '../components/AddMachineModal';
import SetLimitsModal from '../components/SetLimitsModal';
import ExportModal from '../components/ExportModal';
import ViewHistoryModal from '../components/ViewHistoryModal';
import NotificationPanel from '../components/NotificationPanel';
import type { HealthStatus } from '../types';

interface Props {
  onNavigate: (page: string) => void;
}

const statusConfig: Record<HealthStatus, { label: string; color: string; bg: string; Icon: typeof ShieldCheck }> = {
  healthy: { label: 'HEALTHY', color: '#4ade80', bg: 'rgba(34,197,94,0.12)', Icon: ShieldCheck },
  warning: { label: 'WARNING', color: '#facc15', bg: 'rgba(234,179,8,0.12)', Icon: AlertTriangle },
  critical: { label: 'CRITICAL', color: '#f87171', bg: 'rgba(239,68,68,0.12)', Icon: AlertTriangle },
};

function scoreColor(score: number) {
  if (score > 70) return '#22c55e';
  if (score >= 40) return '#eab308';
  return '#ef4444';
}

/**
 * Main SCADA predictive-maintenance dashboard. Frameless title bar with
 * VELTRIX brand + live status, a machine sidebar, four live charts, an AI
 * health gauge, KPI cards, monitoring controls, anomaly/RUL panels, a bottom
 * toolbar and a collapsible machine-settings panel.
 */
export function Dashboard({ onNavigate }: Props) {
  const {
    machines, selectedMachine, monitoring, setMonitoring, simulateLoad, setSimulateLoad,
    vibration, freqBars, currentTrend, tempTrend, temperature, currentVal, rmsX, rmsY, rpm,
    aiAnalysis, recentAlerts, unreadCount, refreshMachines, refreshSensors, markAlertsRead,
    persistSnapshot, sensors, settings, dataSource, liveReading,
  } = useMonitoring();
  const { toast } = useToast();

  const [showAddMachine, setShowAddMachine] = useState(false);
  const [showSetLimits, setShowSetLimits] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  const voltage = liveReading?.voltage ?? 220;
  const vibRms = (rmsX + rmsY) / 2;
  const ai = aiAnalysis;

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => { /* ignore */ });
    } else {
      document.exitFullscreen?.().catch(() => { /* ignore */ });
    }
  }

  async function handleRefresh() {
    await Promise.all([refreshMachines(), refreshSensors()]);
    toast('Data refreshed', 'success');
  }

  async function handleSave() {
    await persistSnapshot();
    toast('Snapshot saved', 'success');
  }

  // KPI cards
  const kpiCards = [
    { label: 'HEALTH', value: ai ? `${ai.healthScore}` : '—', unit: '', color: ai ? scoreColor(ai.healthScore) : '#64748b', Icon: ShieldCheck },
    { label: 'BEARING', value: ai ? `${ai.bearingWear}` : '—', unit: '%', color: ai ? (ai.bearingWear > 60 ? '#f87171' : ai.bearingWear > 40 ? '#facc15' : '#4ade80') : '#64748b', Icon: Wrench },
    { label: 'TEMP', value: temperature.toFixed(1), unit: '°C', color: '#fb923c', Icon: Thermometer },
    { label: 'CURRENT', value: currentVal.toFixed(2), unit: 'A', color: '#facc15', Icon: Zap },
    { label: 'RPM', value: `${rpm}`, unit: '', color: '#22d3ee', Icon: Gauge },
    { label: 'VOLTAGE', value: voltage.toFixed(1), unit: 'V', color: '#60a5fa', Icon: Activity },
  ];

  const gaugeSize = 110;
  const stroke = 9;
  const r = (gaugeSize - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = ai ? circ - (ai.healthScore / 100) * circ : circ;
  const ringColor = ai ? scoreColor(ai.healthScore) : '#1a2540';
  const sc = ai ? statusConfig[ai.status] : statusConfig.healthy;

  const machineSensors = sensors.filter((s) => s.machine_id === selectedMachine?.id);

  return (
    <div className="dashboard-root">
      {/* Title bar */}
      <div className="title-bar" onDoubleClick={toggleFullscreen} title="Double-click to toggle fullscreen">
        <div className="flex items-center gap-1.5">
          <img src="/assets/veltrix-logo.svg" alt="VELTRIX" width={16} height={16} />
          <span className="text-xs font-bold text-slate-100 tracking-wide">VELTRIX</span>
        </div>
        <span className="title-bar-title">Predictive Maintenance Dashboard</span>
        <div className="flex items-center gap-1.5">
          <span
            className={`flex-shrink-0 ${monitoring ? 'status-dot-active' : ''}`}
            style={{ width: 7, height: 7, borderRadius: '50%', background: monitoring ? '#22c55e' : '#64748b' }}
          />
          <span className="text-[10px] font-semibold tracking-wide" style={{ color: monitoring ? '#4ade80' : '#64748b' }}>
            {monitoring ? 'LIVE' : 'IDLE'}
          </span>
        </div>
      </div>

      {/* Main layout */}
      <div className="main-layout">
        {/* Sidebar */}
        <Sidebar onAddMachine={() => setShowAddMachine(true)} onSaveSettings={() => setShowSetLimits(true)} />

        {/* Center content */}
        <div className="flex-1 overflow-y-auto" style={{ padding: 8, background: '#0b0f1a' }}>
          <div className="flex flex-col gap-2">
            {/* Row 1: Vibration + Frequency */}
            <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <VibrationChart data={vibration} />
              <FrequencyChart data={freqBars} />
            </div>

            {/* Row 2: Temperature + Current */}
            <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <TemperatureChart data={tempTrend} />
              <CurrentChart data={currentTrend} />
            </div>

            {/* AI Health Score section */}
            <div className="panel">
              <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid #1e2d45' }}>
                <Activity size={13} className="text-blue-400" />
                <span className="text-xs font-semibold text-slate-200 tracking-wide">AI HEALTH ANALYSIS</span>
                {selectedMachine && (
                  <span className="ml-auto text-[10px] text-slate-500">{selectedMachine.name}</span>
                )}
              </div>
              <div className="flex items-stretch gap-3 p-3">
                {/* Gauge + status */}
                <div className="flex items-center gap-3" style={{ minWidth: 220 }}>
                  <div className="relative" style={{ width: gaugeSize, height: gaugeSize, flexShrink: 0 }}>
                    <svg width={gaugeSize} height={gaugeSize}>
                      <circle cx={gaugeSize / 2} cy={gaugeSize / 2} r={r} fill="none" stroke="#1a2540" strokeWidth={stroke} />
                      <circle
                        cx={gaugeSize / 2}
                        cy={gaugeSize / 2}
                        r={r}
                        fill="none"
                        stroke={ringColor}
                        strokeWidth={stroke}
                        strokeLinecap="round"
                        strokeDasharray={circ}
                        strokeDashoffset={offset}
                        transform={`rotate(-90 ${gaugeSize / 2} ${gaugeSize / 2})`}
                        style={{ transition: 'stroke-dashoffset 0.4s ease, stroke 0.4s ease' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold" style={{ color: ringColor }}>{ai ? ai.healthScore : '—'}</span>
                      <span className="text-[9px] text-slate-500 tracking-wide">SCORE</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-1.5 px-2 py-1" style={{ background: sc.bg, border: `1px solid ${sc.color}40` }}>
                      <sc.Icon size={12} style={{ color: sc.color }} />
                      <span className="text-[10px] font-semibold tracking-wide" style={{ color: sc.color }}>{sc.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <Clock size={11} className="text-slate-500" />
                      <span>RUL:</span>
                      <span className="font-semibold val-cyan">{ai ? ai.rulHours : '—'} h</span>
                    </div>
                  </div>
                </div>

                {/* Metric cards */}
                <div className="grid grid-cols-3 gap-2 flex-1">
                  {([
                    { label: 'Bearing Wear', value: ai?.bearingWear, Icon: Wrench },
                    { label: 'Overheat Risk', value: ai?.overheatRisk, Icon: Flame },
                    { label: 'Failure Risk', value: ai?.failureRisk, Icon: AlertTriangle },
                  ] as const).map((m) => {
                    const v = m.value ?? 0;
                    const color = v > 60 ? '#f87171' : v > 40 ? '#facc15' : '#4ade80';
                    return (
                      <div key={m.label} className="p-2" style={{ background: '#0e1726', border: '1px solid #1e2d45' }}>
                        <div className="flex items-center gap-1 mb-1">
                          <m.Icon size={10} style={{ color }} />
                          <span className="text-[9px] text-slate-400 truncate">{m.label}</span>
                        </div>
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-base font-bold" style={{ color }}>{ai ? v : '—'}</span>
                          <span className="text-[9px] text-slate-500">{ai ? '%' : ''}</span>
                        </div>
                        <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background: '#1a2540' }}>
                          <div style={{ width: `${v}%`, height: '100%', background: color, transition: 'width 0.4s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* KPI cards row */}
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
              {kpiCards.map((k) => (
                <div key={k.label} className="panel p-2.5 flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <k.Icon size={11} style={{ color: k.color }} />
                    <span className="text-[9px] text-slate-400 tracking-wide truncate">{k.label}</span>
                  </div>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-lg font-bold" style={{ color: k.color }}>{k.value}</span>
                    {k.unit && <span className="text-[9px] text-slate-500">{k.unit}</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Monitoring controls bar */}
            <div className="panel flex items-center gap-2 px-3 py-2">
              <span className="text-[10px] font-semibold text-slate-400 tracking-wide">MONITORING:</span>
              <button
                className="btn-monitor flex items-center gap-1"
                style={{ height: 26, padding: '0 12px', opacity: monitoring ? 0.6 : 1 }}
                onClick={() => { setMonitoring(true); toast('Monitoring started', 'success'); }}
                disabled={monitoring}
              >
                <Play size={11} /> Start
              </button>
              <button
                className="btn-secondary flex items-center gap-1"
                style={{ height: 26, padding: '0 12px', opacity: !monitoring || !simulateLoad ? 0.6 : 1 }}
                onClick={() => { setSimulateLoad(false); toast('Normal mode', 'info'); }}
                disabled={!monitoring || !simulateLoad}
              >
                Normal
              </button>
              <button
                className="btn-danger flex items-center gap-1"
                style={{ height: 26, padding: '0 12px', opacity: !monitoring ? 0.6 : 1 }}
                onClick={() => { setMonitoring(false); toast('Monitoring stopped', 'info'); }}
                disabled={!monitoring}
              >
                <Square size={10} /> Stop
              </button>
              <div className="ml-auto flex items-center gap-2">
                <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-slate-300">
                  <input
                    type="checkbox"
                    checked={simulateLoad}
                    onChange={(e) => { setSimulateLoad(e.target.checked); toast(e.target.checked ? 'Fault load simulation ON' : 'Fault load simulation OFF', 'info'); }}
                  />
                  Simulate Fault Load
                </label>
                <span className="text-[9px] text-slate-500">VIB: <span className="val-cyan font-semibold">{vibRms.toFixed(2)}</span></span>
              </div>
            </div>

            {/* Bottom row: Anomalies / Recommendations / RUL */}
            <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              {/* Anomalies */}
              <div className="panel flex flex-col" style={{ minHeight: 160 }}>
                <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid #1e2d45' }}>
                  <Gauge size={12} className="text-yellow-400" />
                  <span className="text-xs font-semibold text-slate-200 tracking-wide">ANOMALIES</span>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {ai && ai.anomalies.length > 0 ? (
                    ai.anomalies.map((a, i) => (
                      <div key={i} className="anomaly-log-item flex items-start gap-1.5">
                        <AlertTriangle size={10} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                        <span className="text-slate-300 leading-tight">{a}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-full text-[11px] text-slate-500 py-4">
                      No anomalies detected
                    </div>
                  )}
                </div>
              </div>

              {/* Recommendations */}
              <div className="panel flex flex-col" style={{ minHeight: 160 }}>
                <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid #1e2d45' }}>
                  <Lightbulb size={12} className="text-blue-400" />
                  <span className="text-xs font-semibold text-slate-200 tracking-wide">RECOMMENDATIONS</span>
                </div>
                <div className="flex-1 p-3">
                  <div
                    className="px-3 py-2.5 text-[11px] leading-relaxed"
                    style={{ background: '#0e1726', border: '1px solid #1e2d45', color: sc.color }}
                  >
                    {ai ? ai.recommendation : 'Select a machine to view recommendations.'}
                  </div>
                </div>
              </div>

              {/* RUL */}
              <div className="panel flex flex-col" style={{ minHeight: 160 }}>
                <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid #1e2d45' }}>
                  <Clock size={12} className="text-cyan-400" />
                  <span className="text-xs font-semibold text-slate-200 tracking-wide">REMAINING USEFUL LIFE</span>
                </div>
                <div className="flex-1 p-3 flex flex-col gap-3 justify-center">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold val-cyan">{ai ? ai.rulHours : '—'}</span>
                    <span className="text-xs text-slate-500">hours</span>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-[9px] text-slate-500 mb-1">
                      <span>Estimated lifespan</span>
                      <span>{ai ? Math.round((ai.rulHours / 5000) * 100) : 0}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1a2540' }}>
                      <div
                        style={{
                          width: `${ai ? Math.min(100, (ai.rulHours / 5000) * 100) : 0}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg,#06b6d4,#3b82f6)',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right collapsible settings panel */}
        {showSettingsPanel && selectedMachine && (
          <div
            className="flex flex-col flex-shrink-0"
            style={{
              width: 280,
              background: '#0e1420',
              borderLeft: '1px solid #1e2d45',
            }}
          >
            <div className="flex items-center justify-between px-3 py-2.5" style={{ borderBottom: '1px solid #1e2d45', background: 'linear-gradient(180deg,#151f33 0%,#0f1726 100%)' }}>
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={13} className="text-blue-400" />
                <span className="text-xs font-semibold text-slate-200 tracking-wide">MACHINE SETTINGS</span>
              </div>
              <button onClick={() => setShowSettingsPanel(false)} className="text-slate-500 hover:text-slate-300">
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
              {/* Machine info */}
              <div className="p-2.5" style={{ background: '#0e1726', border: '1px solid #1e2d45' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Cpu size={14} className="text-blue-400" />
                  <span className="text-xs font-semibold text-slate-200">{selectedMachine.name}</span>
                </div>
                <div className="flex flex-col gap-1 text-[10px]">
                  <div className="flex justify-between"><span className="text-slate-500">Location</span><span className="text-slate-300">{selectedMachine.location || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Status</span><span className="text-slate-300 capitalize">{selectedMachine.status}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Sensors</span><span className="text-slate-300">{machineSensors.length}</span></div>
                </div>
              </div>

              {/* Thresholds */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold text-slate-400 tracking-wide">THRESHOLDS</span>
                <div className="p-2.5 flex flex-col gap-1.5" style={{ background: '#0e1726', border: '1px solid #1e2d45' }}>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-cyan-400">Vibration RMS</span>
                    <span className="text-slate-300">{selectedMachine.rms_min}–{selectedMachine.rms_max} mm/s</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-orange-400">Temperature</span>
                    <span className="text-slate-300">{selectedMachine.temp_min}–{selectedMachine.temp_max} °C</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-yellow-400">Current</span>
                    <span className="text-slate-300">{selectedMachine.current_min}–{selectedMachine.current_max} A</span>
                  </div>
                </div>
              </div>

              {/* Live readings */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold text-slate-400 tracking-wide">LIVE READINGS</span>
                <div className="p-2.5 grid grid-cols-2 gap-2" style={{ background: '#0e1726', border: '1px solid #1e2d45' }}>
                  <div className="text-[10px]"><span className="text-slate-500">Temp</span> <span className="val-orange font-semibold">{temperature.toFixed(1)}°</span></div>
                  <div className="text-[10px]"><span className="text-slate-500">Curr</span> <span className="val-yellow font-semibold">{currentVal.toFixed(2)}A</span></div>
                  <div className="text-[10px]"><span className="text-slate-500">RMS</span> <span className="val-cyan font-semibold">{vibRms.toFixed(2)}</span></div>
                  <div className="text-[10px]"><span className="text-slate-500">RPM</span> <span className="val-cyan font-semibold">{rpm}</span></div>
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold text-slate-400 tracking-wide">QUICK ACTIONS</span>
                <button className="btn-secondary flex items-center justify-center gap-1.5" style={{ height: 28 }} onClick={() => setShowSetLimits(true)}>
                  <SlidersHorizontal size={12} /> Set Limits
                </button>
                <button className="btn-secondary flex items-center justify-center gap-1.5" style={{ height: 28 }} onClick={() => setShowExport(true)}>
                  <Upload size={12} /> Export Data
                </button>
                <button className="btn-secondary flex items-center justify-center gap-1.5" style={{ height: 28 }} onClick={() => setShowHistory(true)}>
                  <Layers size={12} /> View History
                </button>
                <button className="btn-secondary flex items-center justify-center gap-1.5" style={{ height: 28 }} onClick={() => onNavigate('communication')}>
                  <Cpu size={12} /> Communication
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom toolbar */}
      <div className="bottom-toolbar">
        <button className="toolbar-icon-btn" title="Refresh" onClick={handleRefresh}><RefreshCw size={13} /></button>
        <button className="toolbar-icon-btn" title="Save Snapshot" onClick={handleSave}><Save size={13} /></button>
        <button className="toolbar-icon-btn" title="Export" onClick={() => setShowExport(true)}><Upload size={13} /></button>
        <button className="toolbar-icon-btn" title="Settings" onClick={() => setShowSetLimits(true)}><Settings size={13} /></button>
        <button className="toolbar-icon-btn" title="Database" onClick={() => onNavigate('analytics')}><Database size={13} /></button>
        <button className="toolbar-icon-btn" title="History" onClick={() => setShowHistory(true)}><Layers size={13} /></button>
        <button className="toolbar-icon-btn" title="Settings Panel" onClick={() => setShowSettingsPanel((v) => !v)} style={{ color: showSettingsPanel ? '#60a5fa' : undefined, borderColor: showSettingsPanel ? '#3b82f6' : undefined }}><SlidersHorizontal size={13} /></button>
        <button className="toolbar-icon-btn" title="Stop" onClick={() => setMonitoring(false)}><Square size={12} /></button>
        <button className="toolbar-icon-btn" title="Add Machine" onClick={() => setShowAddMachine(true)}><Plus size={13} /></button>
        <button className="toolbar-icon-btn relative" title="Notifications" onClick={() => setShowNotifications(true)}>
          <Bell size={13} />
          {unreadCount > 0 && (
            <span className="absolute flex items-center justify-center text-[7px] font-bold text-white" style={{ top: -4, right: -4, minWidth: 12, height: 12, padding: '0 2px', background: '#ef4444', border: '1px solid #0d1220' }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* DB connection status */}
        <div className="ml-auto flex items-center gap-1.5 px-2">
          <span className="flex-shrink-0 status-dot-active" style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
          <span className="text-[9px] text-slate-400">DB</span>
          <span className="text-[9px] val-green font-semibold">CONNECTED</span>
          <span style={{ width: 1, height: 12, background: '#1e2d45' }} />
          <span className="text-[9px] text-slate-500">SRC:</span>
          <span className="text-[9px] font-semibold" style={{ color: dataSource === 'live' ? '#4ade80' : '#facc15' }}>
            {dataSource === 'live' ? 'LIVE' : 'SIM'}
          </span>
        </div>
      </div>

      {/* Modals */}
      {showAddMachine && (
        <AddMachineModal
          onClose={() => setShowAddMachine(false)}
          onCreated={() => { refreshMachines(); toast('Machine added', 'success'); }}
        />
      )}
      {showSetLimits && selectedMachine && (
        <SetLimitsModal
          machine={selectedMachine}
          onClose={() => setShowSetLimits(false)}
          onSaved={() => { refreshMachines(); toast('Limits saved', 'success'); }}
        />
      )}
      {showExport && <ExportModal machine={selectedMachine} onClose={() => setShowExport(false)} />}
      {showHistory && <ViewHistoryModal machine={selectedMachine} onClose={() => setShowHistory(false)} />}
      {showNotifications && <NotificationPanel onClose={() => setShowNotifications(false)} />}
    </div>
  );
}

export default Dashboard;
