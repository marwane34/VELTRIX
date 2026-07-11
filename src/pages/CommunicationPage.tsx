import { useState, useEffect, type FormEvent } from 'react';
import {
  Radio, Usb, Wifi, Cloud, Network, Server, Cpu,
  Plus, Trash2, Power, Play, Square, RefreshCw, Loader2,
  CheckCircle2, AlertCircle, XCircle, Activity, Save, X,
} from 'lucide-react';
import {
  useCommunication, type CommMethod, type CommConfig, type ConnStatus,
} from '../contexts/CommunicationContext';
import { METHOD_LABELS } from '../contexts/CommunicationContext';
import { useMonitoring } from '../contexts/MonitoringContext';
import { useToast } from '../components/Toast';

interface CommunicationPageProps {
  onNavigate: (page: string) => void;
}

const METHOD_ICONS: Record<CommMethod, typeof Radio> = {
  usb_serial: Usb, wifi: Wifi, mqtt: Cloud, rest_api: Network,
  modbus_tcp: Server, opcua: Cpu,
};

const STATUS_CONFIG: Record<ConnStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  disconnected: { label: 'Disconnected', color: '#64748b', icon: XCircle },
  connecting: { label: 'Connecting...', color: '#eab308', icon: Loader2 },
  connected: { label: 'Connected', color: '#22c55e', icon: CheckCircle2 },
  error: { label: 'Error', color: '#ef4444', icon: AlertCircle },
};

const inputStyle: React.CSSProperties = {
  background: '#0a1220', border: '1px solid #1e2d45', color: '#e2e8f0',
  fontSize: 12, padding: '6px 10px', outline: 'none', width: '100%',
};

const labelStyle: React.CSSProperties = {
  fontSize: 9, fontWeight: 600, letterSpacing: '0.5px', color: '#94a3b8', marginBottom: 3,
};

/**
 * CommunicationPage — full industrial communication manager for all 6 protocols.
 * Left panel: protocol picker grid, config forms, saved configs.
 * Right panel: live data viewer.
 */
