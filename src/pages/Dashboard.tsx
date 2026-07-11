import { useState, useEffect } from 'react';
import { ChevronDown, ChartBar as BarChart2, RefreshCw, Save, Upload, Settings, Database, Layers, SlidersHorizontal, AlignJustify, Plus, TriangleAlert as AlertTriangle, Bell, Wifi, Activity, Thermometer, Zap, Gauge, Battery, Clock, Lightbulb, Play, Square, CircleAlert as AlertCircle, ShieldCheck, Wrench, X } from 'lucide-react';
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
import { useMonitoring } from '../contexts/MonitoringContext';
import { supabase } from '../lib/supabase';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

/* ---------- Helpers ---------- */

function SpinIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="animate-spin">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function PanelHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5"
      style={{ background: 'linear-gradient(180deg,#151f33 0%,#0f1726 100%)', borderBottom: '1px solid #1e2d45', minHeight: 30 }}>
      <span className="text-xs font-semibold text-slate-200 tracking-wide">{title}</span>
      {children}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, unit, color }: {
  icon: React.ElementType; label: string; value: string | number; unit?: string; color: string;
}) {
  return (
    <div className="panel flex flex-col items-center justify-center" style={{ padding: '8px 4px' }}>
      <Icon size={14} style={{ color, marginBottom: 2 }} />
      <span style={{ fontSize: 20, fontWeight: 700, color, lineHeight: 1.1 }}>{value}{unit && <span style={{ fontSize: 11, marginLeft: 2 }}>{unit}</span>}</span>
      <span style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>{label}</span>
    </div>
  );
}

function btn(icon: React.ReactNode, opts: { onClick?: () => void; title?: string; loading?: boolean; disabled?: boolean }) {
  return (
    <button className="toolbar-icon-btn" onClick={opts.onClick} title={opts.title}
      disabled={opts.disabled || opts.loading} style={{ opacity: opts.disabled ? 0.4 : 1 }}>
      {opts.loading ? <SpinIcon size={10} /> : icon}
    </button>
  );
}

/* ---------- Main Dashboard ---------- */

