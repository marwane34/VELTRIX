import { useState, useMemo, useEffect } from 'react';
import {
  Usb, Wifi, Radio, Network, Server, Globe, Plus, Trash2, Play, Square,
  RefreshCw, Save, CheckCircle, XCircle, Loader2, AlertTriangle, ChevronDown,
  Activity, Settings as SettingsIcon, X, Search,
} from 'lucide-react';
import {
  useCommunication,
  CommMethod, CommConfig, ConnStatus, CommSetting, METHOD_LABELS,
} from '../contexts/CommunicationContext';
import { useMonitoring } from '../contexts/MonitoringContext';
import { useToast } from '../components/Toast';

/* ---------- constants ---------- */

const METHODS: { key: CommMethod; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'usb_serial', label: 'USB Serial', icon: <Usb size={18} />, color: '#3b82f6' },
  { key: 'wifi', label: 'Wi-Fi', icon: <Wifi size={18} />, color: '#06b6d4' },
  { key: 'mqtt', label: 'MQTT', icon: <Radio size={18} />, color: '#8b5cf6' },
  { key: 'modbus_tcp', label: 'Modbus TCP', icon: <Network size={18} />, color: '#eab308' },
  { key: 'opcua', label: 'OPC UA', icon: <Server size={18} />, color: '#22c55e' },
  { key: 'rest_api', label: 'REST API', icon: <Globe size={18} />, color: '#f97316' },
];

const STATUS_CONFIG: Record<ConnStatus, { color: string; bg: string; label: string; icon: React.ReactNode }> = {
  connected: { color: '#22c55e', bg: '#22c55e15', label: 'Connected', icon: <CheckCircle size={11} /> },
  connecting: { color: '#eab308', bg: '#eab30815', label: 'Connecting', icon: <Loader2 size={11} className="animate-spin" /> },
  disconnected: { color: '#64748b', bg: '#64748b15', label: 'Disconnected', icon: <XCircle size={11} /> },
  error: { color: '#ef4444', bg: '#ef444415', label: 'Error', icon: <AlertTriangle size={11} /> },
};

const BAUD_RATES = [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600];

/* ---------- helpers ---------- */

function methodIcon(method: CommMethod): React.ReactNode {
  const found = METHODS.find((m) => m.key === method);
  return found ? found.icon : <Radio size={18} />;
}

function methodColor(method: CommMethod): string {
  const found = METHODS.find((m) => m.key === method);
  return found ? found.color : '#64748b';
}

/* ---------- status badge ---------- */

