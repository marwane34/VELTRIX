import { useState, useEffect, useMemo } from 'react';
import {
  Radio, Wifi, Usb, Network, Cloud, Globe, Save, Trash2, Play, Square,
  RefreshCw, Activity, ChevronRight, Settings2, Usb as UsbIcon,
} from 'lucide-react';
import { useCommunication, METHOD_LABELS, type CommMethod, type CommConfig } from '../contexts/CommunicationContext';
import { useMonitoring } from '../contexts/MonitoringContext';
import { useToast } from '../components/Toast';

const METHOD_ICONS: Record<CommMethod, typeof Radio> = {
  usb_serial: Usb,
  wifi: Wifi,
  mqtt: Network,
  modbus_tcp: Activity,
  opcua: Cloud,
  rest_api: Globe,
};

const METHOD_DESCRIPTIONS: Record<CommMethod, string> = {
  usb_serial: 'Serial communication via USB / COM port. Uses Web Serial API or simulated data.',
  wifi: 'WebSocket connection to Wi-Fi enabled device streaming sensor data.',
  mqtt: 'MQTT over WebSocket protocol for pub/sub telemetry.',
  modbus_tcp: 'Modbus TCP via WebSocket gateway with register polling.',
  opcua: 'OPC UA server connection via WebSocket gateway.',
  rest_api: 'HTTP REST API polling with configurable interval.',
};

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  disconnected: { color: '#64748b', label: 'Disconnected' },
  connecting: { color: '#eab308', label: 'Connecting...' },
  connected: { color: '#22c55e', label: 'Connected' },
  error: { color: '#ef4444', label: 'Error' },
};

