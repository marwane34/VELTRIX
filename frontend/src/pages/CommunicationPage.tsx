import { useState, useEffect } from 'react';
import { Usb, Wifi, MessageSquare, Globe, Network, Server, Power, PowerOff } from 'lucide-react';
import { useCommunication } from '../contexts/CommunicationContext';
import { useToast } from '../components/Toast';
import { Sidebar } from '../components/Sidebar';
import type { ProtocolType } from '../types';

interface ProtocolMeta {
  type: ProtocolType;
  label: string;
  icon: any;
  color: string;
  description: string;
  fields: { key: string; label: string; type?: 'text' | 'select' | 'number' | 'textarea'; options?: string[]; placeholder?: string }[];
}

const PROTOCOLS: ProtocolMeta[] = [
  {
    type: 'usb_serial',
    label: 'USB Serial',
    icon: Usb,
    color: 'var(--accent-blue)',
    description: 'Direct USB serial connection to the data acquisition device.',
    fields: [
      { key: 'comPort', label: 'COM Port', type: 'text', placeholder: 'COM3' },
      { key: 'baudRate', label: 'Baud Rate', type: 'select', options: ['9600', '19200', '38400', '57600', '115200', '230400'] },
      { key: 'dataBits', label: 'Data Bits', type: 'select', options: ['7', '8'] },
      { key: 'parity', label: 'Parity', type: 'select', options: ['none', 'even', 'odd'] },
      { key: 'stopBits', label: 'Stop Bits', type: 'select', options: ['1', '2'] },
    ],
  },
  {
    type: 'wifi',
    label: 'Wi-Fi',
    icon: Wifi,
    color: 'var(--accent-cyan)',
    description: 'Wireless network connection over local Wi-Fi.',
    fields: [
      { key: 'ssid', label: 'SSID', type: 'text', placeholder: 'Network name' },
      { key: 'wifiPassword', label: 'Password', type: 'text', placeholder: '••••••••' },
      { key: 'wifiIp', label: 'IP Address', type: 'text', placeholder: '192.168.1.100' },
      { key: 'wifiPort', label: 'Port', type: 'text', placeholder: '8080' },
    ],
  },
  {
    type: 'mqtt',
    label: 'MQTT',
    icon: MessageSquare,
    color: 'var(--accent-purple)',
    description: 'MQTT messaging protocol for IoT telemetry streaming.',
    fields: [
      { key: 'mqttBroker', label: 'Broker URL', type: 'text', placeholder: 'broker.hivemq.com' },
      { key: 'mqttPort', label: 'Port', type: 'text', placeholder: '1883' },
      { key: 'mqttTopic', label: 'Topic', type: 'text', placeholder: 'veltrix/sensor/data' },
      { key: 'mqttClientId', label: 'Client ID', type: 'text', placeholder: 'veltrix-client-01' },
      { key: 'mqttUsername', label: 'Username', type: 'text', placeholder: 'user' },
      { key: 'mqttPassword', label: 'Password', type: 'text', placeholder: '••••••••' },
    ],
  },
  {
    type: 'rest_api',
    label: 'REST API',
    icon: Globe,
    color: 'var(--accent-green)',
    description: 'HTTP REST API polling for sensor data retrieval.',
    fields: [
      { key: 'apiUrl', label: 'API URL', type: 'text', placeholder: 'https://api.example.com/sensors' },
      { key: 'apiMethod', label: 'Method', type: 'select', options: ['GET', 'POST'] },
      { key: 'restInterval', label: 'Polling Interval (ms)', type: 'number', placeholder: '2000' },
      { key: 'apiHeaders', label: 'Headers (JSON)', type: 'textarea', placeholder: '{"Authorization": "Bearer token"}' },
    ],
  },
  {
    type: 'modbus_tcp',
    label: 'Modbus TCP',
    icon: Network,
    color: 'var(--accent-orange)',
    description: 'Modbus TCP protocol for industrial PLC communication.',
    fields: [
      { key: 'modbusIp', label: 'IP Address', type: 'text', placeholder: '192.168.1.50' },
      { key: 'modbusPort', label: 'Port', type: 'text', placeholder: '502' },
      { key: 'unitId', label: 'Unit ID', type: 'text', placeholder: '1' },
      { key: 'registerAddress', label: 'Register Address', type: 'text', placeholder: '40001' },
      { key: 'functionCode', label: 'Function Code', type: 'select', options: ['1', '2', '3', '4'] },
    ],
  },
  {
    type: 'opc_ua',
    label: 'OPC UA',
    icon: Server,
    color: 'var(--accent-red)',
    description: 'OPC UA protocol for unified architecture industrial data exchange.',
    fields: [
      { key: 'opcEndpoint', label: 'Endpoint URL', type: 'text', placeholder: 'opc.tcp://localhost:4840' },
      { key: 'nodeId', label: 'Node ID', type: 'text', placeholder: 'ns=2;s=Sensor.Vibration' },
      { key: 'securityMode', label: 'Security Mode', type: 'select', options: ['None', 'Sign', 'SignAndEncrypt'] },
    ],
  },
];

