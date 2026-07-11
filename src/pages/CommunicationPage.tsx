import { useState, useEffect } from 'react';
import {
  Usb, Wifi, Radio, Network, Server, Globe,
  Plus, Trash2, Play, Square, RefreshCw, Save,
  CheckCircle, XCircle, Loader2, AlertTriangle, ChevronDown,
  Activity, Settings as SettingsIcon, X,
} from 'lucide-react';
import { useCommunication, type CommMethod, type CommConfig, type ConnStatus, type CommSetting, METHOD_LABELS } from '../contexts/CommunicationContext';
import { useMonitoring } from '../contexts/MonitoringContext';
import { useToast } from '../components/Toast';

const METHODS: { id: CommMethod; icon: React.ElementType; label: string; desc: string; color: string }[] = [
  { id: 'usb_serial', icon: Usb, label: 'USB Serial', desc: 'ESP32, Arduino via COM port', color: '#3b82f6' },
  { id: 'wifi', icon: Wifi, label: 'Wi-Fi', desc: 'ESP32 over TCP/Wi-Fi', color: '#22c55e' },
  { id: 'mqtt', icon: Radio, label: 'MQTT', desc: 'MQTT broker pub/sub', color: '#eab308' },
  { id: 'modbus_tcp', icon: Network, label: 'Modbus TCP', desc: 'Modbus TCP/IP gateway', color: '#f97316' },
  { id: 'opcua', icon: Server, label: 'OPC UA', desc: 'OPC UA server nodes', color: '#a855f7' },
  { id: 'rest_api', icon: Globe, label: 'REST API', desc: 'HTTP GET/POST endpoint', color: '#06b6d4' },
];

const BAUD_RATES = [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600];

function StatusBadge({ status }: { status: ConnStatus }) {
  const config: Record<ConnStatus, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
    connected: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)', icon: <CheckCircle size={10} />, label: 'Connected' },
    connecting: { color: '#eab308', bg: 'rgba(234,179,8,0.1)', icon: <Loader2 size={10} className="animate-spin" />, label: 'Connecting...' },
    disconnected: { color: '#64748b', bg: 'rgba(100,116,139,0.1)', icon: <XCircle size={10} />, label: 'Disconnected' },
    error: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: <AlertTriangle size={10} />, label: 'Error' },
  };
  const c = config[status];
  return (
    <span
      className="flex items-center gap-1 px-2 py-0.5 text-xs font-semibold"
      style={{ color: c.color, background: c.bg, border: `1px solid ${c.color}40` }}
    >
      {c.icon}
      {c.label}
    </span>
  );
}

function inputStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    background: '#060b14',
    border: '1px solid #1e2d45',
    color: '#e2e8f0',
    padding: '5px 8px',
    fontSize: 11,
    outline: 'none',
    width: '100%',
    ...extra,
  };
}

function label(text: string) {
  return <span className="text-xs text-slate-400 block mb-1">{text}</span>;
}