export function CommunicationPage() {
  const {
    settings, activeSetting, activeStatus, incomingData, dataBuffer,
    saveSetting, deleteSetting, activateSetting, connect, disconnect,
    refreshSettings, clearBuffer, availablePorts, refreshPorts,
  } = useCommunication();
  const { machines, selectedMachine, selectMachine } = useMonitoring();
  const { success, error } = useToast();

  const [selectedMethod, setSelectedMethod] = useState<CommMethod>('wifi');
  const [configName, setConfigName] = useState('');
  const [config, setConfig] = useState<CommConfig>({
    host: 'localhost',
    port: 8080,
    baudRate: 9600,
    serialPort: '',
    broker: '',
    topic: 'sensor/data',
    endpoint: 'http://localhost:3000/api/sensors',
    pollInterval: 2000,
    unitId: 1,
    registerStart: 0,
    registerCount: 10,
    nodeId: 'ns=2;s=Temperature',
    autoReconnect: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    refreshSettings();
    refreshPorts();
  }, [refreshSettings, refreshPorts]);

  const methods = Object.keys(METHOD_LABELS) as CommMethod[];

  const handleSave = async () => {
    if (!configName.trim()) {
      error('Configuration name is required');
      return;
    }
    setSaving(true);
    await saveSetting(configName.trim(), selectedMethod, config);
    setSaving(false);
    setConfigName('');
    success('Configuration saved');
  };

  const handleConnect = async () => {
    if (!activeSetting) {
      // Create a temporary setting from current config
      if (!configName.trim()) {
        error('Select or save a configuration first');
        return;
      }
      await saveSetting(configName.trim(), selectedMethod, config);
      await refreshSettings();
    }
    await connect();
    success(`Connecting via ${METHOD_LABELS[selectedMethod]}...`);
  };

  const handleDisconnect = () => {
    disconnect();
    success('Disconnected');
  };

  const handleActivate = (id: string) => {
    activateSetting(id);
    const setting = settings.find((s) => s.id === id);
    if (setting) {
      setSelectedMethod(setting.method);
      setConfig(setting.config);
      setConfigName(setting.name);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteSetting(id);
    success('Configuration deleted');
  };

  const updateConfig = (updates: Partial<CommConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  const statusCfg = STATUS_CONFIG[activeStatus];

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#060b14', border: '1px solid #1e2d45',
    color: '#e2e8f0', padding: '6px 10px', borderRadius: 4,
    fontSize: 12, outline: 'none',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 10, color: '#94a3b8', marginBottom: 4, display: 'block', fontWeight: 600,
    letterSpacing: '0.3px',
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', borderBottom: '1px solid #1e2d45',
        background: 'linear-gradient(180deg, #0d1220 0%, #080d14 100%)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Radio size={18} color="#3b82f6" />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', letterSpacing: '1px' }}>
            COMMUNICATION MANAGER
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, color: statusCfg.color,
            background: `${statusCfg.color}20`, padding: '2px 8px', borderRadius: 8,
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: statusCfg.color }} />
            {statusCfg.label}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={selectedMachine?.id ?? ''}
            onChange={(e) => selectMachine(e.target.value)}
            style={{
              background: '#060b14', border: '1px solid #1e2d45', color: '#e2e8f0',
              padding: '5px 10px', borderRadius: 4, fontSize: 11, outline: 'none',
            }}
          >
            {machines.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          {activeStatus === 'connected' || activeStatus === 'connecting' ? (
            <button className="btn-secondary" onClick={handleDisconnect} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Square size={12} />
              Disconnect
            </button>
          ) : (
            <button className="btn-monitor" onClick={handleConnect} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Play size={12} />
              Connect
            </button>
          )}
        </div>
      </div>

      {/* Main content: two panels */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left panel: method picker + config + saved */}
        <div style={{
          width: 420, minWidth: 420,
          borderRight: '1px solid #1e2d45',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Method picker */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e2d45' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '1px', marginBottom: 8 }}>
              PROTOCOL
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              {methods.map((method) => {
                const Icon = METHOD_ICONS[method];
                const active = selectedMethod === method;
                return (
                  <button
                    key={method}
                    onClick={() => setSelectedMethod(method)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      padding: '10px 6px',
                      background: active ? '#3b82f615' : '#060b14',
                      border: '1px solid',
                      borderColor: active ? '#3b82f6' : '#1e2d45',
                      borderRadius: 6, cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <Icon size={18} color={active ? '#3b82f6' : '#64748b'} />
                    <span style={{
                      fontSize: 9, fontWeight: 600,
                      color: active ? '#60a5fa' : '#94a3b8',
                      textAlign: 'center',
                    }}>
                      {METHOD_LABELS[method]}
                    </span>
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 8, lineHeight: 1.4 }}>
              {METHOD_DESCRIPTIONS[selectedMethod]}
            </div>
          </div>

          {/* Config form */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '1px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Settings2 size={12} />
              CONFIGURATION
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Configuration Name</label>
              <input
                type="text"
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                placeholder="e.g. Pump Station Wi-Fi"
                style={inputStyle}
              />
            </div>

            {/* Method-specific fields */}
            {selectedMethod === 'usb_serial' && (
              <>
                <div style={{ marginBottom: 10 }}>
                  <label style={labelStyle}>Serial Port</label>
                  <select
                    value={config.serialPort ?? ''}
                    onChange={(e) => updateConfig({ serialPort: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="">Select port...</option>
                    {availablePorts.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={labelStyle}>Baud Rate</label>
                  <select
                    value={config.baudRate ?? 9600}
                    onChange={(e) => updateConfig({ baudRate: parseInt(e.target.value) })}
                    style={inputStyle}
                  >
                    {[9600, 19200, 38400, 57600, 115200].map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {(selectedMethod === 'wifi' || selectedMethod === 'modbus_tcp' || selectedMethod === 'opcua' || selectedMethod === 'mqtt') && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 8, marginBottom: 10 }}>
                  <div>
                    <label style={labelStyle}>{selectedMethod === 'mqtt' ? 'Broker Host' : 'Host / IP'}</label>
                    <input
                      type="text"
                      value={config.host ?? ''}
                      onChange={(e) => updateConfig({ host: e.target.value, broker: e.target.value })}
                      placeholder="192.168.1.100"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Port</label>
                    <input
                      type="number"
                      value={config.port ?? 8080}
                      onChange={(e) => updateConfig({ port: parseInt(e.target.value) || 8080 })}
                      style={inputStyle}
                    />
                  </div>
                </div>
                {selectedMethod === 'mqtt' && (
                  <div style={{ marginBottom: 10 }}>
                    <label style={labelStyle}>Topic</label>
                    <input
                      type="text"
                      value={config.topic ?? ''}
                      onChange={(e) => updateConfig({ topic: e.target.value })}
                      placeholder="sensor/data"
                      style={inputStyle}
                    />
                  </div>
                )}
                {selectedMethod === 'modbus_tcp' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
                      <div>
                        <label style={labelStyle}>Unit ID</label>
                        <input type="number" value={config.unitId ?? 1} onChange={(e) => updateConfig({ unitId: parseInt(e.target.value) || 1 })} style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Reg Start</label>
                        <input type="number" value={config.registerStart ?? 0} onChange={(e) => updateConfig({ registerStart: parseInt(e.target.value) || 0 })} style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Reg Count</label>
                        <input type="number" value={config.registerCount ?? 10} onChange={(e) => updateConfig({ registerCount: parseInt(e.target.value) || 10 })} style={inputStyle} />
                      </div>
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <label style={labelStyle}>Poll Interval (ms)</label>
                      <input type="number" value={config.pollInterval ?? 1000} onChange={(e) => updateConfig({ pollInterval: parseInt(e.target.value) || 1000 })} style={inputStyle} />
                    </div>
                  </>
                )}
                {selectedMethod === 'opcua' && (
                  <div style={{ marginBottom: 10 }}>
                    <label style={labelStyle}>Node ID</label>
                    <input
                      type="text"
                      value={config.nodeId ?? ''}
                      onChange={(e) => updateConfig({ nodeId: e.target.value })}
                      placeholder="ns=2;s=Temperature"
                      style={inputStyle}
                    />
                  </div>
                )}
              </>
            )}

            {selectedMethod === 'rest_api' && (
              <>
                <div style={{ marginBottom: 10 }}>
                  <label style={labelStyle}>API Endpoint URL</label>
                  <input
                    type="text"
                    value={config.endpoint ?? ''}
                    onChange={(e) => updateConfig({ endpoint: e.target.value })}
                    placeholder="http://192.168.1.100/api/sensors"
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={labelStyle}>Poll Interval (ms)</label>
                  <input
                    type="number"
                    value={config.pollInterval ?? 2000}
                    onChange={(e) => updateConfig({ pollInterval: parseInt(e.target.value) || 2000 })}
                    style={inputStyle}
                  />
                </div>
              </>
            )}

            {/* Auto reconnect */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
              padding: '8px 10px', background: '#060b14', borderRadius: 4,
              border: '1px solid #1e2d45',
            }}>
              <input
                type="checkbox"
                checked={config.autoReconnect ?? true}
                onChange={(e) => updateConfig({ autoReconnect: e.target.checked })}
                id="autoReconnect"
              />
              <label htmlFor="autoReconnect" style={{ fontSize: 11, color: '#94a3b8', cursor: 'pointer' }}>
                Auto-Reconnect on disconnect
              </label>
            </div>

            {/* Save button */}
            <button
              className="btn-secondary"
              onClick={handleSave}
              disabled={saving || !configName.trim()}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: !configName.trim() || saving ? 0.5 : 1 }}
            >
              <Save size={13} />
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>

          {/* Saved configurations */}
          <div style={{
            borderTop: '1px solid #1e2d45', maxHeight: 200, overflowY: 'auto',
            flexShrink: 0,
          }}>
            <div style={{
              padding: '8px 16px', borderBottom: '1px solid #1e2d45',
              fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '1px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              SAVED CONFIGURATIONS
              <button onClick={refreshSettings} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <RefreshCw size={11} />
              </button>
            </div>
            {settings.length === 0 ? (
              <div style={{ padding: '12px 16px', fontSize: 10, color: '#64748b' }}>
                No saved configurations
              </div>
            ) : (
              settings.map((setting) => {
                const Icon = METHOD_ICONS[setting.method];
                const isActive = activeSetting?.id === setting.id;
                return (
                  <div
                    key={setting.id}
                    onClick={() => handleActivate(setting.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 16px', cursor: 'pointer',
                      borderBottom: '1px solid #111827',
                      background: isActive ? '#3b82f610' : 'transparent',
                      borderLeft: isActive ? '2px solid #3b82f6' : '2px solid transparent',
                    }}
                  >
                    <Icon size={13} color={isActive ? '#3b82f6' : '#64748b'} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: isActive ? '#e2e8f0' : '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {setting.name}
                      </div>
                      <div style={{ fontSize: 9, color: '#64748b' }}>
                        {METHOD_LABELS[setting.method]}
                        {setting.config.host ? ` · ${setting.config.host}:${setting.config.port}` : ''}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(setting.id); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right panel: live data viewer */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Data viewer header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 16px', borderBottom: '1px solid #1e2d45',
            background: 'linear-gradient(180deg, #0d1220 0%, #080d14 100%)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={14} color="#06b6d4" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '1px' }}>
                LIVE DATA VIEWER
              </span>
              <span style={{
                fontSize: 9, fontWeight: 700, color: '#06b6d4',
                background: '#06b6d420', padding: '2px 6px', borderRadius: 8,
              }}>
                {dataBuffer.length} packets
              </span>
            </div>
            <button
              className="btn-secondary"
              onClick={clearBuffer}
              style={{ fontSize: 10, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Trash2 size={11} />
              Clear
            </button>
          </div>

          {/* Latest reading summary */}
          {incomingData.length > 0 && (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: 8, padding: '12px 16px', borderBottom: '1px solid #1e2d45',
            }}>
              {(() => {
                const last = incomingData[incomingData.length - 1];
                const p = last.parsed;
                return (
                  <>
                    {p.temperature !== undefined && <DataChip label="Temperature" value={`${p.temperature.toFixed(1)}°C`} color="#f97316" />}
                    {p.rmsX !== undefined && <DataChip label="RMS X" value={p.rmsX.toFixed(3)} color="#3b82f6" />}
                    {p.rmsY !== undefined && <DataChip label="RMS Y" value={p.rmsY.toFixed(3)} color="#06b6d4" />}
                    {p.current !== undefined && <DataChip label="Current" value={`${p.current.toFixed(2)}A`} color="#eab308" />}
                    {p.rpm !== undefined && <DataChip label="RPM" value={String(p.rpm)} color="#22d3ee" />}
                    {p.voltage !== undefined && <DataChip label="Voltage" value={`${p.voltage.toFixed(1)}V`} color="#a78bfa" />}
                  </>
                );
              })()}
            </div>
          )}

          {/* Data stream */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
            {incomingData.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#64748b', fontSize: 12, padding: 40 }}>
                <Activity size={32} color="#1e2d45" style={{ margin: '0 auto 12px', display: 'block' }} />
                No data received. Select a protocol, configure, and click Connect.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[...incomingData].reverse().map((entry, i) => (
                  <div
                    key={`${entry.timestamp}-${i}`}
                    style={{
                      padding: '6px 10px', background: '#060b14',
                      border: '1px solid #111827', borderRadius: 4,
                      fontSize: 10, fontFamily: 'monospace',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ color: '#64748b', fontSize: 9 }}>
                        {new Date(entry.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                      </span>
                      <span style={{
                        fontSize: 8, fontWeight: 700, color: '#3b82f6',
                        background: '#3b82f620', padding: '1px 4px', borderRadius: 3,
                      }}>
                        {METHOD_LABELS[entry.method]}
                      </span>
                    </div>
                    <div style={{ color: '#cbd5e1', wordBreak: 'break-all', lineHeight: 1.3 }}>
                      {entry.raw.length > 200 ? entry.raw.slice(0, 200) + '...' : entry.raw}
                    </div>
                    {Object.keys(entry.parsed).length > 0 && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                        {Object.entries(entry.parsed).map(([k, v]) => (
                          <span key={k} style={{ fontSize: 9, color: '#22c55e' }}>
                            {k}={typeof v === 'number' ? v.toFixed(2) : v}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DataChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      padding: '6px 10px', background: '#060b14',
      border: '1px solid #1e2d45', borderRadius: 4,
      display: 'flex', flexDirection: 'column', gap: 2,
    }}>
      <span style={{ fontSize: 8, color: '#64748b', fontWeight: 600, letterSpacing: '0.3px' }}>
        {label.toUpperCase()}
      </span>
      <span style={{ fontSize: 14, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

export default CommunicationPage;