export function CommunicationPage({ onNavigate }: CommunicationPageProps) {
  const {
    settings, activeSetting, activeStatus, incomingData, dataBuffer,
    saveSetting, deleteSetting, activateSetting, connect, disconnect,
    refreshSettings, clearBuffer, availablePorts, refreshPorts,
  } = useCommunication();
  const { machines } = useMonitoring();
  const { toast } = useToast();

  const [selectedMethod, setSelectedMethod] = useState<CommMethod>('usb_serial');
  const [config, setConfig] = useState<CommConfig>({});
  const [configName, setConfigName] = useState('');
  const [machineId, setMachineId] = useState('');
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => { refreshPorts(); }, [refreshPorts]);

  // Reset config when method changes
  useEffect(() => {
    const defaults: Record<CommMethod, CommConfig> = {
      usb_serial: { port: 'COM1', baudRate: 115200, autoReconnect: true },
      wifi: { ipAddress: '192.168.1.100', wifiPort: 80, autoReconnect: true },
      mqtt: { broker: 'broker.hivemq.com', mqttPort: 1883, topic: 'veltrix/data', ssl: false, autoReconnect: true },
      rest_api: { endpointUrl: 'https://api.example.com/data', authType: 'none', pollInterval: 2 },
      modbus_tcp: { ipAddress: '192.168.1.50', wifiPort: 502, slaveId: 1, autoReconnect: true },
      opcua: { serverUrl: 'opc.tcp://localhost:4840', nodeId: 'ns=2;s=Temperature', autoReconnect: true },
    };
    setConfig(defaults[selectedMethod]);
    setConfigName('');
  }, [selectedMethod]);

  const statusCfg = STATUS_CONFIG[activeStatus];

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!configName.trim()) { toast('Configuration name is required', 'error'); return; }
    setSaving(true);
    try {
      await saveSetting(selectedMethod, configName.trim(), { ...config, machineId: machineId || undefined });
      toast('Configuration saved', 'success');
      setConfigName('');
    } catch (err) {
      toast('Failed to save: ' + (err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleConnect(id: string) {
    setConnecting(id);
    try {
      await connect(id);
      toast('Connection initiated', 'success');
    } catch (err) {
      toast('Connection failed: ' + (err as Error).message, 'error');
    } finally {
      setConnecting(null);
    }
  }

  async function handleDisconnect() {
    disconnect();
    toast('Disconnected', 'info');
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this configuration?')) return;
    try {
      await deleteSetting(id);
      toast('Configuration deleted', 'success');
    } catch (err) {
      toast('Failed to delete: ' + (err as Error).message, 'error');
    }
  }

  async function handleActivate(id: string) {
    try {
      await activateSetting(id);
      toast('Configuration activated', 'success');
    } catch (err) {
      toast('Failed: ' + (err as Error).message, 'error');
    }
  }

  // Render protocol-specific config fields
  function renderConfigFields() {
    const set = (patch: Partial<CommConfig>) => setConfig((prev) => ({ ...prev, ...patch }));
    switch (selectedMethod) {
      case 'usb_serial':
        return (
          <>
            <div><div style={labelStyle}>PORT</div>
              <select value={config.port ?? ''} onChange={(e) => set({ port: e.target.value })} style={inputStyle}>
                {availablePorts.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div><div style={labelStyle}>BAUD RATE</div>
              <select value={config.baudRate ?? 115200} onChange={(e) => set({ baudRate: parseInt(e.target.value) })} style={inputStyle}>
                {[9600, 19200, 38400, 57600, 115200, 230400, 460800].map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </>
        );
      case 'wifi':
        return (
          <>
            <div><div style={labelStyle}>IP ADDRESS</div><input type="text" value={config.ipAddress ?? ''} onChange={(e) => set({ ipAddress: e.target.value })} style={inputStyle} placeholder="192.168.1.100" /></div>
            <div><div style={labelStyle}>PORT</div><input type="number" value={config.wifiPort ?? 80} onChange={(e) => set({ wifiPort: parseInt(e.target.value) })} style={inputStyle} /></div>
          </>
        );
      case 'mqtt':
        return (
          <>
            <div><div style={labelStyle}>BROKER</div><input type="text" value={config.broker ?? ''} onChange={(e) => set({ broker: e.target.value })} style={inputStyle} placeholder="broker.hivemq.com" /></div>
            <div><div style={labelStyle}>PORT</div><input type="number" value={config.mqttPort ?? 1883} onChange={(e) => set({ mqttPort: parseInt(e.target.value) })} style={inputStyle} /></div>
            <div><div style={labelStyle}>TOPIC</div><input type="text" value={config.topic ?? ''} onChange={(e) => set({ topic: e.target.value })} style={inputStyle} placeholder="veltrix/data" /></div>
            <div><div style={labelStyle}>USERNAME (optional)</div><input type="text" value={config.username ?? ''} onChange={(e) => set({ username: e.target.value })} style={inputStyle} /></div>
            <div><div style={labelStyle}>PASSWORD (optional)</div><input type="password" value={config.password ?? ''} onChange={(e) => set({ password: e.target.value })} style={inputStyle} /></div>
          </>
        );
      case 'rest_api':
        return (
          <>
            <div><div style={labelStyle}>ENDPOINT URL</div><input type="text" value={config.endpointUrl ?? ''} onChange={(e) => set({ endpointUrl: e.target.value })} style={inputStyle} placeholder="https://api.example.com/data" /></div>
            <div><div style={labelStyle}>AUTH TYPE</div>
              <select value={config.authType ?? 'none'} onChange={(e) => set({ authType: e.target.value as CommConfig['authType'] })} style={inputStyle}>
                <option value="none">None</option><option value="bearer">Bearer Token</option>
                <option value="basic">Basic Auth</option><option value="apikey">API Key</option>
              </select>
            </div>
            {config.authType && config.authType !== 'none' && (
              <div><div style={labelStyle}>{config.authType === 'bearer' ? 'TOKEN' : config.authType === 'basic' ? 'CREDENTIALS' : 'API KEY'}</div>
                <input type="password" value={config.apiKey ?? ''} onChange={(e) => set({ apiKey: e.target.value })} style={inputStyle} /></div>
            )}
            <div><div style={labelStyle}>POLL INTERVAL (seconds)</div><input type="number" value={config.pollInterval ?? 2} onChange={(e) => set({ pollInterval: parseInt(e.target.value) })} style={inputStyle} /></div>
          </>
        );
      case 'modbus_tcp':
        return (
          <>
            <div><div style={labelStyle}>IP ADDRESS</div><input type="text" value={config.ipAddress ?? ''} onChange={(e) => set({ ipAddress: e.target.value })} style={inputStyle} placeholder="192.168.1.50" /></div>
            <div><div style={labelStyle}>PORT</div><input type="number" value={config.wifiPort ?? 502} onChange={(e) => set({ wifiPort: parseInt(e.target.value) })} style={inputStyle} /></div>
            <div><div style={labelStyle}>SLAVE ID</div><input type="number" value={config.slaveId ?? 1} onChange={(e) => set({ slaveId: parseInt(e.target.value) })} style={inputStyle} /></div>
          </>
        );
      case 'opcua':
        return (
          <>
            <div><div style={labelStyle}>SERVER URL</div><input type="text" value={config.serverUrl ?? ''} onChange={(e) => set({ serverUrl: e.target.value })} style={inputStyle} placeholder="opc.tcp://localhost:4840" /></div>
            <div><div style={labelStyle}>NODE ID</div><input type="text" value={config.nodeId ?? ''} onChange={(e) => set({ nodeId: e.target.value })} style={inputStyle} placeholder="ns=2;s=Temperature" /></div>
          </>
        );
    }
  }

  return (
    <div className="flex" style={{ height: '100%', background: '#060b14' }}>
      {/* Left Panel */}
      <div className="flex flex-col" style={{ width: 420, minWidth: 420, borderRight: '1px solid #1e2d45', overflowY: 'auto' }}>
        {/* Header */}
        <div className="flex items-center gap-3" style={{ padding: '12px 16px', borderBottom: '1px solid #1e2d45', flexShrink: 0 }}>
          <Radio size={20} style={{ color: '#3b82f6' }} />
          <span className="font-bold tracking-wider" style={{ fontSize: 14, color: '#e2e8f0' }}>COMMUNICATION</span>
        </div>

        {/* Protocol Picker Grid */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e2d45' }}>
          <div style={labelStyle}>SELECT PROTOCOL</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {(Object.keys(METHOD_LABELS) as CommMethod[]).map((method) => {
              const Icon = METHOD_ICONS[method];
              const active = selectedMethod === method;
              return (
                <button
                  key={method}
                  onClick={() => setSelectedMethod(method)}
                  className="flex flex-col items-center gap-1"
                  style={{
                    padding: '10px 6px', cursor: 'pointer', borderRadius: 4,
                    background: active ? 'linear-gradient(180deg,#1a3a6e 0%,#0f2547 100%)' : '#0a1220',
                    border: active ? '1px solid #3b82f6' : '1px solid #1e2d45',
                    color: active ? '#60a5fa' : '#94a3b8',
                    transition: 'all 0.15s',
                  }}
                >
                  <Icon size={18} />
                  <span style={{ fontSize: 9, fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>{METHOD_LABELS[method]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Config Form */}
        <form onSubmit={handleSave} className="flex flex-col gap-3" style={{ padding: '12px 16px', borderBottom: '1px solid #1e2d45' }}>
          <div className="flex items-center gap-2">
            {(() => { const Icon = METHOD_ICONS[selectedMethod]; return <Icon size={14} style={{ color: '#3b82f6' }} />; })()}
            <span style={{ fontSize: 11, fontWeight: 700, color: '#c8d6ea', letterSpacing: '0.5px' }}>{METHOD_LABELS[selectedMethod].toUpperCase()} CONFIG</span>
          </div>
          <div><div style={labelStyle}>CONFIGURATION NAME</div><input type="text" value={configName} onChange={(e) => setConfigName(e.target.value)} style={inputStyle} placeholder="e.g. Factory Floor Sensor" /></div>
          <div><div style={labelStyle}>ASSIGN TO MACHINE (optional)</div>
            <select value={machineId} onChange={(e) => setMachineId(e.target.value)} style={inputStyle}>
              <option value="">— None —</option>
              {machines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          {renderConfigFields()}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5" style={{ cursor: 'pointer', fontSize: 11, color: '#94a3b8' }}>
              <input type="checkbox" checked={config.autoReconnect ?? false} onChange={(e) => setConfig((p) => ({ ...p, autoReconnect: e.target.checked }))} />
              Auto-reconnect
            </label>
          </div>
          <button type="submit" disabled={saving} className="btn-monitor flex items-center justify-center gap-2" style={{ padding: '7px 14px', opacity: saving ? 0.6 : 1 }}>
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save Configuration
          </button>
        </form>

        {/* Saved Configs */}
        <div style={{ padding: '12px 16px', flex: 1 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
            <span style={labelStyle}>SAVED CONFIGURATIONS ({settings.length})</span>
            <button onClick={() => void refreshSettings()} className="toolbar-icon-btn" style={{ width: 22, height: 20 }} title="Refresh"><RefreshCw size={10} /></button>
          </div>
          {settings.length === 0 ? (
            <div className="flex flex-col items-center justify-center" style={{ padding: 20, gap: 8 }}>
              <Radio size={28} style={{ color: '#475569', opacity: 0.5 }} />
              <span style={{ fontSize: 11, color: '#64748b', textAlign: 'center' }}>No saved configurations.<br />Create one above.</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {settings.map((s) => {
                const Icon = METHOD_ICONS[s.method];
                const isActive = activeSetting?.id === s.id;
                const sCfg = STATUS_CONFIG[s.status];
                return (
                  <div key={s.id} className="panel" style={{ padding: '8px 10px' }}>
                    <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                      <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
                        <Icon size={13} style={{ color: isActive ? '#3b82f6' : '#64748b', flexShrink: 0 }} />
                        <span className="font-semibold truncate" style={{ fontSize: 12, color: '#e2e8f0' }}>{s.name}</span>
                      </div>
                      <span className="flex items-center gap-1" style={{ fontSize: 9, color: sCfg.color, fontWeight: 600 }}>
                        <sCfg.icon size={10} className={s.status === 'connecting' ? 'animate-spin' : ''} /> {sCfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5" style={{ marginBottom: 6 }}>
                      <span style={{ fontSize: 9, color: '#64748b' }}>{METHOD_LABELS[s.method]}</span>
                      {s.is_active && <span style={{ fontSize: 8, fontWeight: 700, color: '#3b82f6', padding: '1px 4px', background: 'rgba(59,130,246,0.15)', borderRadius: 2 }}>ACTIVE</span>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isActive && activeStatus === 'connected' ? (
                        <button onClick={handleDisconnect} className="btn-danger flex items-center gap-1" style={{ padding: '3px 8px', fontSize: 10 }}>
                          <Square size={10} /> Disconnect
                        </button>
                      ) : (
                        <button onClick={() => handleConnect(s.id)} disabled={connecting === s.id} className="btn-monitor flex items-center gap-1" style={{ padding: '3px 8px', fontSize: 10, opacity: connecting === s.id ? 0.5 : 1 }}>
                          {connecting === s.id ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />} Connect
                        </button>
                      )}
                      {!s.is_active && (
                        <button onClick={() => handleActivate(s.id)} className="btn-secondary flex items-center gap-1" style={{ padding: '3px 8px', fontSize: 10 }}>
                          <Power size={10} /> Activate
                        </button>
                      )}
                      <button onClick={() => handleDelete(s.id)} className="btn-secondary" style={{ padding: '3px 6px', marginLeft: 'auto' }} title="Delete">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Live Data Viewer */}
      <div className="flex flex-col" style={{ flex: 1, overflow: 'hidden' }}>
        {/* Status header */}
        <div className="flex items-center justify-between" style={{ padding: '12px 16px', borderBottom: '1px solid #1e2d45', flexShrink: 0 }}>
          <div className="flex items-center gap-3">
            <Activity size={18} style={{ color: statusCfg.color }} />
            <span className="font-bold tracking-wider" style={{ fontSize: 13, color: '#e2e8f0' }}>LIVE DATA VIEWER</span>
          </div>
          <div className="flex items-center gap-3">
            {activeSetting && (
              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                {activeSetting.name} · {METHOD_LABELS[activeSetting.method]}
              </span>
            )}
            <span className="flex items-center gap-1.5" style={{ fontSize: 11, fontWeight: 600, color: statusCfg.color }}>
              <statusCfg.icon size={13} className={activeStatus === 'connecting' ? 'animate-spin' : ''} />
              {statusCfg.label}
            </span>
            <button onClick={clearBuffer} className="btn-secondary flex items-center gap-1.5" style={{ padding: '4px 10px' }} disabled={incomingData.length === 0}>
              <X size={12} /> Clear
            </button>
          </div>
        </div>

        {/* Data stream */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {incomingData.length === 0 ? (
            <div className="flex flex-col items-center justify-center" style={{ height: '100%', gap: 12 }}>
              <Activity size={48} style={{ color: '#475569', opacity: 0.5 }} />
              <span style={{ fontSize: 13, color: '#64748b' }}>No data received yet.</span>
              <span style={{ fontSize: 11, color: '#475569' }}>Connect to a configuration to start receiving live data.</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {incomingData.map((entry, i) => (
                <div key={i} className="panel" style={{ padding: '10px 14px' }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                    <span className="flex items-center gap-2" style={{ fontSize: 10, fontWeight: 600, color: '#3b82f6', letterSpacing: '0.5px' }}>
                      {(() => { const Icon = METHOD_ICONS[entry.source]; return <Icon size={11} />; })()} {METHOD_LABELS[entry.source]}
                    </span>
                    <span style={{ fontSize: 10, color: '#64748b' }}>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                  </div>
                  {entry.parsed && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, marginBottom: 6 }}>
                      {entry.parsed.temperature != null && <div className="flex flex-col"><span style={{ fontSize: 8, color: '#64748b' }}>TEMP</span><span className="val-orange font-bold" style={{ fontSize: 13 }}>{entry.parsed.temperature.toFixed(1)}°</span></div>}
                      {entry.parsed.current != null && <div className="flex flex-col"><span style={{ fontSize: 8, color: '#64748b' }}>CURR</span><span className="val-yellow font-bold" style={{ fontSize: 13 }}>{entry.parsed.current.toFixed(2)}A</span></div>}
                      {entry.parsed.rpm != null && <div className="flex flex-col"><span style={{ fontSize: 8, color: '#64748b' }}>RPM</span><span className="val-cyan font-bold" style={{ fontSize: 13 }}>{entry.parsed.rpm}</span></div>}
                      {entry.parsed.voltage != null && <div className="flex flex-col"><span style={{ fontSize: 8, color: '#64748b' }}>VOLT</span><span className="val-blue font-bold" style={{ fontSize: 13 }}>{entry.parsed.voltage}V</span></div>}
                      {entry.parsed.rmsX != null && <div className="flex flex-col"><span style={{ fontSize: 8, color: '#64748b' }}>RMS X</span><span className="val-blue font-bold" style={{ fontSize: 13 }}>{entry.parsed.rmsX.toFixed(3)}</span></div>}
                      {entry.parsed.rmsY != null && <div className="flex flex-col"><span style={{ fontSize: 8, color: '#64748b' }}>RMS Y</span><span className="val-blue font-bold" style={{ fontSize: 13 }}>{entry.parsed.rmsY.toFixed(3)}</span></div>}
                    </div>
                  )}
                  <details>
                    <summary style={{ fontSize: 10, color: '#64748b', cursor: 'pointer' }}>Raw JSON</summary>
                    <pre style={{ fontSize: 10, color: '#94a3b8', marginTop: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 120, overflow: 'auto' }}>
                      {JSON.stringify(entry.raw, null, 2)}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Buffer status bar */}
        <div className="flex items-center justify-between" style={{ padding: '6px 16px', borderTop: '1px solid #1e2d45', background: '#0d1220', flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: '#64748b' }}>Buffer: {dataBuffer.length} entries</span>
          <span style={{ fontSize: 10, color: '#64748b' }}>Total received: {incomingData.length}</span>
        </div>
      </div>
    </div>
  );
}

export default CommunicationPage;