export function CommunicationPage() {
  const { configs, activeProtocol, activateProtocol, deactivateProtocol, connectionStatus } = useCommunication();
  const { showSuccess, showError } = useToast();

  // Local form state for each protocol
  const [formStates, setFormStates] = useState<Record<string, Record<string, string>>>({});

  // Initialize form state from saved configs
  useEffect(() => {
    const newStates: Record<string, Record<string, string>> = {};
    for (const proto of PROTOCOLS) {
      const saved = configs.find((c) => c.protocol === proto.type);
      if (saved && saved.config) {
        newStates[proto.type] = {};
        for (const field of proto.fields) {
          newStates[proto.type][field.key] = saved.config[field.key] != null ? String(saved.config[field.key]) : '';
        }
      } else if (!formStates[proto.type]) {
        newStates[proto.type] = {};
        for (const field of proto.fields) {
          newStates[proto.type][field.key] = '';
        }
      }
    }
    if (Object.keys(newStates).length > 0) {
      setFormStates((prev) => ({ ...newStates, ...prev }));
    }
  }, [configs]);

  const updateField = (protocol: string, key: string, value: string) => {
    setFormStates((prev) => ({
      ...prev,
      [protocol]: {
        ...(prev[protocol] || {}),
        [key]: value,
      },
    }));
  };

  const handleActivate = async (proto: ProtocolMeta) => {
    const formData = formStates[proto.type] || {};
    // Build config object from form
    const config: Record<string, any> = {};
    for (const field of proto.fields) {
      const val = formData[field.key] ?? '';
      if (field.type === 'number') {
        config[field.key] = Number(val) || 0;
      } else {
        config[field.key] = val;
      }
    }

    const ok = await activateProtocol(proto.type, config);
    if (ok) {
      showSuccess(`${proto.label} protocol activated successfully.`);
    } else {
      showError(`Failed to activate ${proto.label} protocol.`);
    }
  };

  const handleDeactivate = async () => {
    await deactivateProtocol();
    showSuccess('Protocol deactivated successfully.');
  };

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <Sidebar onAddMachine={() => {}} />
      <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Communication Protocols</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Configure and manage data acquisition protocols
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Connection Status:</span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                background:
                  connectionStatus === 'connected'
                    ? 'rgba(34, 197, 94, 0.15)'
                    : connectionStatus === 'connecting'
                    ? 'rgba(59, 130, 246, 0.15)'
                    : connectionStatus === 'error'
                    ? 'rgba(239, 68, 68, 0.15)'
                    : 'rgba(100, 116, 139, 0.15)',
                color:
                  connectionStatus === 'connected'
                    ? 'var(--accent-green)'
                    : connectionStatus === 'connecting'
                    ? 'var(--accent-blue)'
                    : connectionStatus === 'error'
                    ? 'var(--accent-red)'
                    : 'var(--text-muted)',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background:
                    connectionStatus === 'connected'
                      ? 'var(--accent-green)'
                      : connectionStatus === 'connecting'
                      ? 'var(--accent-blue)'
                      : connectionStatus === 'error'
                      ? 'var(--accent-red)'
                      : 'var(--text-muted)',
                }}
              />
              {connectionStatus}
            </span>
          </div>
        </div>

        {/* Protocol Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 12 }}>
          {PROTOCOLS.map((proto) => {
            const Icon = proto.icon;
            const isActive = activeProtocol === proto.type;
            const formData = formStates[proto.type] || {};

            return (
              <div
                key={proto.type}
                className="panel"
                style={{
                  padding: 0,
                  border: isActive ? '2px solid var(--accent-green)' : '1px solid var(--border-primary)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Card Header */}
                <div
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--border-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: 'var(--bg-elevated)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={18} color={proto.color} />
                    </div>
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{proto.label}</span>
                      {isActive && (
                        <span className="badge badge-success" style={{ marginLeft: 8 }}>Active</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div style={{ padding: '10px 16px 0 16px' }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{proto.description}</p>
                </div>

                {/* Form Fields */}
                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                  {proto.fields.map((field) => (
                    <div key={field.key}>
                      <label
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: 'var(--text-secondary)',
                          marginBottom: 4,
                          display: 'block',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {field.label}
                      </label>
                      {field.type === 'select' ? (
                        <select
                          className="input"
                          value={formData[field.key] ?? ''}
                          onChange={(e) => updateField(proto.type, field.key, e.target.value)}
                          style={{ cursor: 'pointer' }}
                        >
                          <option value="">— Select —</option>
                          {field.options?.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : field.type === 'textarea' ? (
                        <textarea
                          className="input"
                          value={formData[field.key] ?? ''}
                          onChange={(e) => updateField(proto.type, field.key, e.target.value)}
                          placeholder={field.placeholder}
                          rows={2}
                          style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 11 }}
                        />
                      ) : (
                        <input
                          className="input"
                          type={field.type === 'number' ? 'number' : 'text'}
                          value={formData[field.key] ?? ''}
                          onChange={(e) => updateField(proto.type, field.key, e.target.value)}
                          placeholder={field.placeholder}
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* Card Footer — Activate/Deactivate */}
                <div
                  style={{
                    padding: '10px 16px',
                    borderTop: '1px solid var(--border-primary)',
                    display: 'flex',
                    gap: 8,
                  }}
                >
                  {isActive ? (
                    <button
                      className="btn btn-secondary"
                      onClick={handleDeactivate}
                      style={{ flex: 1, gap: 6, color: 'var(--accent-red)' }}
                    >
                      <PowerOff size={14} />
                      Deactivate
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary"
                      onClick={() => handleActivate(proto)}
                      style={{ flex: 1, gap: 6 }}
                    >
                      <Power size={14} />
                      Activate
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default CommunicationPage;
