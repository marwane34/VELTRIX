import { useState, useEffect } from 'react';
import {
  ChevronDown, BarChart2, RefreshCw, Save, Upload, Settings, Database, Layers,
  SlidersHorizontal, AlignJustify, Plus, AlertTriangle, Bell, Wifi,
} from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import VibrationChart from '../components/VibrationChart';
import FrequencyChart from '../components/FrequencyChart';
import TemperatureChart from '../components/TemperatureChart';
import CurrentChart from '../components/CurrentChart';
import AnomalyPanel from '../components/AnomalyPanel';
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

/* ---------- Small presentational helpers ---------- */

function SpinIcon({ size = 10 }: { size?: number }) {
  return (
    <span
      className="animate-spin"
      style={{ display: 'inline-block', width: size, height: size, border: '1.5px solid #64748b', borderTopColor: 'transparent', borderRadius: '50%' }}
    />
  );
}

function PanelHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-between px-3 py-1.5"
      style={{
        background: 'linear-gradient(180deg,#151f33 0%,#0f1726 100%)',
        borderBottom: '1px solid #1e2d45',
        minHeight: 30,
      }}
    >
      <span className="text-xs font-semibold text-slate-200 tracking-wide">{title}</span>
      {children}
    </div>
  );
}

function btn(
  icon: React.ReactNode,
  opts: { onClick?: () => void; title?: string; loading?: boolean; disabled?: boolean },
) {
  return (
    <button
      className="toolbar-icon-btn"
      onClick={opts.onClick}
      title={opts.title}
      disabled={opts.disabled || opts.loading}
      style={{ opacity: opts.disabled ? 0.4 : 1 }}
    >
      {opts.loading ? <SpinIcon size={10} /> : icon}
    </button>
  );
}

function KpiCard({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="panel p-3 flex flex-col items-center justify-center">
      <span style={{ fontSize: 22, fontWeight: 700, color }}>{value}</span>
      <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </span>
    </div>
  );
}

/* ---------- Main component ---------- */

