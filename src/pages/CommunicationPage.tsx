import { useState, useMemo, FormEvent } from 'react';
import {
  Radio, Usb, Wifi, Globe, Network, Server, RefreshCw, Plus, Trash2, Edit2,
  Play, Square, Check, AlertTriangle, AlertCircle, Loader2, ChevronDown,
  Database, Activity, X, Save, Eye,
} from 'lucide-react';
import { useCommunication } from '../contexts/CommunicationContext';
import type { CommMethod, CommConfig, CommSetting, ConnStatus } from '../contexts/CommunicationContext';
import { useMonitoring } from '../contexts/MonitoringContext';
import { useToast } from '../components/Toast';

/* ----------------------------- helpers ----------------------------- */

const methodMeta: Record<CommMethod, { label: string; sub: string; Icon: typeof Radio; color: string }> = {
  usb_serial: { label: 'USB Serial', sub: 'ESP32/Arduino', Icon: Usb, color: '#3b82f6' },
  wifi: { label: 'Wi-Fi', sub: 'TCP / WebSocket', Icon: Wifi, color: '#06b6d4' },
  mqtt: { label: 'MQTT', sub: 'Pub/Sub broker', Icon: Radio, color: '#8b5cf6' },
  rest_api: { label: 'REST API', sub: 'HTTP polling', Icon: Globe, color: '#22c55e' },
  modbus_tcp: { label: 'Modbus TCP', sub: 'Industrial bus', Icon: Network, color: '#f97316' },
  opcua: { label: 'OPC UA', sub: 'Process control', Icon: Server, color: '#eab308' },
};

const methodOrder: CommMethod[] = ['usb_serial', 'wifi', 'mqtt', 'rest_api', 'modbus_tcp', 'opcua'];

const statusConfig: Record<ConnStatus, { color: string; label: string; Icon: typeof Check | null }> = {
  connected: { color: '#22c55e', label: 'Connected', Icon: Check },
  connecting: { color: '#eab308', label: 'Connecting', Icon: Loader2 },
  disconnected: { color: '#64748b', label: 'Disconnected', Icon: null },
  error: { color: '#ef4444', label: 'Error', Icon: AlertCircle },
};

const baudRates = [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600];
const authTypes: { key: CommConfig['authType']; label: string }[] = [
  { key: 'none', label: 'None' },
  { key: 'bearer', label: 'Bearer Token' },
  { key: 'apikey', label: 'API Key' },
  { key: 'basic', label: 'Basic Auth' },
];

function fmtTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function statusOf(setting: CommSetting, activeId: string | null, activeStatus: ConnStatus): ConnStatus {
  if (activeId && setting.id === activeId) return activeStatus;
  return setting.status ?? 'disconnected';
}

function configSummary(method: CommMethod, c: CommConfig): string {
  switch (method) {
    case 'usb_serial': return `${c.port ?? 'COM?'} @ ${c.baudRate ?? 115200} baud`;
    case 'wifi': return `${c.ipAddress ?? '—'}:${c.wifiPort ?? 80}`;
    case 'mqtt': return `${c.broker ?? '—'}:${c.mqttPort ?? 1883} · ${c.topic ?? 'veltrix/data'}`;
    case 'rest_api': return `${c.endpointUrl ?? '—'}`;
    case 'modbus_tcp': return `${c.ipAddress ?? '—'}:${c.wifiPort ?? 502} · slave ${c.slaveId ?? 1}`;
    case 'opcua': return `${c.serverUrl ?? '—'}`;
    default: return '';
  }
}

const emptyConfig: CommConfig = {
  port: '', baudRate: 115200, autoReconnect: true,
  ipAddress: '', wifiPort: 80,
  broker: '', mqttPort: 1883, username: '', password: '', topic: 'veltrix/data', ssl: false,
  endpointUrl: '', authType: 'none', apiKey: '', pollInterval: 2,
  slaveId: 1, registerMap: [{ address: 40001, name: 'temperature', type: 'float' }],
  serverUrl: 'opc.tcp://', nodeId: 'ns=2;s=Temperature',
};

interface Props {}