export function Dashboard({ onNavigate }: DashboardProps) {
  const {
    machines, selectedMachine, monitoring, setMonitoring, simulateLoad, setSimulateLoad,
    vibration, freqBars, currentTrend, tempTrend,
    temperature, currentVal, rmsX, rmsY, rpm,
    aiAnalysis, recentAlerts, unreadCount, refreshMachines, markAlertsRead,
    persistSnapshot, liveReading, dataSource,
  } = useMonitoring();

  const [showAdd, setShowAdd] = useState(false);
  const [showLimits, setShowLimits] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [connStatus, setConnStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    supabase.from('machines').select('id').limit(1).then(({ error }) => setConnStatus(error ? 'offline' : 'online'));
  }, []);

  function handleStopMonitoring() {
    setStopping(true);
    setTimeout(() => { setMonitoring(false); setStopping(false); }, 500);
  }

  const voltage = liveReading?.voltage ?? 220 + (Math.random() - 0.5) * 5;
  const healthColor = aiAnalysis ? (aiAnalysis.healthScore > 70 ? '#22c55e' : aiAnalysis.healthScore > 40 ? '#eab308' : '#ef4444') : '#64748b';

  return (
    <div className="dashboard-root">
      {/* Custom Frameless Title Bar */}
      <div className="title-bar"
        onDoubleClick={() => {
          if (document.fullscreenElement) document.exitFullscreen();
          else document.documentElement.requestFullscreen?.();
        }}>
        <div className="flex items-center gap-2" style={{ width: 200 }}>
          <img src="/assets/veltrix-logo.svg" alt="VELTRIX" style={{ width: 16, height: 16, objectFit: 'contain' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.5px' }}>VELTRIX</span>
        </div>
        <span className="title-bar-title">Predictive Maintenance Dashboard</span>
        <div style={{ width: 200, display: 'flex', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 9, color: '#4a5f7a', letterSpacing: '0.3px' }}>{monitoring ? '● LIVE' : '○ IDLE'}</span>
        </div>
      </div>

      {/* Main Layout: Left sidebar (machine list) + Center content + Right collapsible settings panel */}
      <div className="main-layout">
        {/* Left sidebar — machine list only */}
        <Sidebar onAddMachine={() => setShowAdd(true)} onSaveSettings={() => setShowLimits(true)} />

        {/* Center content area */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#0b0f1a' }}>
          <div className="flex-1 overflow-y-auto" style={{ padding: '8px' }}>
            {/* === Row 1: Vibration Waveform (left, large) + Frequency Spectrum (right, large) === */}
            <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 8 }}>
              <div className="panel flex flex-col">
                <PanelHeader title="VIBRATION WAVEFORM">
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 10, color: '#64748b' }}>X: <span className="val-blue">{rmsX.toFixed(2)}g</span></span>
                    <span style={{ fontSize: 10, color: '#64748b' }}>Y: <span className="val-cyan">{rmsY.toFixed(2)}g</span></span>
                  </div>
                </PanelHeader>
                <div className="flex-1 chart-bg" style={{ minHeight: 160 }}>
                  <VibrationChart data={vibration} />
                </div>
              </div>
              <div className="panel flex flex-col">
                <PanelHeader title="FREQUENCY SPECTRUM">
                  <span style={{ fontSize: 10, color: '#64748b' }}>Peak: <span className="val-blue">{freqBars.length > 0 ? Math.max(...freqBars.map(f => f.amp)).toFixed(2) : '0.00'}</span></span>
                </PanelHeader>
                <div className="flex-1 chart-bg" style={{ minHeight: 160 }}>
                  <FrequencyChart data={freqBars} />
                </div>
              </div>
            </div>

            {/* === Row 2: Temperature Trend (left) + Current Trend (right) === */}
            <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 8 }}>
              <div className="panel flex flex-col">
                <PanelHeader title="TEMPERATURE TREND">
                  <span style={{ fontSize: 10, color: '#64748b' }}>Current: <span className="val-orange">{temperature.toFixed(1)}°C</span></span>
                </PanelHeader>
                <div className="flex-1 chart-bg" style={{ minHeight: 160 }}>
                  <TemperatureChart data={tempTrend} />
                </div>
              </div>
              <div className="panel flex flex-col">
                <PanelHeader title="CURRENT TREND">
                  <span style={{ fontSize: 10, color: '#64748b' }}>Current: <span className="val-yellow">{currentVal.toFixed(2)}A</span></span>
                </PanelHeader>
                <div className="flex-1 chart-bg" style={{ minHeight: 160 }}>
                  <CurrentChart data={currentTrend} />
                </div>
              </div>
            </div>

            {/* === AI Health Score Section (below charts) === */}
            <div className="panel" style={{ marginBottom: 8 }}>
              <PanelHeader title="AI HEALTH ANALYSIS">
                <div className="flex items-center gap-2">
                  {dataSource === 'live' ? (
                    <><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} /><span style={{ fontSize: 9, color: '#22c55e', fontWeight: 600 }}>LIVE DATA</span></>
                  ) : (
                    <><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} /><span style={{ fontSize: 9, color: '#3b82f6', fontWeight: 600 }}>SIMULATED</span></>
                  )}
                </div>
              </PanelHeader>
              <div className="flex items-center gap-6" style={{ padding: '12px 16px' }}>
                {/* Health Score Gauge */}
                <div className="flex flex-col items-center" style={{ minWidth: 100 }}>
                  <div style={{ position: 'relative', width: 80, height: 80 }}>
                    <svg width="80" height="80" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" fill="none" stroke="#1e2d45" strokeWidth="6" />
                      <circle cx="40" cy="40" r="34" fill="none" stroke={healthColor} strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={`${(aiAnalysis?.healthScore ?? 0) * 2.136} 213.6`}
                        transform="rotate(-90 40 40)"
                        style={{ transition: 'stroke-dasharray 0.5s ease, stroke 0.3s' }}
                      />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 24, fontWeight: 800, color: healthColor, lineHeight: 1 }}>{aiAnalysis?.healthScore ?? '--'}</span>
                      <span style={{ fontSize: 8, color: '#64748b', textTransform: 'uppercase' }}>Score</span>
                    </div>
                  </div>
                  <div style={{
                    marginTop: 6, padding: '2px 10px', fontSize: 10, fontWeight: 700,
                    background: `${healthColor}20`, border: `1px solid ${healthColor}60`,
                    color: healthColor, textTransform: 'uppercase', letterSpacing: '0.5px',
                  }}>
                    {aiAnalysis?.status ?? '—'}
                  </div>
                </div>

                {/* AI Metrics */}
                <div className="flex-1 grid gap-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                  {[
                    { label: 'Bearing Wear', value: aiAnalysis?.bearingWear, unit: '%', icon: Wrench, color: '#f97316' },
                    { label: 'Overheat Risk', value: aiAnalysis?.overheatRisk, unit: '%', icon: Thermometer, color: '#ef4444' },
                    { label: 'Failure Risk', value: aiAnalysis?.failureRisk, unit: '%', icon: AlertCircle, color: '#ef4444' },
                  ].map(m => (
                    <div key={m.label} className="flex flex-col items-center justify-center" style={{ background: '#060b14', border: '1px solid #1a2540', padding: '8px 4px' }}>
                      <m.icon size={13} style={{ color: m.color, marginBottom: 3 }} />
                      <span style={{ fontSize: 18, fontWeight: 700, color: m.color }}>{m.value ?? '--'}{m.unit}</span>
                      <span style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', marginTop: 2 }}>{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* === KPI Cards Row (horizontal, under AI section) === */}
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(6, 1fr)', marginBottom: 8 }}>
              <KpiCard icon={ShieldCheck} label="Health" value={aiAnalysis?.healthScore ?? '--'} color={healthColor} />
              <KpiCard icon={Wrench} label="Bearing" value={aiAnalysis?.bearingWear ?? '--'} unit="%" color="#f97316" />
              <KpiCard icon={Thermometer} label="Temp" value={temperature.toFixed(0)} unit="°C" color="#f97316" />
              <KpiCard icon={Zap} label="Current" value={currentVal.toFixed(1)} unit="A" color="#eab308" />
              <KpiCard icon={Gauge} label="RPM" value={rpm} color="#3b82f6" />
              <KpiCard icon={Battery} label="Voltage" value={voltage.toFixed(0)} unit="V" color="#06b6d4" />
            </div>

            {/* === Monitoring Controls (below KPI cards) === */}
            <div className="panel flex items-center gap-3" style={{ padding: '10px 16px', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Monitoring</span>
              <button
                onClick={() => setMonitoring(true)}
                disabled={monitoring}
                className="btn-monitor flex items-center gap-1.5"
                style={{ opacity: monitoring ? 0.5 : 1 }}
              >
                <Play size={11} /> Start
              </button>
              <button
                onClick={() => setSimulateLoad(false)}
                disabled={!simulateLoad && monitoring}
                className="btn-secondary flex items-center gap-1.5"
              >
                <Activity size={11} /> Normal
              </button>
              <button
                onClick={handleStopMonitoring}
                disabled={!monitoring}
                className="btn-secondary flex items-center gap-1.5"
                style={{ opacity: !monitoring ? 0.5 : 1, borderColor: monitoring ? '#7f1d1d' : '#2a3f60', color: monitoring ? '#f87171' : '#64748b' }}
              >
                {stopping ? <SpinIcon size={11} /> : <Square size={11} />} Stop
              </button>
              <div className="flex-1" />
              <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: 11, color: '#94a3b8' }}>
                <input type="checkbox" checked={simulateLoad} onChange={(e) => setSimulateLoad(e.target.checked)} />
                Simulate Fault Load
              </label>
              <div className="flex items-center gap-1.5" style={{ fontSize: 10, color: '#64748b' }}>
                <div style={{ width: 8, height: 8, borderRadius: 1, background: monitoring ? '#22c55e' : '#64748b' }} />
                {monitoring ? 'Running' : 'Stopped'}
              </div>
            </div>

            {/* === Bottom: Anomalies, Recommendations, RUL === */}
            <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              {/* Anomalies */}
              <div className="panel flex flex-col">
                <PanelHeader title="ANOMALIES">
                  <span style={{ fontSize: 10, color: aiAnalysis && aiAnalysis.anomalies.length > 0 ? '#ef4444' : '#22c55e', fontWeight: 600 }}>
                    {aiAnalysis?.anomalies.length ?? 0} detected
                  </span>
                </PanelHeader>
                <div className="flex-1 overflow-y-auto" style={{ padding: '6px 8px', maxHeight: 140 }}>
                  {aiAnalysis && aiAnalysis.anomalies.length > 0 ? (
                    aiAnalysis.anomalies.map((a, i) => (
                      <div key={i} className="flex items-start gap-2 anomaly-log-item">
                        <AlertTriangle size={11} className="text-red-400 shrink-0 mt-0.5" />
                        <span style={{ fontSize: 10.5, color: '#94a3b8' }}>{a}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center gap-2" style={{ padding: '8px 4px' }}>
                      <ShieldCheck size={14} className="text-green-500" />
                      <span style={{ fontSize: 10.5, color: '#64748b' }}>No anomalies detected</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Recommendations */}
              <div className="panel flex flex-col">
                <PanelHeader title="RECOMMENDATIONS">
                  <Lightbulb size={12} className="text-yellow-500" />
                </PanelHeader>
                <div className="flex-1 overflow-y-auto" style={{ padding: '8px 10px', maxHeight: 140 }}>
                  <div className="flex items-start gap-2">
                    <Wrench size={12} className="text-blue-400 shrink-0 mt-0.5" />
                    <span style={{ fontSize: 10.5, color: '#94a3b8', lineHeight: 1.5 }}>{aiAnalysis?.recommendation ?? 'No data available'}</span>
                  </div>
                </div>
              </div>

              {/* Remaining Useful Life */}
              <div className="panel flex flex-col">
                <PanelHeader title="REMAINING USEFUL LIFE">
                  <Clock size={12} className="text-cyan-400" />
                </PanelHeader>
                <div className="flex-1 flex flex-col items-center justify-center" style={{ padding: '12px' }}>
                  <span style={{ fontSize: 28, fontWeight: 800, color: '#06b6d4' }}>{aiAnalysis?.rulHours ?? '--'}</span>
                  <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>Hours Remaining</span>
                  <div style={{ width: '100%', height: 4, background: '#1e2d45', marginTop: 8, borderRadius: 2 }}>
                    <div style={{
                      width: `${Math.min(100, ((aiAnalysis?.rulHours ?? 0) / 5000) * 100)}%`,
                      height: '100%', background: '#06b6d4', borderRadius: 2,
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Toolbar */}
          <div className="bottom-toolbar shrink-0">
            {btn(<RefreshCw size={10} />, { onClick: refreshMachines, title: 'Refresh machines' })}
            {btn(<Save size={10} />, { onClick: persistSnapshot, title: 'Save snapshot' })}
            {btn(<Upload size={10} />, { onClick: () => setShowExport(true), title: 'Export data', disabled: !selectedMachine })}
            {btn(<Settings size={10} />, { onClick: () => setShowLimits(true), title: 'Machine settings', disabled: !selectedMachine })}
            {btn(<Database size={10} />, {
              title: connStatus === 'online' ? 'Database online' : connStatus === 'offline' ? 'Database offline' : 'Checking database...',
            })}
            {btn(<Layers size={10} />, { onClick: () => setShowHistory(true), title: 'View history', disabled: !selectedMachine })}
            {btn(<SlidersHorizontal size={10} />, { onClick: () => setSettingsOpen(true), title: 'Machine settings panel', disabled: !selectedMachine })}
            {btn(<AlignJustify size={10} />, { onClick: handleStopMonitoring, title: monitoring ? 'Stop monitoring' : 'Monitoring stopped', loading: stopping, disabled: !monitoring })}
            {btn(<Plus size={10} />, { onClick: () => setShowAdd(true), title: 'Add machine' })}
            {btn(<Bell size={10} />, { onClick: () => setShowNotifications(true), title: 'Notifications' })}
            <div className="flex-1" />
            <div className="flex gap-1 items-center">
              {connStatus === 'online' ? (
                <><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} /><span style={{ fontSize: 9, color: '#22c55e' }}>DB Online</span></>
              ) : connStatus === 'offline' ? (
                <><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} /><span style={{ fontSize: 9, color: '#ef4444' }}>DB Offline</span></>
              ) : (
                <><SpinIcon size={10} /><span style={{ fontSize: 9, color: '#64748b' }}>Checking...</span></>
              )}
              <span style={{ fontSize: 9, color: '#64748b', marginLeft: 6 }}>Supabase PostgreSQL</span>
            </div>
          </div>
        </div>

        {/* Right collapsible Machine Settings panel */}
        {settingsOpen && (
          <div className="shrink-0 flex flex-col" style={{ width: 280, background: '#0e1420', borderLeft: '1px solid #1e2d45' }}>
            <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid #1e2d45', background: 'linear-gradient(180deg,#151f33 0%,#0f1726 100%)' }}>
              <span className="text-xs font-semibold text-slate-200 tracking-wide">MACHINE SETTINGS</span>
              <button onClick={() => setSettingsOpen(false)} className="text-slate-500 hover:text-slate-300"><X size={14} /></button>
            </div>
            {selectedMachine ? (
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                <div>
                  <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Machine</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{selectedMachine.name}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{selectedMachine.location || 'No location'}</div>
                </div>
                <div style={{ borderTop: '1px solid #1e2d45', paddingTop: 10 }}>
                  <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Thresholds</div>
                  <div className="space-y-2">
                    {[
                      { label: 'Vibration RMS', min: selectedMachine.rms_min, max: selectedMachine.rms_max, unit: 'g', color: '#3b82f6' },
                      { label: 'Temperature', min: selectedMachine.temp_min, max: selectedMachine.temp_max, unit: '°C', color: '#ef4444' },
                      { label: 'Current', min: selectedMachine.current_min, max: selectedMachine.current_max, unit: 'A', color: '#eab308' },
                    ].map(t => (
                      <div key={t.label} className="flex items-center justify-between" style={{ fontSize: 11 }}>
                        <span style={{ color: '#94a3b8' }}>{t.label}</span>
                        <span style={{ color: t.color, fontWeight: 600 }}>{t.min} – {t.max} {t.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={() => { setShowLimits(true); }} className="btn-secondary w-full flex items-center justify-center gap-1.5 py-2">
                  <SlidersHorizontal size={11} /> Edit Limits
                </button>
                <button onClick={() => { setShowExport(true); }} className="btn-secondary w-full flex items-center justify-center gap-1.5 py-2">
                  <Upload size={11} /> Export Data
                </button>
                <button onClick={() => { setShowHistory(true); }} className="btn-secondary w-full flex items-center justify-center gap-1.5 py-2">
                  <Layers size={11} /> View History
                </button>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center p-4">
                <span style={{ fontSize: 11, color: '#64748b' }}>Select a machine to view settings</span>
              </div>
            )}
          </div>
        )}
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

export default Dashboard;