function StatusBadge({ status }: { status: ConnStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className="flex items-center gap-1 px-2 py-0.5"
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.color}40`,
        color: cfg.color,
        borderRadius: 3,
        fontSize: 10,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.3px',
      }}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

/* ---------- main component ---------- */

export function CommunicationPage() {
  const {
    settings, activeSetting, activeStatus, incomingData, dataBuffer,
    saveSetting, updateSetting, deleteSetting, activateSetting, connect, disconnect,
    refreshSettings, clearBuffer, availablePorts, refreshPorts,
  } = useCommunication();
  const { machines } = useMonitoring();
  const { toast } = useToast();

  const [selectedMethod, setSelectedMethod] = useState<CommMethod>('usb_serial');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formMachineId, setFormMachineId] = useState('');
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // form config state
  const [config, setConfig] = useState<CommConfig>({});
  const [selectedPacket, setSelectedPacket] = useState<number | null>(null);

  /* ----- reset form when method changes ----- */
  useEffect(() => {
    if (!showForm) return;
    if (editingId) return; // don't reset when editing
    setConfig(getDefaultConfig(selectedMethod));
  }, [selectedMethod, showForm, editingId]);

  /* ----- form open/close ----- */
  function openNewForm() {
    setShowForm(true);
    setEditingId(null);
    setFormName('');
    setFormMachineId(machines[0]?.id ?? '');
    setConfig(getDefaultConfig(selectedMethod));
  }

  function openEditForm(setting: CommSetting) {
    setShowForm(true);
    setEditingId(setting.id);
    setFormName(setting.name);
    setFormMachineId(setting.config.machineId ?? '');
    setConfig(setting.config);
    setSelectedMethod(setting.method);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setFormName('');
    setConfig({});
  }

  /* ----- save ----- */
  async function handleSave() {
    if (!formName.trim()) {
      toast('Config name is required', 'error');
      return;
    }
    setSaving(true);
    const fullConfig: CommConfig = { ...config, machineId: formMachineId || undefined };
    try {
      if (editingId) {
        await updateSetting(editingId, { name: formName.trim(), config: fullConfig });
        toast('Config updated', 'success');
      } else {
        await saveSetting(selectedMethod, formName.trim(), fullConfig);
        toast('Config saved', 'success');
      }
      closeForm();
    } catch (err: any) {
      toast(err.message ?? 'Save failed', 'error');
    }
    setSaving(false);
  }

  /* ----- connect/disconnect ----- */
  async function handleConnect(id: string) {
    setConnecting(id);
    try {
      await activateSetting(id);
      await connect(id);
      toast('Connecting...', 'info');
    } catch (err: any) {
      toast(err.message ?? 'Connection failed', 'error');
    }
    setConnecting(null);
  }

  function handleDisconnect() {
    disconnect();
    toast('Disconnected', 'info');
  }

  /* ----- delete ----- */
  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete config "${name}"?`)) return;
    setDeleting(id);
    try {
      await deleteSetting(id);
      toast('Config deleted', 'success');
    } catch (err: any) {
      toast(err.message ?? 'Delete failed', 'error');
    }
    setDeleting(null);
  }

  /* ----- selected packet for JSON viewer ----- */
  const packet = selectedPacket != null ? incomingData[selectedPacket] : null;

  /* ---------- render ---------- */

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ background: 'linear-gradient(180deg,#0d1525 0%,#080d14 100%)', borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-3">
          <Radio size={20} style={{ color: 'var(--accent-cyan)' }} />
          <span className="text-sm font-semibold text-slate-200 tracking-wide">COMMUNICATION MANAGER</span>
        </div>
        <div className="flex items-center gap-2">
          {activeSetting && (
            <div className="flex items-center gap-2 px-3 py-1" style={{ background: '#0e1726', border: '1px solid var(--border-subtle)', borderRadius: 3 }}>
              <span className="text-xs text-slate-400">{activeSetting.name}</span>
              <StatusBadge status={activeStatus} />
            </div>
          )}
          <button
            onClick={openNewForm}
            className="btn-monitor flex items-center gap-1.5"
            style={{ fontSize: 12, padding: '5px 12px' }}
          >
            <Plus size={14} /> New Config
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div
          className="flex flex-col flex-shrink-0 overflow-y-auto"
          style={{ width: 420, background: '#0e1726', borderRight: '1px solid var(--border-subtle)' }}
        >
          {/* Method picker grid */}
          <div className="px-3 pt-3 pb-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Protocol</div>
            <div className="grid grid-cols-3 gap-1.5">
              {METHODS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => { setSelectedMethod(m.key); if (!showForm) openNewForm(); }}
                  className="flex flex-col items-center gap-1 py-2.5 transition-all"
                  style={{
                    background: selectedMethod === m.key && showForm ? `${m.color}15` : '#0a1020',
                    border: `1px solid ${selectedMethod === m.key && showForm ? m.color : 'var(--border-subtle)'}`,
                    borderRadius: 4,
                    cursor: 'pointer',
                    color: selectedMethod === m.key && showForm ? m.color : '#64748b',
                  }}
                >
                  {m.icon}
                  <span style={{ fontSize: 9, fontWeight: 600 }}>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* New / Edit config form */}
          {showForm && (
            <div className="px-3 pb-3">
              <div
                className="flex items-center justify-between px-2.5 py-1.5 mb-2"
                style={{ background: '#0a1020', borderBottom: '1px solid var(--border-subtle)', borderRadius: 3 }}
              >
                <span className="text-xs font-semibold text-slate-200">
                  {editingId ? 'Edit Config' : `New ${METHOD_LABELS[selectedMethod]} Config`}
                </span>
                <button onClick={closeForm} className="text-slate-500 hover:text-slate-300"><X size={14} /></button>
              </div>

              {/* Config name */}
              <div className="mb-2">
                <label className="text-xs text-slate-500 mb-1 block">Config Name</label>
                <input
                  type="text"
                  placeholder="e.g. Pump-1 USB"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs"
                  style={inputStyle}
                />
              </div>

              {/* Machine selector */}
              <div className="mb-2">
                <label className="text-xs text-slate-500 mb-1 block">Machine</label>
                <select
                  value={formMachineId}
                  onChange={(e) => setFormMachineId(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs"
                  style={inputStyle}
                >
                  <option value="">— No machine —</option>
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              {/* Method-specific fields */}
              <MethodFormFields
                method={selectedMethod}
                config={config}
                setConfig={setConfig}
                availablePorts={availablePorts}
                refreshPorts={refreshPorts}
              />

              {/* Save / Cancel */}
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-monitor flex items-center gap-1 flex-1 justify-center"
                  style={{ fontSize: 11, padding: '6px 12px', opacity: saving ? 0.5 : 1 }}
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  {editingId ? 'Update' : 'Save'}
                </button>
                <button onClick={closeForm} className="btn-secondary" style={{ fontSize: 11, padding: '6px 12px' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Saved configs list */}
          <div className="px-3 pb-3 flex-1">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 mt-2">
              Saved Configs ({settings.length})
            </div>
            {settings.length === 0 ? (
              <div className="text-center text-xs text-slate-600 py-6">
                No saved configurations.<br />Select a protocol above to create one.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {settings.map((s) => {
                  const isActive = activeSetting?.id === s.id;
                  return (
                    <div
                      key={s.id}
                      className="panel"
                      style={{
                        borderRadius: 4,
                        borderLeft: isActive ? `2px solid ${methodColor(s.method)}` : '1px solid var(--border-subtle)',
                      }}
                    >
                      {/* Config header */}
                      <div className="flex items-center justify-between px-2.5 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <div className="flex items-center gap-2 min-w-0">
                          <span style={{ color: methodColor(s.method), flexShrink: 0 }}>{methodIcon(s.method)}</span>
                          <span className="text-xs font-semibold text-slate-200 truncate">{s.name}</span>
                        </div>
                        <StatusBadge status={isActive ? activeStatus : s.status} />
                      </div>

                      {/* Config summary */}
                      <div className="px-2.5 py-1.5 text-xs text-slate-500" style={{ background: '#080d14' }}>
                        <ConfigSummary setting={s} />
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 px-2.5 py-1.5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                        {isActive && (activeStatus === 'connected' || activeStatus === 'connecting') ? (
                          <button
                            onClick={handleDisconnect}
                            className="flex items-center gap-1 text-xs px-2 py-1"
                            style={{ background: '#3b1a1a', border: '1px solid #ef4444', color: '#f87171', borderRadius: 3, cursor: 'pointer' }}
                          >
                            <Square size={11} /> Disconnect
                          </button>
                        ) : (
                          <button
                            onClick={() => handleConnect(s.id)}
                            disabled={connecting === s.id}
                            className="flex items-center gap-1 text-xs px-2 py-1"
                            style={{ background: 'linear-gradient(180deg,#1a4a1a 0%,#0f2e0f 100%)', border: '1px solid #22c55e', color: '#22c55e', borderRadius: 3, cursor: 'pointer', opacity: connecting === s.id ? 0.5 : 1 }}
                          >
                            {connecting === s.id ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
                            Connect
                          </button>
                        )}
                        <button
                          onClick={() => openEditForm(s)}
                          className="toolbar-icon-btn"
                          title="Edit"
                          style={{ width: 26, height: 22 }}
                        >
                          <SettingsIcon size={11} />
                        </button>
                        <div className="flex-1" />
                        <button
                          onClick={() => handleDelete(s.id, s.name)}
                          disabled={deleting === s.id}
                          className="toolbar-icon-btn"
                          title="Delete"
                          style={{ width: 26, height: 22, color: '#f87171' }}
                        >
                          {deleting === s.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right panel — live data viewer */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <div
            className="flex items-center justify-between px-3 py-1.5 flex-shrink-0"
            style={{ background: 'linear-gradient(180deg,#151f33 0%,#0f1726 100%)', borderBottom: '1px solid var(--border-subtle)' }}
          >
            <div className="flex items-center gap-1.5">
              <Activity size={13} style={{ color: 'var(--accent-cyan)' }} />
              <span className="text-xs font-semibold text-slate-200">Live Data Viewer</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">{incomingData.length} packets</span>
              <button
                onClick={clearBuffer}
                disabled={incomingData.length === 0}
                className="btn-secondary flex items-center gap-1"
                style={{ fontSize: 10, padding: '3px 8px', opacity: incomingData.length === 0 ? 0.4 : 1 }}
              >
                <RefreshCw size={11} /> Clear
              </button>
            </div>
          </div>

          {/* Split: packet list + JSON viewer */}
          <div className="flex flex-1 overflow-hidden">
            {/* Packet list */}
            <div className="flex flex-col flex-1 overflow-hidden" style={{ borderRight: '1px solid var(--border-subtle)' }}>
              {incomingData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-600 text-xs">
                  No data received. Connect a config to start receiving packets.
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  <div
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide flex-shrink-0"
                    style={{ background: '#0a1020', borderBottom: '1px solid var(--border-subtle)', position: 'sticky', top: 0 }}
                  >
                    <span style={{ width: 50 }}>#</span>
                    <span style={{ width: 70 }}>Source</span>
                    <span style={{ width: 90 }}>Timestamp</span>
                    <span style={{ flex: 1 }}>Preview</span>
                  </div>
                  {incomingData.map((pkt, i) => {
                    const isSelected = selectedPacket === i;
                    const preview = JSON.stringify(pkt.raw).slice(0, 60);
                    return (
                      <div
                        key={i}
                        onClick={() => setSelectedPacket(i)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer"
                        style={{
                          borderBottom: '1px solid #0d1525',
                          background: isSelected ? '#1a2540' : 'transparent',
                        }}
                      >
                        <span style={{ width: 50, color: '#64748b', fontFamily: 'monospace' }}>{i + 1}</span>
                        <span style={{ width: 70 }}>
                          <span style={{ color: methodColor(pkt.source), fontSize: 10, fontWeight: 600 }}>
                            {METHOD_LABELS[pkt.source]}
                          </span>
                        </span>
                        <span style={{ width: 90, color: '#64748b', fontFamily: 'monospace', fontSize: 10 }}>
                          {new Date(pkt.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                        </span>
                        <span style={{ flex: 1, color: '#94a3b8', fontFamily: 'monospace', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {preview}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* JSON viewer */}
            <div className="flex flex-col" style={{ width: 380, flexShrink: 0, background: '#080d14' }}>
              <div
                className="flex items-center justify-between px-3 py-1.5 flex-shrink-0"
                style={{ background: '#0a1020', borderBottom: '1px solid var(--border-subtle)' }}
              >
                <span className="text-xs font-semibold text-slate-400 uppercase">JSON Viewer</span>
                <ChevronDown size={12} style={{ color: '#64748b' }} />
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {packet ? (
                  <div>
                    {/* Parsed values */}
                    {packet.parsed && (
                      <div className="mb-3">
                        <div className="text-xs text-slate-500 uppercase mb-1.5">Parsed Values</div>
                        <div className="flex flex-col gap-1">
                          {Object.entries(packet.parsed).filter(([, v]) => v != null).map(([k, v]) => (
                            <div key={k} className="flex items-center justify-between px-2 py-1" style={{ background: '#0a1020', borderRadius: 2 }}>
                              <span className="text-xs text-slate-400">{k}</span>
                              <span className="text-xs font-mono" style={{ color: '#22d3ee' }}>
                                {typeof v === 'number' ? v.toFixed(2) : String(v)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Raw JSON */}
                    <div>
                      <div className="text-xs text-slate-500 uppercase mb-1.5">Raw Data</div>
                      <pre
                        className="text-xs font-mono p-2 overflow-x-auto"
                        style={{
                          background: '#060b14',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 3,
                          color: '#94a3b8',
                          fontSize: 10,
                          lineHeight: 1.5,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all',
                        }}
                      >
                        {JSON.stringify(packet.raw, null, 2)}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-600 text-xs">
                    Select a packet to view details
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- input style constant ---------- */

const inputStyle: React.CSSProperties = {
  background: '#060b14',
  border: '1px solid var(--border-subtle)',
  color: 'var(--text-primary)',
  borderRadius: 3,
  outline: 'none',
};

/* ---------- default config per method ---------- */

function getDefaultConfig(method: CommMethod): CommConfig {
  switch (method) {
    case 'usb_serial':
      return { port: '', baudRate: 115200, autoReconnect: false };
    case 'wifi':
      return { ipAddress: '', wifiPort: 80, autoReconnect: false };
    case 'mqtt':
      return { broker: '', mqttPort: 1883, username: '', password: '', topic: '', ssl: false, autoReconnect: true };
    case 'modbus_tcp':
      return { ipAddress: '', wifiPort: 502, slaveId: 1, registerMap: [], autoReconnect: true };
    case 'opcua':
      return { serverUrl: '', nodeId: '', autoReconnect: true };
    case 'rest_api':
      return { endpointUrl: '', apiKey: '', authType: 'none', pollInterval: 5000 };
    default:
      return {};
  }
}

/* ---------- config summary ---------- */

function ConfigSummary({ setting }: { setting: CommSetting }) {
  const c = setting.config;
  switch (setting.method) {
    case 'usb_serial':
      return <span>{c.port || 'No port'} · {c.baudRate ?? 115200} baud</span>;
    case 'wifi':
      return <span>{c.ipAddress || 'No IP'}:{c.wifiPort ?? 80}</span>;
    case 'mqtt':
      return <span>{c.broker || 'No broker'}:{c.mqttPort ?? 1883} · {c.topic || 'no topic'}</span>;
    case 'modbus_tcp':
      return <span>{c.ipAddress || 'No IP'}:{c.wifiPort ?? 502} · Slave {c.slaveId ?? 1} · {(c.registerMap?.length ?? 0)} regs</span>;
    case 'opcua':
      return <span className="truncate">{c.serverUrl || 'No URL'} · {c.nodeId || 'no node'}</span>;
    case 'rest_api':
      return <span className="truncate">{c.endpointUrl || 'No endpoint'} · {c.authType ?? 'none'} · {(c.pollInterval ?? 5000) / 1000}s</span>;
    default:
      return <span>—</span>;
  }
}

/* ---------- method-specific form fields ---------- */

function MethodFormFields({
  method, config, setConfig, availablePorts, refreshPorts,
}: {
  method: CommMethod;
  config: CommConfig;
  setConfig: React.Dispatch<React.SetStateAction<CommConfig>>;
  availablePorts: string[];
  refreshPorts: () => void;
}) {
  function update(patch: Partial<CommConfig>) {
    setConfig((prev) => ({ ...prev, ...patch }));
  }

  switch (method) {
    /* ----- USB Serial ----- */
    case 'usb_serial':
      return (
        <>
          <div className="mb-2">
            <label className="text-xs text-slate-500 mb-1 block">COM Port</label>
            <div className="flex gap-1.5">
              <select
                value={config.port ?? ''}
                onChange={(e) => update({ port: e.target.value })}
                className="flex-1 px-2 py-1.5 text-xs"
                style={inputStyle}
              >
                <option value="">— Select port —</option>
                {availablePorts.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <button
                onClick={refreshPorts}
                className="btn-secondary flex items-center gap-1"
                style={{ fontSize: 10, padding: '4px 8px' }}
                title="Refresh ports"
              >
                <RefreshCw size={12} />
              </button>
            </div>
          </div>
          <div className="mb-2">
            <label className="text-xs text-slate-500 mb-1 block">Baud Rate</label>
            <select
              value={config.baudRate ?? 115200}
              onChange={(e) => update({ baudRate: parseInt(e.target.value, 10) })}
              className="w-full px-2 py-1.5 text-xs"
              style={inputStyle}
            >
              {BAUD_RATES.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={config.autoReconnect ?? false}
              onChange={(e) => update({ autoReconnect: e.target.checked })}
            />
            Auto Reconnect
          </label>
        </>
      );

    /* ----- Wi-Fi ----- */
    case 'wifi':
      return (
        <>
          <div className="mb-2">
            <label className="text-xs text-slate-500 mb-1 block">IP Address</label>
            <input
              type="text"
              placeholder="192.168.1.100"
              value={config.ipAddress ?? ''}
              onChange={(e) => update({ ipAddress: e.target.value })}
              className="w-full px-2 py-1.5 text-xs"
              style={inputStyle}
            />
          </div>
          <div className="mb-2">
            <label className="text-xs text-slate-500 mb-1 block">Port</label>
            <input
              type="number"
              placeholder="80"
              value={config.wifiPort ?? 80}
              onChange={(e) => update({ wifiPort: parseInt(e.target.value, 10) })}
              className="w-full px-2 py-1.5 text-xs"
              style={inputStyle}
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={config.autoReconnect ?? false}
              onChange={(e) => update({ autoReconnect: e.target.checked })}
            />
            Auto Reconnect
          </label>
        </>
      );

    /* ----- MQTT ----- */
    case 'mqtt':
      return (
        <>
          <div className="mb-2">
            <label className="text-xs text-slate-500 mb-1 block">Broker</label>
            <input
              type="text"
              placeholder="broker.hivemq.com"
              value={config.broker ?? ''}
              onChange={(e) => update({ broker: e.target.value })}
              className="w-full px-2 py-1.5 text-xs"
              style={inputStyle}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Port</label>
              <input
                type="number"
                placeholder="1883"
                value={config.mqttPort ?? 1883}
                onChange={(e) => update({ mqttPort: parseInt(e.target.value, 10) })}
                className="w-full px-2 py-1.5 text-xs"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Topic</label>
              <input
                type="text"
                placeholder="sensor/data"
                value={config.topic ?? ''}
                onChange={(e) => update({ topic: e.target.value })}
                className="w-full px-2 py-1.5 text-xs"
                style={inputStyle}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Username</label>
              <input
                type="text"
                value={config.username ?? ''}
                onChange={(e) => update({ username: e.target.value })}
                className="w-full px-2 py-1.5 text-xs"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Password</label>
              <input
                type="password"
                value={config.password ?? ''}
                onChange={(e) => update({ password: e.target.value })}
                className="w-full px-2 py-1.5 text-xs"
                style={inputStyle}
              />
            </div>
          </div>
          <div className="flex items-center gap-4 mb-2">
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={config.ssl ?? false}
                onChange={(e) => update({ ssl: e.target.checked })}
              />
              SSL/TLS
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={config.autoReconnect ?? false}
                onChange={(e) => update({ autoReconnect: e.target.checked })}
              />
              Auto Reconnect
            </label>
          </div>
        </>
      );

    /* ----- Modbus TCP ----- */
    case 'modbus_tcp':
      return (
        <>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">IP Address</label>
              <input
                type="text"
                placeholder="192.168.1.50"
                value={config.ipAddress ?? ''}
                onChange={(e) => update({ ipAddress: e.target.value })}
                className="w-full px-2 py-1.5 text-xs"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Port</label>
              <input
                type="number"
                placeholder="502"
                value={config.wifiPort ?? 502}
                onChange={(e) => update({ wifiPort: parseInt(e.target.value, 10) })}
                className="w-full px-2 py-1.5 text-xs"
                style={inputStyle}
              />
            </div>
          </div>
          <div className="mb-2">
            <label className="text-xs text-slate-500 mb-1 block">Slave ID</label>
            <input
              type="number"
              min={1}
              max={247}
              placeholder="1"
              value={config.slaveId ?? 1}
              onChange={(e) => update({ slaveId: parseInt(e.target.value, 10) })}
              className="w-full px-2 py-1.5 text-xs"
              style={inputStyle}
            />
          </div>
          {/* Register map grid */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-slate-500">Register Map</label>
              <button
                onClick={() => update({ registerMap: [...(config.registerMap ?? []), { address: 0, name: '', type: 'uint16' }] })}
                className="flex items-center gap-1 text-xs px-1.5 py-0.5"
                style={{ background: '#0e1726', border: '1px solid var(--border-subtle)', color: 'var(--accent-cyan)', borderRadius: 2, cursor: 'pointer' }}
              >
                <Plus size={10} /> Add
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {(config.registerMap ?? []).map((reg, i) => (
                <div key={i} className="grid gap-1" style={{ gridTemplateColumns: '60px 1fr 70px 24px' }}>
                  <input
                    type="number"
                    placeholder="Addr"
                    value={reg.address}
                    onChange={(e) => {
                      const map = [...(config.registerMap ?? [])];
                      map[i] = { ...reg, address: parseInt(e.target.value, 10) || 0 };
                      update({ registerMap: map });
                    }}
                    className="px-1.5 py-1 text-xs"
                    style={inputStyle}
                  />
                  <input
                    type="text"
                    placeholder="Name"
                    value={reg.name}
                    onChange={(e) => {
                      const map = [...(config.registerMap ?? [])];
                      map[i] = { ...reg, name: e.target.value };
                      update({ registerMap: map });
                    }}
                    className="px-1.5 py-1 text-xs"
                    style={inputStyle}
                  />
                  <select
                    value={reg.type}
                    onChange={(e) => {
                      const map = [...(config.registerMap ?? [])];
                      map[i] = { ...reg, type: e.target.value };
                      update({ registerMap: map });
                    }}
                    className="px-1.5 py-1 text-xs"
                    style={inputStyle}
                  >
                    <option value="uint16">uint16</option>
                    <option value="int16">int16</option>
                    <option value="uint32">uint32</option>
                    <option value="float32">float32</option>
                  </select>
                  <button
                    onClick={() => {
                      const map = (config.registerMap ?? []).filter((_, j) => j !== i);
                      update({ registerMap: map });
                    }}
                    className="toolbar-icon-btn"
                    style={{ width: 24, height: 24, color: '#f87171' }}
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={config.autoReconnect ?? false}
              onChange={(e) => update({ autoReconnect: e.target.checked })}
            />
            Auto Reconnect
          </label>
        </>
      );

    /* ----- OPC UA ----- */
    case 'opcua':
      return (
        <>
          <div className="mb-2">
            <label className="text-xs text-slate-500 mb-1 block">Server URL</label>
            <input
              type="text"
              placeholder="opc.tcp://localhost:4840"
              value={config.serverUrl ?? ''}
              onChange={(e) => update({ serverUrl: e.target.value })}
              className="w-full px-2 py-1.5 text-xs"
              style={inputStyle}
            />
          </div>
          <div className="mb-2">
            <label className="text-xs text-slate-500 mb-1 block">Node ID</label>
            <input
              type="text"
              placeholder="ns=2;s=Temperature"
              value={config.nodeId ?? ''}
              onChange={(e) => update({ nodeId: e.target.value })}
              className="w-full px-2 py-1.5 text-xs"
              style={inputStyle}
            />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <button className="btn-secondary flex items-center gap-1" style={{ fontSize: 10, padding: '4px 10px' }}>
              <Search size={11} /> Browse
            </button>
            <button className="btn-secondary flex items-center gap-1" style={{ fontSize: 10, padding: '4px 10px' }}>
              <Activity size={11} /> Subscribe
            </button>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={config.autoReconnect ?? false}
              onChange={(e) => update({ autoReconnect: e.target.checked })}
            />
            Auto Reconnect
          </label>
        </>
      );

    /* ----- REST API ----- */
    case 'rest_api':
      return (
        <>
          <div className="mb-2">
            <label className="text-xs text-slate-500 mb-1 block">Endpoint URL</label>
            <input
              type="text"
              placeholder="https://api.example.com/sensor"
              value={config.endpointUrl ?? ''}
              onChange={(e) => update({ endpointUrl: e.target.value })}
              className="w-full px-2 py-1.5 text-xs"
              style={inputStyle}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Auth Type</label>
              <select
                value={config.authType ?? 'none'}
                onChange={(e) => update({ authType: e.target.value as CommConfig['authType'] })}
                className="w-full px-2 py-1.5 text-xs"
                style={inputStyle}
              >
                <option value="none">None</option>
                <option value="bearer">Bearer Token</option>
                <option value="apikey">API Key</option>
                <option value="basic">Basic Auth</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Poll Interval (ms)</label>
              <input
                type="number"
                placeholder="5000"
                value={config.pollInterval ?? 5000}
                onChange={(e) => update({ pollInterval: parseInt(e.target.value, 10) })}
                className="w-full px-2 py-1.5 text-xs"
                style={inputStyle}
              />
            </div>
          </div>
          {config.authType && config.authType !== 'none' && (
            <div className="mb-2">
              <label className="text-xs text-slate-500 mb-1 block">
                {config.authType === 'bearer' ? 'Bearer Token' : config.authType === 'apikey' ? 'API Key' : 'Credentials'}
              </label>
              <input
                type="password"
                placeholder={config.authType === 'bearer' ? 'Token...' : 'Key...'}
                value={config.apiKey ?? ''}
                onChange={(e) => update({ apiKey: e.target.value })}
                className="w-full px-2 py-1.5 text-xs"
                style={inputStyle}
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <button className="btn-secondary flex items-center gap-1" style={{ fontSize: 10, padding: '4px 10px' }}>
              <Play size={11} /> GET
            </button>
            <button className="btn-secondary flex items-center gap-1" style={{ fontSize: 10, padding: '4px 10px' }}>
              <Activity size={11} /> POST
            </button>
          </div>
        </>
      );

    default:
      return null;
  }
}

export default CommunicationPage;