function ConfigForm({ method, initial, onSave }: {
  method: CommMethod;
  initial?: Partial<CommConfig>;
  onSave: (config: CommConfig) => void;
}) {
  const { availablePorts, refreshPorts } = useCommunication();
  const { machines } = useMonitoring();
  const [config, setConfig] = useState<CommConfig>({
    port: initial?.port ?? 'COM1',
    baudRate: initial?.baudRate ?? 115200,
    autoReconnect: initial?.autoReconnect ?? true,
    ipAddress: initial?.ipAddress ?? '192.168.1.100',
    wifiPort: initial?.wifiPort ?? 80,
    broker: initial?.broker ?? 'broker.hivemq.com',
    mqttPort: initial?.mqttPort ?? 1883,
    username: initial?.username ?? '',
    password: initial?.password ?? '',
    topic: initial?.topic ?? 'veltrix/sensor_data',
    ssl: initial?.ssl ?? false,
    slaveId: initial?.slaveId ?? 1,
    registerMap: initial?.registerMap ?? [
      { address: 0, name: 'temperature', type: 'float' },
      { address: 2, name: 'rmsX', type: 'float' },
      { address: 4, name: 'rmsY', type: 'float' },
      { address: 6, name: 'current', type: 'float' },
      { address: 8, name: 'rpm', type: 'int16' },
    ],
    serverUrl: initial?.serverUrl ?? 'opc.tcp://localhost:4840',
    nodeId: initial?.nodeId ?? 'ns=2;s=Temperature',
    endpointUrl: initial?.endpointUrl ?? 'http://localhost:8000/api/sensor',
    apiKey: initial?.apiKey ?? '',
    authType: initial?.authType ?? 'none',
    pollInterval: initial?.pollInterval ?? 2,
    machineId: initial?.machineId ?? machines[0]?.id ?? '',
  });

  const set = (k: keyof CommConfig, v: unknown) => setConfig((prev) => ({ ...prev, [k]: v }));

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    onSave(config);
  }

  return (
    <form onSubmit={handleSave} className="space-y-3">
      {/* Machine selector — shared across all methods */}
      <div>
        {label('Target Machine')}
        <select
          style={inputStyle()}
          value={config.machineId ?? ''}
          onChange={(e) => set('machineId', e.target.value)}
        >
          <option value="">Select machine...</option>
          {machines.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      {/* USB Serial */}
      {method === 'usb_serial' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              {label('COM Port')}
              <div className="flex gap-1">
                <select style={inputStyle()} value={config.port} onChange={(e) => set('port', e.target.value)}>
                  {(availablePorts.length > 0 ? availablePorts : ['COM1','COM2','COM3','COM4','/dev/ttyUSB0','/dev/ttyACM0']).map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <button type="button" onClick={refreshPorts} title="Refresh ports" className="btn-secondary px-2 py-1 shrink-0">
                  <RefreshCw size={10} />
                </button>
              </div>
            </div>
            <div>
              {label('Baud Rate')}
              <select style={inputStyle()} value={config.baudRate} onChange={(e) => set('baudRate', parseInt(e.target.value))}>
                {BAUD_RATES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={config.autoReconnect} onChange={(e) => set('autoReconnect', e.target.checked)} />
            <span className="text-xs text-slate-300">Auto reconnect on disconnect</span>
          </label>
        </>
      )}

      {/* Wi-Fi */}
      {method === 'wifi' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              {label('IP Address')}
              <input style={inputStyle()} value={config.ipAddress} onChange={(e) => set('ipAddress', e.target.value)} placeholder="192.168.1.100" />
            </div>
            <div>
              {label('Port')}
              <input type="number" style={inputStyle()} value={config.wifiPort} onChange={(e) => set('wifiPort', parseInt(e.target.value))} placeholder="80" />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={config.autoReconnect} onChange={(e) => set('autoReconnect', e.target.checked)} />
            <span className="text-xs text-slate-300">Auto reconnect on disconnect</span>
          </label>
        </>
      )}

      {/* MQTT */}
      {method === 'mqtt' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              {label('Broker')}
              <input style={inputStyle()} value={config.broker} onChange={(e) => set('broker', e.target.value)} placeholder="broker.hivemq.com" />
            </div>
            <div>
              {label('Port')}
              <input type="number" style={inputStyle()} value={config.mqttPort} onChange={(e) => set('mqttPort', parseInt(e.target.value))} placeholder="1883" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              {label('Username (optional)')}
              <input style={inputStyle()} value={config.username} onChange={(e) => set('username', e.target.value)} />
            </div>
            <div>
              {label('Password (optional)')}
              <input type="password" style={inputStyle()} value={config.password} onChange={(e) => set('password', e.target.value)} />
            </div>
          </div>
          <div>
            {label('Topic')}
            <input style={inputStyle()} value={config.topic} onChange={(e) => set('topic', e.target.value)} placeholder="veltrix/sensor_data" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={config.ssl} onChange={(e) => set('ssl', e.target.checked)} />
            <span className="text-xs text-slate-300">Use SSL/TLS</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={config.autoReconnect} onChange={(e) => set('autoReconnect', e.target.checked)} />
            <span className="text-xs text-slate-300">Auto reconnect</span>
          </label>
        </>
      )}

      {/* Modbus TCP */}
      {method === 'modbus_tcp' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              {label('IP Address')}
              <input style={inputStyle()} value={config.ipAddress ?? ''} onChange={(e) => set('ipAddress', e.target.value)} placeholder="192.168.1.50" />
            </div>
            <div>
              {label('Port')}
              <input type="number" style={inputStyle()} value={config.wifiPort ?? 502} onChange={(e) => set('wifiPort', parseInt(e.target.value))} placeholder="502" />
            </div>
          </div>
          <div>
            {label('Slave ID')}
            <input type="number" style={inputStyle()} value={config.slaveId ?? 1} onChange={(e) => set('slaveId', parseInt(e.target.value))} />
          </div>
          <div>
            {label('Register Mapping')}
            <div className="space-y-1 mt-1">
              {(config.registerMap ?? []).map((reg, i) => (
                <div key={i} className="grid grid-cols-3 gap-1">
                  <input
                    type="number"
                    style={inputStyle({ padding: '3px 6px' })}
                    value={reg.address}
                    onChange={(e) => {
                      const map = [...(config.registerMap ?? [])];
                      map[i] = { ...map[i], address: parseInt(e.target.value) };
                      set('registerMap', map);
                    }}
                    placeholder="Addr"
                  />
                  <input
                    style={inputStyle({ padding: '3px 6px' })}
                    value={reg.name}
                    onChange={(e) => {
                      const map = [...(config.registerMap ?? [])];
                      map[i] = { ...map[i], name: e.target.value };
                      set('registerMap', map);
                    }}
                    placeholder="Name"
                  />
                  <select
                    style={inputStyle({ padding: '3px 6px' })}
                    value={reg.type}
                    onChange={(e) => {
                      const map = [...(config.registerMap ?? [])];
                      map[i] = { ...map[i], type: e.target.value };
                      set('registerMap', map);
                    }}
                  >
                    <option value="int16">int16</option>
                    <option value="uint16">uint16</option>
                    <option value="float">float32</option>
                    <option value="int32">int32</option>
                  </select>
                </div>
              ))}
              <button
                type="button"
                onClick={() => set('registerMap', [...(config.registerMap ?? []), { address: 10, name: '', type: 'float' }])}
                className="btn-secondary w-full py-1 text-xs"
              >
                <Plus size={9} className="inline mr-1" /> Add Register
              </button>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={config.autoReconnect} onChange={(e) => set('autoReconnect', e.target.checked)} />
            <span className="text-xs text-slate-300">Auto reconnect</span>
          </label>
        </>
      )}

      {/* OPC UA */}
      {method === 'opcua' && (
        <>
          <div>
            {label('Server URL')}
            <input style={inputStyle()} value={config.serverUrl} onChange={(e) => set('serverUrl', e.target.value)} placeholder="opc.tcp://localhost:4840" />
          </div>
          <div>
            {label('Node ID')}
            <input style={inputStyle()} value={config.nodeId} onChange={(e) => set('nodeId', e.target.value)} placeholder="ns=2;s=Temperature" />
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary flex-1 py-1.5 text-xs">Browse Nodes</button>
            <button type="button" className="btn-secondary flex-1 py-1.5 text-xs">Subscribe</button>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={config.autoReconnect} onChange={(e) => set('autoReconnect', e.target.checked)} />
            <span className="text-xs text-slate-300">Auto reconnect</span>
          </label>
        </>
      )}

      {/* REST API */}
      {method === 'rest_api' && (
        <>
          <div>
            {label('Endpoint URL')}
            <input style={inputStyle()} value={config.endpointUrl} onChange={(e) => set('endpointUrl', e.target.value)} placeholder="http://localhost:8000/api/sensor" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              {label('Authentication')}
              <select style={inputStyle()} value={config.authType} onChange={(e) => set('authType', e.target.value as CommConfig['authType'])}>
                <option value="none">None</option>
                <option value="bearer">Bearer Token</option>
                <option value="apikey">API Key Header</option>
                <option value="basic">Basic Auth</option>
              </select>
            </div>
            <div>
              {label('Poll Interval (s)')}
              <input type="number" style={inputStyle()} value={config.pollInterval} onChange={(e) => set('pollInterval', parseInt(e.target.value))} />
            </div>
          </div>
          {config.authType !== 'none' && (
            <div>
              {label(config.authType === 'bearer' ? 'Token' : config.authType === 'apikey' ? 'API Key' : 'Credentials')}
              <input style={inputStyle()} value={config.apiKey} onChange={(e) => set('apiKey', e.target.value)} placeholder={config.authType === 'bearer' ? 'Bearer token' : 'API key'} />
            </div>
          )}
          <div className="flex gap-2">
            <button type="button" className="btn-secondary flex-1 py-1.5 text-xs">GET</button>
            <button type="button" className="btn-secondary flex-1 py-1.5 text-xs">POST</button>
          </div>
        </>
      )}

      <button type="submit" className="btn-monitor w-full py-2 text-xs flex items-center justify-center gap-1.5">
        <Save size={11} /> Save Configuration
      </button>
    </form>
  );
}