/**
 * Full industrial communication manager. Supports six protocols (USB Serial,
 * Wi-Fi, MQTT, REST API, Modbus TCP, OPC UA): a method picker, per-method
 * configuration form, saved-configs list with connect/disconnect/edit/delete,
 * and a live data viewer with packet list + JSON inspector.
 */
export function CommunicationPage(_: Props) {
  const {
    settings, activeSetting, activeStatus, incomingData, saveSetting, updateSetting,
    deleteSetting, connect, disconnect, refreshSettings, clearBuffer, availablePorts, refreshPorts,
  } = useCommunication();
  const { machines } = useMonitoring();
  const { toast } = useToast();

  const [selectedMethod, setSelectedMethod] = useState<CommMethod | null>(null);
  const [config, setConfig] = useState<CommConfig>(emptyConfig);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedPacket, setSelectedPacket] = useState<number | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  function selectMethod(method: CommMethod) {
    setSelectedMethod(method);
    setConfig({ ...emptyConfig });
    setEditingId(null);
  }

  function startEdit(s: CommSetting) {
    setSelectedMethod(s.method);
    setConfig({ ...emptyConfig, ...s.config });
    setEditingId(s.id);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!selectedMethod) return;
    if (selectedMethod === 'usb_serial' && !config.port) { toast('Select a COM port', 'error'); return; }
    if ((selectedMethod === 'wifi' || selectedMethod === 'modbus_tcp') && !config.ipAddress) { toast('IP address required', 'error'); return; }
    if (selectedMethod === 'mqtt' && !config.broker) { toast('Broker required', 'error'); return; }
    if (selectedMethod === 'rest_api' && !config.endpointUrl) { toast('Endpoint URL required', 'error'); return; }
    if (selectedMethod === 'opcua' && !config.serverUrl) { toast('Server URL required', 'error'); return; }

    setSaving(true);
    const name = `${methodMeta[selectedMethod].label} ${config.machineId ? machines.find((m) => m.id === config.machineId)?.name ?? '' : ''}`.trim();
    try {
      if (editingId) {
        await updateSetting(editingId, { name, config });
        toast('Configuration updated', 'success');
      } else {
        await saveSetting(selectedMethod, name, config);
        toast('Configuration saved', 'success');
      }
      setConfig({ ...emptyConfig });
      setEditingId(null);
      setSelectedMethod(null);
    } catch (err) {
      toast('Save failed', 'error');
    }
    setSaving(false);
  }

  async function handleConnect(id: string) {
    setConnectingId(id);
    try {
      await connect(id);
      toast('Connecting…', 'info');
    } catch {
      toast('Connection failed', 'error');
    }
    setConnectingId(null);
  }

  async function handleDelete(id: string) {
    await deleteSetting(id);
    toast('Configuration deleted', 'success');
  }

  const packetCount = incomingData.length;
  const selPacket = selectedPacket != null ? incomingData[selectedPacket] : null;

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#080d14', border: '1px solid #1e2d45', color: '#e2e8f0', fontSize: 11, padding: '6px 9px', outline: 'none',
  };
  const labelStyle: React.CSSProperties = { fontSize: 10, color: '#64748b', letterSpacing: '0.3px', marginBottom: 2 };

  return (
    <div className="flex flex-col h-full" style={{ background: '#0b0f1a' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid #1e2d45', background: 'linear-gradient(180deg,#0d1525 0%,#080d14 100%)' }}>
        <Radio size={18} className="text-blue-400" />
        <span className="text-sm font-bold text-slate-100 tracking-wide">COMMUNICATION MANAGER</span>
        {/* Active status badge */}
        {activeSetting ? (
          <span className="flex items-center gap-1.5 px-2 py-1" style={{ background: `${statusConfig[activeStatus].color}1a`, border: `1px solid ${statusConfig[activeStatus].color}40` }}>
            <span className={`flex-shrink-0 ${activeStatus === 'connected' ? 'status-dot-active' : activeStatus === 'connecting' ? 'animate-spin' : ''}`} style={{ width: 7, height: 7, borderRadius: '50%', background: statusConfig[activeStatus].color }} />
            <span className="text-[10px] font-semibold tracking-wide" style={{ color: statusConfig[activeStatus].color }}>
              {methodMeta[activeSetting.method].label} — {statusConfig[activeStatus].label}
            </span>
          </span>
        ) : (
          <span className="flex items-center gap-1.5 px-2 py-1" style={{ background: 'rgba(100,116,139,0.12)', border: '1px solid rgba(100,116,139,0.4)' }}>
            <span className="flex-shrink-0" style={{ width: 7, height: 7, borderRadius: '50%', background: '#64748b' }} />
            <span className="text-[10px] font-semibold tracking-wide text-slate-400">No active connection</span>
          </span>
        )}
        <button className="btn-secondary flex items-center gap-1.5 ml-auto" style={{ height: 28 }} onClick={refreshSettings}>
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden flex gap-0">
        {/* Left panel: picker + form + saved configs */}
        <div className="flex flex-col flex-shrink-0 overflow-y-auto" style={{ width: 420, borderRight: '1px solid #1e2d45', background: '#0e1420' }}>
          {/* Protocol picker */}
          <div className="p-3" style={{ borderBottom: '1px solid #1e2d45' }}>
            <div className="flex items-center gap-1.5 mb-2">
              <Activity size={12} className="text-blue-400" />
              <span className="text-[11px] font-semibold text-slate-200 tracking-wide">SELECT PROTOCOL</span>
            </div>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {methodOrder.map((method) => {
                const meta = methodMeta[method];
                const active = selectedMethod === method;
                return (
                  <button
                    key={method}
                    onClick={() => selectMethod(method)}
                    className="flex flex-col items-center gap-1 p-2 transition-all"
                    style={{
                      background: active ? `${meta.color}1a` : '#0e1726',
                      border: active ? `1px solid ${meta.color}` : '1px solid #1e2d45',
                      cursor: 'pointer',
                    }}
                  >
                    <meta.Icon size={18} style={{ color: active ? meta.color : '#94a3b8' }} />
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] font-semibold text-slate-200 leading-tight">{meta.label}</span>
                      <span className="text-[7px] text-slate-500 leading-tight">{meta.sub}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Config form */}
          {selectedMethod && (
            <form onSubmit={handleSave} className="p-3 flex flex-col gap-2.5" style={{ borderBottom: '1px solid #1e2d45' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {(() => { const M = methodMeta[selectedMethod]; return <><M.Icon size={13} style={{ color: M.color }} /><span className="text-[11px] font-semibold text-slate-200 tracking-wide">{M.label.toUpperCase()} CONFIG</span></>; })()}
                </div>
                {editingId && (
                  <span className="px-1.5 py-0.5 text-[8px] text-yellow-400" style={{ background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.3)' }}>EDITING</span>
                )}
              </div>

              {/* USB Serial */}
              {selectedMethod === 'usb_serial' && (
                <>
                  <div>
                    <label style={labelStyle}>COM PORT</label>
                    <div className="flex gap-1.5">
                      <select value={config.port} onChange={(e) => setConfig((p) => ({ ...p, port: e.target.value }))} style={inputStyle}>
                        <option value="">Select port…</option>
                        {availablePorts.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <button type="button" className="btn-secondary flex items-center justify-center" style={{ width: 32, height: 28, flexShrink: 0 }} onClick={refreshPorts} title="Refresh ports">
                        <RefreshCw size={12} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>BAUD RATE</label>
                    <select value={config.baudRate} onChange={(e) => setConfig((p) => ({ ...p, baudRate: parseInt(e.target.value, 10) }))} style={inputStyle}>
                      {baudRates.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </>
              )}

              {/* Wi-Fi */}
              {selectedMethod === 'wifi' && (
                <>
                  <div>
                    <label style={labelStyle}>IP ADDRESS</label>
                    <input type="text" placeholder="192.168.1.100" value={config.ipAddress ?? ''} onChange={(e) => setConfig((p) => ({ ...p, ipAddress: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>PORT</label>
                    <input type="number" placeholder="80" value={config.wifiPort ?? 80} onChange={(e) => setConfig((p) => ({ ...p, wifiPort: parseInt(e.target.value, 10) || 80 }))} style={inputStyle} />
                  </div>
                </>
              )}

              {/* MQTT */}
              {selectedMethod === 'mqtt' && (
                <>
                  <div>
                    <label style={labelStyle}>BROKER</label>
                    <input type="text" placeholder="broker.hivemq.com" value={config.broker ?? ''} onChange={(e) => setConfig((p) => ({ ...p, broker: e.target.value }))} style={inputStyle} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label style={labelStyle}>PORT</label>
                      <input type="number" placeholder="1883" value={config.mqttPort ?? 1883} onChange={(e) => setConfig((p) => ({ ...p, mqttPort: parseInt(e.target.value, 10) || 1883 }))} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>TOPIC</label>
                      <input type="text" placeholder="veltrix/data" value={config.topic ?? ''} onChange={(e) => setConfig((p) => ({ ...p, topic: e.target.value }))} style={inputStyle} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label style={labelStyle}>USERNAME</label>
                      <input type="text" value={config.username ?? ''} onChange={(e) => setConfig((p) => ({ ...p, username: e.target.value }))} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>PASSWORD</label>
                      <input type="password" value={config.password ?? ''} onChange={(e) => setConfig((p) => ({ ...p, password: e.target.value }))} style={inputStyle} />
                    </div>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300">
                    <input type="checkbox" checked={config.ssl ?? false} onChange={(e) => setConfig((p) => ({ ...p, ssl: e.target.checked }))} /> SSL / TLS
                  </label>
                </>
              )}

              {/* REST API */}
              {selectedMethod === 'rest_api' && (
                <>
                  <div>
                    <label style={labelStyle}>ENDPOINT URL</label>
                    <input type="text" placeholder="https://api.example.com/data" value={config.endpointUrl ?? ''} onChange={(e) => setConfig((p) => ({ ...p, endpointUrl: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>AUTH TYPE</label>
                    <select value={config.authType ?? 'none'} onChange={(e) => setConfig((p) => ({ ...p, authType: e.target.value as CommConfig['authType'] }))} style={inputStyle}>
                      {authTypes.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
                    </select>
                  </div>
                  {config.authType && config.authType !== 'none' && (
                    <div>
                      <label style={labelStyle}>{config.authType === 'bearer' ? 'BEARER TOKEN' : config.authType === 'apikey' ? 'API KEY' : 'PASSWORD'}</label>
                      <input type={config.authType === 'basic' ? 'password' : 'text'} value={config.apiKey ?? ''} onChange={(e) => setConfig((p) => ({ ...p, apiKey: e.target.value }))} style={inputStyle} />
                    </div>
                  )}
                  <div>
                    <label style={labelStyle}>POLL INTERVAL (seconds)</label>
                    <input type="number" min={1} placeholder="2" value={config.pollInterval ?? 2} onChange={(e) => setConfig((p) => ({ ...p, pollInterval: parseInt(e.target.value, 10) || 2 }))} style={inputStyle} />
                  </div>
                </>
              )}

              {/* Modbus TCP */}
              {selectedMethod === 'modbus_tcp' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label style={labelStyle}>IP ADDRESS</label>
                      <input type="text" placeholder="192.168.1.50" value={config.ipAddress ?? ''} onChange={(e) => setConfig((p) => ({ ...p, ipAddress: e.target.value }))} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>PORT</label>
                      <input type="number" placeholder="502" value={config.wifiPort ?? 502} onChange={(e) => setConfig((p) => ({ ...p, wifiPort: parseInt(e.target.value, 10) || 502 }))} style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>SLAVE ID</label>
                    <input type="number" min={1} placeholder="1" value={config.slaveId ?? 1} onChange={(e) => setConfig((p) => ({ ...p, slaveId: parseInt(e.target.value, 10) || 1 }))} style={inputStyle} />
                  </div>
                  {/* Register mapping */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label style={{ ...labelStyle, marginBottom: 0 }}>REGISTER MAPPING</label>
                      <button type="button" className="btn-secondary flex items-center gap-1" style={{ height: 20, padding: '0 6px', fontSize: 9 }} onClick={() => setConfig((p) => ({ ...p, registerMap: [...(p.registerMap ?? []), { address: 40001, name: '', type: 'float' }] }))}>
                        <Plus size={10} /> Add Row
                      </button>
                    </div>
                    <div className="flex flex-col gap-1" style={{ maxHeight: 140, overflowY: 'auto' }}>
                      {(config.registerMap ?? []).map((reg, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <input type="number" placeholder="Addr" value={reg.address} onChange={(e) => setConfig((p) => { const map = [...(p.registerMap ?? [])]; map[i] = { ...map[i], address: parseInt(e.target.value, 10) || 0 }; return { ...p, registerMap: map }; })} style={{ ...inputStyle, width: 60, flexShrink: 0 }} />
                          <input type="text" placeholder="name" value={reg.name} onChange={(e) => setConfig((p) => { const map = [...(p.registerMap ?? [])]; map[i] = { ...map[i], name: e.target.value }; return { ...p, registerMap: map }; })} style={inputStyle} />
                          <select value={reg.type} onChange={(e) => setConfig((p) => { const map = [...(p.registerMap ?? [])]; map[i] = { ...map[i], type: e.target.value }; return { ...p, registerMap: map }; })} style={{ ...inputStyle, width: 64, flexShrink: 0 }}>
                            <option value="float">float</option>
                            <option value="int16">int16</option>
                            <option value="int32">int32</option>
                            <option value="uint16">uint16</option>
                            <option value="bool">bool</option>
                          </select>
                          <button type="button" className="text-slate-500 hover:text-red-400 flex-shrink-0" onClick={() => setConfig((p) => ({ ...p, registerMap: (p.registerMap ?? []).filter((_, idx) => idx !== i) }))}>
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* OPC UA */}
              {selectedMethod === 'opcua' && (
                <>
                  <div>
                    <label style={labelStyle}>SERVER URL</label>
                    <input type="text" placeholder="opc.tcp://localhost:4840" value={config.serverUrl ?? ''} onChange={(e) => setConfig((p) => ({ ...p, serverUrl: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>NODE ID</label>
                    <input type="text" placeholder="ns=2;s=Temperature" value={config.nodeId ?? ''} onChange={(e) => setConfig((p) => ({ ...p, nodeId: e.target.value }))} style={inputStyle} />
                  </div>
                </>
              )}

              {/* Common: auto-reconnect + machine selector */}
              {selectedMethod !== 'rest_api' && (
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300">
                  <input type="checkbox" checked={config.autoReconnect ?? false} onChange={(e) => setConfig((p) => ({ ...p, autoReconnect: e.target.checked }))} /> Auto-reconnect
                </label>
              )}
              <div>
                <label style={labelStyle}>ASSIGN TO MACHINE</label>
                <select value={config.machineId ?? ''} onChange={(e) => setConfig((p) => ({ ...p, machineId: e.target.value || undefined }))} style={inputStyle}>
                  <option value="">— None —</option>
                  {machines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>

              {/* Save / cancel */}
              <div className="flex items-center gap-2 pt-1">
                <button type="submit" className="btn-monitor flex items-center justify-center gap-1.5" style={{ height: 30, flex: 1, opacity: saving ? 0.7 : 1 }} disabled={saving}>
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} {editingId ? 'Update' : 'Save Configuration'}
                </button>
                <button type="button" className="btn-secondary flex items-center gap-1" style={{ height: 30 }} onClick={() => { setSelectedMethod(null); setEditingId(null); setConfig({ ...emptyConfig }); }}>
                  <X size={13} /> Cancel
                </button>
              </div>
            </form>
          )}

          {/* Saved configs list */}
          <div className="flex flex-col flex-1">
            <div className="flex items-center gap-1.5 px-3 py-2" style={{ borderBottom: '1px solid #1e2d45' }}>
              <Database size={12} className="text-blue-400" />
              <span className="text-[11px] font-semibold text-slate-200 tracking-wide">SAVED CONFIGURATIONS</span>
              <span className="ml-auto px-1.5 py-0.5 text-[9px] text-slate-400" style={{ background: '#1a2540', border: '1px solid #2a3f60' }}>{settings.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {settings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-3 gap-2">
                  <Database size={24} className="text-slate-600" />
                  <span className="text-[10px] text-slate-500 text-center">No saved configurations.<br />Select a protocol above to create one.</span>
                </div>
              ) : (
                <div className="flex flex-col">
                  {settings.map((s, i) => {
                    const meta = methodMeta[s.method];
                    const st = statusOf(s, activeSetting?.id ?? null, activeStatus);
                    const sc = statusConfig[st];
                    const isActive = activeSetting?.id === s.id;
                    return (
                      <div key={s.id} className="flex flex-col gap-2 px-3 py-2.5" style={{ borderBottom: '1px solid #141e30', background: i % 2 === 0 ? 'transparent' : 'rgba(30,45,69,0.15)' }}>
                        {/* Top row: icon + name + status */}
                        <div className="flex items-center gap-2">
                          <meta.Icon size={14} style={{ color: meta.color }} />
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-[11px] font-semibold text-slate-200 truncate">{s.name}</span>
                            <span className="text-[9px] text-slate-500 truncate">{configSummary(s.method, s.config)}</span>
                          </div>
                          {/* Status badge */}
                          <span className="flex items-center gap-1 px-1.5 py-0.5 flex-shrink-0" style={{ background: `${sc.color}1a`, border: `1px solid ${sc.color}40` }}>
                            <span className={`flex-shrink-0 ${st === 'connected' ? 'status-dot-active' : st === 'connecting' ? 'animate-spin' : ''}`} style={{ width: 6, height: 6, borderRadius: '50%', background: sc.color }} />
                            {sc.Icon && <sc.Icon size={9} style={{ color: sc.color }} />}
                            <span className="text-[8px] font-semibold tracking-wide" style={{ color: sc.color }}>{sc.label.toUpperCase()}</span>
                          </span>
                        </div>
                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5">
                          {isActive && (st === 'connected' || st === 'connecting') ? (
                            <button className="btn-danger flex items-center gap-1" style={{ height: 24, padding: '0 10px', fontSize: 10 }} onClick={disconnect}>
                              <Square size={10} /> Disconnect
                            </button>
                          ) : (
                            <button
                              className="btn-monitor flex items-center gap-1"
                              style={{ height: 24, padding: '0 10px', fontSize: 10, opacity: connectingId === s.id ? 0.7 : 1 }}
                              onClick={() => handleConnect(s.id)}
                              disabled={connectingId === s.id}
                            >
                              {connectingId === s.id ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />} Connect
                            </button>
                          )}
                          <button className="btn-secondary flex items-center gap-1" style={{ height: 24, padding: '0 8px', fontSize: 10 }} onClick={() => startEdit(s)} title="Edit">
                            <Edit2 size={10} /> Edit
                          </button>
                          <button className="btn-secondary flex items-center justify-center" style={{ height: 24, width: 26, fontSize: 10 }} onClick={() => handleDelete(s.id)} title="Delete">
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right panel: live data viewer */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#0b0f1a' }}>
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0" style={{ borderBottom: '1px solid #1e2d45' }}>
            <Activity size={14} className="text-blue-400" />
            <span className="text-xs font-semibold text-slate-200 tracking-wide">LIVE DATA STREAM</span>
            <span className="px-2 py-0.5 text-[10px] font-semibold text-slate-300" style={{ background: '#1a2540', border: '1px solid #2a3f60' }}>
              {packetCount} packets
            </span>
            {activeSetting && (
              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                <span className={`flex-shrink-0 ${activeStatus === 'connected' ? 'status-dot-active' : activeStatus === 'connecting' ? 'animate-spin' : ''}`} style={{ width: 6, height: 6, borderRadius: '50%', background: statusConfig[activeStatus].color }} />
                {methodMeta[activeSetting.method].label}
              </span>
            )}
            <button className="btn-secondary flex items-center gap-1 ml-auto" style={{ height: 26, padding: '0 10px', fontSize: 10 }} onClick={clearBuffer} disabled={packetCount === 0}>
              <Trash2 size={11} /> Clear
            </button>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            {packetCount === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 gap-3">
                <Activity size={36} className="text-slate-600" />
                <span className="text-sm text-slate-500">Waiting for data…</span>
                <span className="text-[10px] text-slate-600">Connect a configuration to start receiving packets.</span>
              </div>
            ) : (
              <div className="flex-1 flex overflow-hidden">
                {/* Packet list */}
                <div className="flex-1 overflow-y-auto" style={{ borderRight: selPacket ? '1px solid #1e2d45' : 'none' }}>
                  {incomingData.map((pkt, i) => {
                    const meta = methodMeta[pkt.source];
                    const p = pkt.parsed;
                    const isSelected = selectedPacket === i;
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedPacket(i)}
                        className="w-full text-left flex items-start gap-2 px-3 py-2 transition-all"
                        style={{
                          borderBottom: '1px solid #141e30',
                          background: isSelected ? 'rgba(59,130,246,0.12)' : i % 2 === 0 ? 'transparent' : 'rgba(30,45,69,0.15)',
                          borderLeft: isSelected ? '2px solid #3b82f6' : '2px solid transparent',
                          cursor: 'pointer',
                        }}
                      >
                        <meta.Icon size={12} style={{ color: meta.color, marginTop: 2, flexShrink: 0 }} />
                        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500">{fmtTime(pkt.timestamp)}</span>
                            <span className="text-[9px] font-semibold tracking-wide" style={{ color: meta.color }}>{meta.label}</span>
                          </div>
                          {/* Parsed values */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {p?.temperature != null && <span className="text-[10px] val-orange font-semibold">{p.temperature.toFixed(1)}°C</span>}
                            {p?.current != null && <span className="text-[10px] val-yellow font-semibold">{p.current.toFixed(2)}A</span>}
                            {p?.rpm != null && <span className="text-[10px] val-cyan font-semibold">{p.rpm}rpm</span>}
                            {p?.rmsX != null && <span className="text-[10px] val-blue font-semibold">X{p.rmsX.toFixed(2)}</span>}
                            {p?.rmsY != null && <span className="text-[10px] val-cyan font-semibold">Y{p.rmsY.toFixed(2)}</span>}
                            {p?.voltage != null && <span className="text-[10px] val-blue font-semibold">{p.voltage.toFixed(1)}V</span>}
                            {!p || (p.temperature == null && p.current == null && p.rpm == null && p.rmsX == null && p.voltage == null) && (
                              <span className="text-[9px] text-slate-500">raw payload</span>
                            )}
                          </div>
                        </div>
                        {isSelected && <Eye size={11} className="text-blue-400 flex-shrink-0 mt-1" />}
                      </button>
                    );
                  })}
                </div>

                {/* JSON viewer */}
                {selPacket && (
                  <div className="flex flex-col flex-shrink-0" style={{ width: 360, maxWidth: '50%' }}>
                    <div className="flex items-center gap-1.5 px-3 py-2" style={{ borderBottom: '1px solid #1e2d45', background: '#0d1220' }}>
                      <Eye size={12} className="text-blue-400" />
                      <span className="text-[10px] font-semibold text-slate-200 tracking-wide">RAW JSON</span>
                      <button className="ml-auto text-slate-500 hover:text-slate-300" onClick={() => setSelectedPacket(null)}><X size={12} /></button>
                    </div>
                    <div className="flex-1 overflow-auto p-3">
                      <pre className="text-[10px] leading-relaxed text-slate-300" style={{ fontFamily: 'Consolas, "Courier New", monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>
                        {JSON.stringify(selPacket.raw, null, 2)}
                      </pre>
                    </div>
                    {selPacket.parsed && (
                      <div className="p-3" style={{ borderTop: '1px solid #1e2d45', background: '#0d1220' }}>
                        <span className="text-[9px] font-semibold text-slate-400 tracking-wide block mb-1.5">PARSED VALUES</span>
                        <div className="grid grid-cols-2 gap-1">
                          {Object.entries(selPacket.parsed).filter(([, v]) => v != null).map(([k, v]) => (
                            <div key={k} className="flex justify-between text-[10px] px-1.5 py-1" style={{ background: '#0e1726', border: '1px solid #1e2d45' }}>
                              <span className="text-slate-500">{k}</span>
                              <span className="val-cyan font-semibold">{typeof v === 'number' ? v.toFixed(2) : String(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CommunicationPage;