export function Dashboard({ onNavigate }: DashboardProps) {
  const {
    machines,
    selectedMachine,
    selectMachine,
    monitoring,
    setMonitoring,
    simulateLoad,
    setSimulateLoad,
    vibration,
    freqBars,
    currentTrend,
    tempTrend,
    temperature,
    currentVal,
    rmsX,
    rmsY,
    rpm,
    aiAnalysis,
    recentAlerts,
    unreadCount,
    refreshMachines,
    markAlertsRead,
    persistSnapshot,
    liveReading,
    dataSource,
  } = useMonitoring();

  /* ----- modal / panel visibility state ----- */
  const [showAdd, setShowAdd] = useState(false);
  const [showLimits, setShowLimits] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [stopping, setStopping] = useState(false);

  /* ----- DB connection check ----- */
  const [connStatus, setConnStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  useEffect(() => {
    supabase
      .from('machines')
      .select('id')
      .limit(1)
      .then(({ error }) => setConnStatus(error ? 'offline' : 'online'));
  }, []);

  /* ----- derived display values ----- */
  const healthScore = aiAnalysis?.healthScore ?? 100;
  const bearingWear = aiAnalysis?.bearingWear ?? 0;
  const voltage = liveReading?.voltage ?? 220;

  const healthColor = healthScore > 70 ? '#4ade80' : healthScore >= 40 ? '#facc15' : '#f87171';
  const bearingColor = bearingWear > 60 ? '#f87171' : bearingWear > 30 ? '#facc15' : '#4ade80';
  const tempColor = temperature > 75 ? '#f87171' : temperature > 55 ? '#fb923c' : '#4ade80';
  const currentColor = currentVal > 3.5 ? '#f87171' : currentVal > 2.5 ? '#facc15' : '#60a5fa';
  const rpmColor = rpm < 1200 || rpm > 2400 ? '#facc15' : '#22d3ee';
  const voltageColor = voltage < 210 || voltage > 230 ? '#facc15' : '#4ade80';

  const isLive = !!liveReading;
  const dsColor = isLive ? '#4ade80' : '#60a5fa';
  const dsLabel = isLive ? 'LIVE' : 'SIMULATED';

  /* ----- handlers ----- */
  async function handleStop() {
    setStopping(true);
    setMonitoring(false);
    await persistSnapshot();
    setStopping(false);
  }

  async function handleRefresh() {
    await refreshMachines();
  }

  function handleAddCreated() {
    setShowAdd(false);
    refreshMachines();
  }

  function handleLimitsSaved() {
    setShowLimits(false);
    refreshMachines();
  }

  function handleBellClick() {
    setShowNotifications(true);
    markAlertsRead();
  }

  /* ---------- render ---------- */

  return (
    <div className="dashboard-root">
      {/* ===== Title bar ===== */}
      <div
        className="title-bar"
        onDoubleClick={() => {
          if (document.fullscreenElement) document.exitFullscreen();
          else document.documentElement.requestFullscreen?.();
        }}
      >
        <div className="flex items-center gap-2" style={{ width: 200 }}>
          <img
            src="/assets/veltrix-logo.svg"
            alt="VELTRIX"
            style={{ width: 16, height: 16, objectFit: 'contain' }}
          />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.5px' }}>
            VELTRIX
          </span>
        </div>
        <span className="title-bar-title">Predictive Maintenance Dashboard</span>
        <div style={{ width: 200, display: 'flex', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 9, color: '#4a5f7a', letterSpacing: '0.3px' }}>
            {monitoring ? '● LIVE' : '○ IDLE'}
          </span>
        </div>
      </div>

      {/* ===== Main layout ===== */}
      <div className="main-layout">
        {/* Sidebar */}
        <Sidebar onAddMachine={() => setShowAdd(true)} onSaveSettings={() => setShowLimits(true)} />

        {/* Content area */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#0b0f1a' }}>
          {/* Top: charts grid */}
          <div
            className="grid gap-2 p-2"
            style={{
              gridTemplateColumns: '1fr 1fr',
              gridTemplateRows: '1fr 1fr',
              flex: 1,
              minHeight: 0,
            }}
          >
            {/* Vibration */}
            <div className="panel flex flex-col overflow-hidden">
              <PanelHeader title="Vibration Waveform">
                <span style={{ fontSize: 9, color: '#64748b' }}>
                  RMS X: <span className="val-blue">{rmsX.toFixed(2)}g</span>
                  {'  '}Y: <span className="val-cyan">{rmsY.toFixed(2)}g</span>
                </span>
              </PanelHeader>
              <div className="chart-bg flex-1 overflow-hidden">
                <VibrationChart data={vibration} />
              </div>
            </div>

            {/* Frequency */}
            <div className="panel flex flex-col overflow-hidden">
              <PanelHeader title="Frequency Spectrum">
                <span style={{ fontSize: 9, color: '#64748b' }}>FFT</span>
              </PanelHeader>
              <div className="chart-bg flex-1 overflow-hidden">
                <FrequencyChart data={freqBars} />
              </div>
            </div>

            {/* Temperature */}
            <div className="panel flex flex-col overflow-hidden">
              <PanelHeader title="Temperature Trend">
                <span style={{ fontSize: 9, color: '#fb923c' }}>{temperature.toFixed(1)}°C</span>
              </PanelHeader>
              <div className="chart-bg flex-1 overflow-hidden">
                <TemperatureChart data={tempTrend} />
              </div>
            </div>

            {/* Current */}
            <div className="panel flex flex-col overflow-hidden">
              <PanelHeader title="Current Trend">
                <span style={{ fontSize: 9, color: '#facc15' }}>{currentVal.toFixed(2)} A</span>
              </PanelHeader>
              <div className="chart-bg flex-1 overflow-hidden">
                <CurrentChart data={currentTrend} />
              </div>
            </div>
          </div>

          {/* Bottom: KPIs + Anomaly panel */}
          <div
            className="flex gap-2 px-2 pb-2"
            style={{ flexShrink: 0 }}
          >
            {/* KPI stats — left */}
            <div className="flex flex-col gap-2" style={{ flex: '0 0 340px' }}>
              {/* Data source indicator */}
              <div
                className="panel flex items-center justify-between px-3 py-2"
                style={{ minHeight: 32 }}
              >
                <span className="flex items-center gap-1.5" style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <Wifi size={11} style={{ color: dsColor }} />
                  Data Source
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: dsColor,
                    letterSpacing: '0.5px',
                    border: `1px solid ${dsColor}`,
                    padding: '1px 6px',
                    background: `${dsColor}10`,
                  }}
                >
                  {dsLabel}
                </span>
              </div>

              {/* KPI grid */}
              <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                <KpiCard value={`${healthScore}`} label="Health Score" color={healthColor} />
                <KpiCard value={`${bearingWear}%`} label="Bearing Wear" color={bearingColor} />
                <KpiCard value={`${temperature.toFixed(0)}°`} label="Temperature" color={tempColor} />
                <KpiCard value={currentVal.toFixed(1)} label="Current (A)" color={currentColor} />
                <KpiCard value={rpm.toFixed(0)} label="RPM" color={rpmColor} />
                <KpiCard value={voltage.toFixed(0)} label="Voltage" color={voltageColor} />
              </div>

              {/* Monitoring controls */}
              <div className="panel flex items-center gap-2 px-3 py-2">
                <button
                  className="btn-monitor flex-1"
                  onClick={() => setMonitoring(!monitoring)}
                  disabled={stopping}
                  style={{ opacity: stopping ? 0.6 : 1 }}
                >
                  {monitoring ? 'MONITORING' : 'STOPPED'}
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => setSimulateLoad(!simulateLoad)}
                  title="Toggle simulated anomaly load"
                  style={{
                    borderColor: simulateLoad ? '#facc15' : '#2a3f60',
                    color: simulateLoad ? '#facc15' : '#94a3b8',
                  }}
                >
                  {simulateLoad ? 'FAULT SIM' : 'NORMAL'}
                </button>
                <button
                  className="btn-secondary"
                  onClick={handleStop}
                  disabled={stopping || !monitoring}
                  title="Stop & persist snapshot"
                  style={{ opacity: !monitoring || stopping ? 0.5 : 1 }}
                >
                  {stopping ? <SpinIcon size={10} /> : 'STOP'}
                </button>
              </div>
            </div>

            {/* Anomaly panel — right */}
            <div className="flex-1 overflow-hidden">
              <AnomalyPanel />
            </div>
          </div>

          {/* ===== Bottom toolbar ===== */}
          <div className="bottom-toolbar" style={{ flexShrink: 0 }}>
            {btn(<RefreshCw size={11} />, { onClick: handleRefresh, title: 'Refresh machines', loading: stopping })}

            {btn(<Save size={11} />, {
              onClick: () => persistSnapshot(),
              title: 'Save snapshot',
              disabled: !selectedMachine,
            })}

            {btn(<Upload size={11} />, {
              onClick: () => setShowExport(true),
              title: 'Export data',
              disabled: !selectedMachine,
            })}

            {btn(<Settings size={11} />, {
              onClick: () => setShowLimits(true),
              title: 'Set limits',
              disabled: !selectedMachine,
            })}

            {btn(<Database size={11} />, {
              onClick: () => setShowHistory(true),
              title: 'View history',
              disabled: !selectedMachine,
            })}

            {btn(<Layers size={11} />, {
              onClick: () => onNavigate('analytics'),
              title: 'Analytics',
            })}

            {btn(<SlidersHorizontal size={11} />, {
              onClick: () => onNavigate('machines'),
              title: 'Machines',
            })}

            {btn(<AlignJustify size={11} />, {
              onClick: () => onNavigate('alerts'),
              title: 'Alerts log',
            })}

            {btn(<Plus size={11} />, {
              onClick: () => setShowAdd(true),
              title: 'Add machine',
            })}

            {btn(<Bell size={11} />, {
              onClick: handleBellClick,
              title: 'Notifications',
            })}

            {/* spacer */}
            <div className="flex-1" />

            {/* DB connection status */}
            <div
              className="flex items-center gap-1.5 px-2"
              style={{
                fontSize: 9,
                color: '#64748b',
                letterSpacing: '0.3px',
                borderLeft: '1px solid #1e2d45',
                marginLeft: 4,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background:
                    connStatus === 'online' ? '#4ade80' : connStatus === 'offline' ? '#f87171' : '#facc15',
                  boxShadow:
                    connStatus === 'online'
                      ? '0 0 4px #4ade80'
                      : connStatus === 'offline'
                        ? '0 0 4px #f87171'
                        : '0 0 4px #facc15',
                }}
              />
              <span style={{ textTransform: 'uppercase' }}>
                DB: {connStatus === 'checking' ? '…' : connStatus}
              </span>
            </div>

            {/* Data source badge in toolbar */}
            <div
              className="flex items-center gap-1 px-2"
              style={{ fontSize: 9, color: dsColor, letterSpacing: '0.3px', borderLeft: '1px solid #1e2d45' }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: dsColor, boxShadow: `0 0 4px ${dsColor}` }} />
              {dsLabel}
            </div>

            {/* Unread alerts badge */}
            {unreadCount > 0 && (
              <div
                className="flex items-center gap-1 px-2"
                style={{ fontSize: 9, color: '#f87171', letterSpacing: '0.3px', borderLeft: '1px solid #1e2d45' }}
              >
                <AlertTriangle size={10} />
                {unreadCount} ALERT{unreadCount > 1 ? 'S' : ''}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== Modals ===== */}
      {showAdd && <AddMachineModal onClose={() => setShowAdd(false)} onCreated={handleAddCreated} />}
      {showLimits && selectedMachine && (
        <SetLimitsModal
          machine={selectedMachine}
          onClose={() => setShowLimits(false)}
          onSaved={handleLimitsSaved}
        />
      )}
      {showExport && (
        <ExportModal machine={selectedMachine} onClose={() => setShowExport(false)} />
      )}
      {showHistory && (
        <ViewHistoryModal machine={selectedMachine} onClose={() => setShowHistory(false)} />
      )}
      {showNotifications && <NotificationPanel onClose={() => setShowNotifications(false)} />}
    </div>
  );
}

export default Dashboard;