function SavedSettingCard({ setting }: { setting: CommSetting }) {
  const { connect, disconnect, deleteSetting, activateSetting, activeSetting, activeStatus } = useCommunication();
  const { toast } = useToast();
  const [showConfig, setShowConfig] = useState(false);
  const methodDef = METHODS.find((m) => m.id === setting.method)!;
  const Icon = methodDef.icon;
  const isActive = activeSetting?.id === setting.id;
  const status: ConnStatus = isActive ? activeStatus : setting.status;

  async function handleConnect() {
    try {
      await connect(setting.id);
      toast(`Connecting via ${methodDef.label}...`, 'info');
    } catch {
      toast(`Failed to connect via ${methodDef.label}`, 'error');
    }
  }

  function handleDisconnect() {
    disconnect();
    toast(`Disconnected from ${methodDef.label}`, 'info');
  }

  async function handleDelete() {
    if (!confirm(`Delete "${setting.name}"?`)) return;
    await deleteSetting(setting.id);
    toast('Configuration deleted', 'success');
  }

  return (
    <div
      className="panel p-3"
      style={{
        borderColor: isActive ? methodDef.color + '60' : '#1e2d45',
        boxShadow: isActive ? `0 0 12px ${methodDef.color}20` : 'none',
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center shrink-0"
            style={{ width: 28, height: 28, background: `${methodDef.color}15`, border: `1px solid ${methodDef.color}40` }}
          >
            <Icon size={14} style={{ color: methodDef.color }} />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-200">{setting.name}</div>
            <div className="text-xs text-slate-500">{methodDef.label}</div>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Config summary */}
      <div className="text-xs text-slate-500 space-y-0.5 mb-2">
        {setting.method === 'usb_serial' && <div>Port: {setting.config.port} @ {setting.config.baudRate} baud</div>}
        {setting.method === 'wifi' && <div>{setting.config.ipAddress}:{setting.config.wifiPort}</div>}
        {setting.method === 'mqtt' && <div>{setting.config.broker}:{setting.config.mqttPort} | {setting.config.topic}</div>}
        {setting.method === 'modbus_tcp' && <div>{setting.config.ipAddress}:{setting.config.wifiPort} | Slave {setting.config.slaveId}</div>}
        {setting.method === 'opcua' && <div>{setting.config.serverUrl}</div>}
        {setting.method === 'rest_api' && <div>{setting.config.endpointUrl}</div>}
      </div>

      {/* Actions */}
      <div className="flex gap-1.5">
        {status === 'connected' || status === 'connecting' ? (
          <button onClick={handleDisconnect} className="btn-secondary flex-1 py-1.5 text-xs flex items-center justify-center gap-1" style={{ borderColor: '#5a2020', color: '#f87171' }}>
            <Square size={10} /> Disconnect
          </button>
        ) : (
          <button onClick={handleConnect} className="btn-monitor flex-1 py-1.5 text-xs flex items-center justify-center gap-1">
            <Play size={10} /> Connect
          </button>
        )}
        <button onClick={() => setShowConfig(!showConfig)} className="btn-secondary py-1.5 px-2 text-xs" title="Edit configuration">
          <SettingsIcon size={10} />
        </button>
        <button onClick={handleDelete} className="btn-secondary py-1.5 px-2 text-xs" title="Delete" style={{ borderColor: '#3b1818', color: '#f87171' }}>
          <Trash2 size={10} />
        </button>
      </div>

      {showConfig && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid #1e2d45' }}>
          <ConfigForm
            method={setting.method}
            initial={setting.config}
            onSave={async (newConfig) => {
              await activateSetting(setting.id);
              setShowConfig(false);
              toast('Configuration updated', 'success');
            }}
          />
        </div>
      )}
    </div>
  );
}

function LiveDataViewer() {
  const { incomingData, clearBuffer } = useCommunication();
  const [selected, setSelected] = useState(0);

  const entry = incomingData[selected];

  return (
    <div className="panel flex flex-col" style={{ height: '100%' }}>
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid #1e2d45', background: 'linear-gradient(180deg,#151f33 0%,#0f1726 100%)' }}>
        <div className="flex items-center gap-2">
          <Activity size={12} className="text-blue-400" />
          <span className="text-xs font-semibold text-slate-200">Live Data Stream</span>
          {incomingData.length > 0 && (
            <span className="text-xs px-1.5 py-0.5" style={{ background: '#0d1f3c', border: '1px solid #1e4080', color: '#60a5fa' }}>
              {incomingData.length} packets
            </span>
          )}
        </div>
        <button onClick={clearBuffer} className="btn-secondary px-2 py-1 text-xs">Clear</button>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Packet list */}
        <div className="overflow-y-auto" style={{ width: 200, borderRight: '1px solid #1e2d45', flexShrink: 0 }}>
          {incomingData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <Activity size={24} className="text-slate-700" />
              <span className="text-xs text-slate-600 text-center px-3">Waiting for data...</span>
            </div>
          ) : (
            incomingData.map((d, i) => (
              <div
                key={i}
                onClick={() => setSelected(i)}
                className="px-2 py-1.5 cursor-pointer"
                style={{
                  borderBottom: '1px solid #1a2540',
                  background: i === selected ? 'rgba(59,130,246,0.08)' : 'transparent',
                  borderLeft: i === selected ? '2px solid #3b82f6' : '2px solid transparent',
                }}
              >
                <div className="text-xs text-slate-400 font-mono">
                  {new Date(d.timestamp).toLocaleTimeString()}
                </div>
                <div className="text-xs text-slate-600">
                  {METHOD_LABELS[d.source]}
                </div>
              </div>
            ))
          )}
        </div>

        {/* JSON viewer */}
        <div className="flex-1 overflow-auto p-3">
          {entry ? (
            <>
              <div className="text-xs text-slate-500 mb-2">
                {new Date(entry.timestamp).toLocaleString()} | Source: {METHOD_LABELS[entry.source]}
              </div>
              {entry.parsed && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {entry.parsed.temperature != null && (
                    <div className="px-2 py-1.5 text-center" style={{ background: '#0d1520', border: '1px solid #1a2540' }}>
                      <div className="text-xs font-bold text-red-400">{entry.parsed.temperature.toFixed(1)}°C</div>
                      <div className="text-xs text-slate-600">Temp</div>
                    </div>
                  )}
                  {entry.parsed.current != null && (
                    <div className="px-2 py-1.5 text-center" style={{ background: '#0d1520', border: '1px solid #1a2540' }}>
                      <div className="text-xs font-bold text-yellow-400">{entry.parsed.current.toFixed(1)}A</div>
                      <div className="text-xs text-slate-600">Current</div>
                    </div>
                  )}
                  {entry.parsed.rpm != null && (
                    <div className="px-2 py-1.5 text-center" style={{ background: '#0d1520', border: '1px solid #1a2540' }}>
                      <div className="text-xs font-bold text-green-400">{entry.parsed.rpm}</div>
                      <div className="text-xs text-slate-600">RPM</div>
                    </div>
                  )}
                </div>
              )}
              <pre
                className="text-xs font-mono p-2 overflow-auto"
                style={{ background: '#060b14', border: '1px solid #1e2d45', color: '#94a3b8', maxHeight: 300 }}
              >
                {JSON.stringify(entry.raw, null, 2)}
              </pre>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <span className="text-xs text-slate-600">Select a packet to view raw JSON</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CommunicationPage() {
  const { settings, saveSetting, activeSetting, activeStatus } = useCommunication();
  const { toast } = useToast();
  const [selectedMethod, setSelectedMethod] = useState<CommMethod | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');

  async function handleSaveNew(config: CommConfig) {
    if (!selectedMethod) return;
    const name = newName || `${METHOD_LABELS[selectedMethod]} ${settings.filter(s => s.method === selectedMethod).length + 1}`;
    await saveSetting(selectedMethod, name, config);
    setShowNewForm(false);
    setSelectedMethod(null);
    setNewName('');
    toast('Communication configuration saved', 'success');
  }

  return (
    <div className="flex flex-col h-full" style={{ background: '#0b0f1a' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: '1px solid #1e2d45', background: 'linear-gradient(180deg,#111827 0%,#0b0f1a 100%)' }}>
        <div className="flex items-center gap-2">
          <Radio size={16} className="text-blue-400" />
          <h2 className="text-sm font-semibold text-slate-200 tracking-wide">COMMUNICATION MANAGER</h2>
          {activeSetting && (
            <div className="flex items-center gap-2 ml-2">
              <span className="text-xs text-slate-500">Active:</span>
              <span className="text-xs font-semibold" style={{ color: METHODS.find(m => m.id === activeSetting.method)?.color }}>
                {activeSetting.name}
              </span>
              <StatusBadge status={activeStatus} />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Method selection + saved configs */}
        <div className="flex flex-col overflow-y-auto p-4" style={{ width: 420, borderRight: '1px solid #1e2d45', flexShrink: 0 }}>
          {/* Method picker */}
          <div className="mb-4">
            <div className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide">Add New Connection</div>
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
              {METHODS.map((m) => {
                const Icon = m.icon;
                const isSelected = selectedMethod === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => { setSelectedMethod(m.id); setShowNewForm(true); }}
                    className="flex flex-col items-center gap-1.5 p-3 transition-all"
                    style={{
                      background: isSelected ? `${m.color}10` : '#0d1520',
                      border: `1px solid ${isSelected ? m.color + '60' : '#1e2d45'}`,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.borderColor = '#2a3f60'; }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.borderColor = '#1e2d45'; }}
                  >
                    <Icon size={18} style={{ color: m.color }} />
                    <div className="text-xs font-medium text-slate-300">{m.label}</div>
                    <div className="text-xs text-slate-600 text-center" style={{ fontSize: 9 }}>{m.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* New config form */}
          {showNewForm && selectedMethod && (
            <div className="panel p-3 mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-200">
                  New {METHOD_LABELS[selectedMethod]} Configuration
                </span>
                <button onClick={() => { setShowNewForm(false); setSelectedMethod(null); }} className="text-slate-500 hover:text-slate-300">
                  <X size={14} />
                </button>
              </div>
              <div className="mb-3">
                {label('Configuration Name')}
                <input style={inputStyle()} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={`${METHOD_LABELS[selectedMethod]} Connection`} />
              </div>
              <ConfigForm method={selectedMethod} onSave={handleSaveNew} />
            </div>
          )}

          {/* Saved configurations */}
          <div>
            <div className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide">Saved Configurations</div>
            {settings.length === 0 ? (
              <div className="text-center py-8">
                <Radio size={32} className="text-slate-700 mx-auto mb-3" />
                <div className="text-xs text-slate-500 mb-1">No communication configurations</div>
                <div className="text-xs text-slate-600">Select a method above to create one</div>
              </div>
            ) : (
              <div className="space-y-3">
                {settings.map((s) => (
                  <SavedSettingCard key={s.id} setting={s} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Live data viewer */}
        <div className="flex-1 p-4 overflow-hidden">
          <LiveDataViewer />
        </div>
      </div>
    </div>
  );
}
