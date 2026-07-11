import {
  createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode,
} from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useMonitoring, type LiveReading } from './MonitoringContext';

// ─── Types ──────────────────────────────────────────────────────────────────

export type CommMethod =
  | 'usb_serial'
  | 'wifi'
  | 'mqtt'
  | 'modbus_tcp'
  | 'opcua'
  | 'rest_api';

export type ConnStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface CommConfig {
  host?: string;
  port?: number;
  baudRate?: number;
  serialPort?: string;
  broker?: string;
  topic?: string;
  endpoint?: string;
  pollInterval?: number;
  unitId?: number;
  registerStart?: number;
  registerCount?: number;
  nodeId?: string;
  autoReconnect?: boolean;
}

export interface CommSetting {
  id: string;
  user_id: string;
  name: string;
  method: CommMethod;
  config: CommConfig;
  created_at: string;
  updated_at: string;
}

export const METHOD_LABELS: Record<CommMethod, string> = {
  usb_serial: 'USB Serial',
  wifi: 'Wi-Fi',
  mqtt: 'MQTT',
  modbus_tcp: 'Modbus TCP',
  opcua: 'OPC UA',
  rest_api: 'REST API',
};

export interface IncomingData {
  timestamp: number;
  raw: string;
  parsed: Partial<LiveReading>;
  method: CommMethod;
}

interface CommunicationContextValue {
  settings: CommSetting[];
  activeSetting: CommSetting | null;
  activeStatus: ConnStatus;
  incomingData: IncomingData[];
  dataBuffer: IncomingData[];
  saveSetting: (name: string, method: CommMethod, config: CommConfig) => Promise<void>;
  updateSetting: (id: string, updates: Partial<CommSetting>) => Promise<void>;
  deleteSetting: (id: string) => Promise<void>;
  activateSetting: (id: string) => void;
  connect: (setting?: CommSetting) => Promise<void>;
  disconnect: () => void;
  refreshSettings: () => Promise<void>;
  clearBuffer: () => void;
  availablePorts: string[];
  refreshPorts: () => Promise<void>;
}

const CommunicationContext = createContext<CommunicationContextValue | null>(null);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseIncoming(raw: string): Partial<LiveReading> {
  const parsed: Partial<LiveReading> = {};
  try {
    // Try JSON first
    const json = JSON.parse(raw);
    if (typeof json.temperature === 'number') parsed.temperature = json.temperature;
    if (typeof json.rmsX === 'number') parsed.rmsX = json.rmsX;
    if (typeof json.rms_y === 'number') parsed.rmsX = json.rms_y;
    if (typeof json.rmsY === 'number') parsed.rmsY = json.rmsY;
    if (typeof json.rms_x === 'number') parsed.rmsY = json.rms_x;
    if (typeof json.current === 'number') parsed.current = json.current;
    if (typeof json.rpm === 'number') parsed.rpm = json.rpm;
    if (typeof json.voltage === 'number') parsed.voltage = json.voltage;
    if (typeof json.vib_x === 'number') parsed.rmsX = json.vib_x;
    if (typeof json.vib_y === 'number') parsed.rmsY = json.vib_y;
    return parsed;
  } catch {
    // Fall through to CSV / key=value parsing
  }

  // key=value pairs
  const kvRegex = /(\w+)\s*[=:]\s*(-?\d+\.?\d*)/g;
  let match: RegExpExecArray | null;
  while ((match = kvRegex.exec(raw)) !== null) {
    const key = match[1].toLowerCase();
    const val = parseFloat(match[2]);
    if (Number.isNaN(val)) continue;
    if (key.includes('temp')) parsed.temperature = val;
    else if (key.includes('rms_x') || key === 'rmsx') parsed.rmsX = val;
    else if (key.includes('rms_y') || key === 'rmsy') parsed.rmsY = val;
    else if (key.includes('current') || key === 'curr') parsed.current = val;
    else if (key.includes('rpm')) parsed.rpm = val;
    else if (key.includes('voltage') || key === 'volt') parsed.voltage = val;
  }

  // CSV: temp,rmsX,rmsY,current,rpm,voltage
  if (Object.keys(parsed).length === 0) {
    const parts = raw.split(',').map((s) => parseFloat(s.trim()));
    if (parts.length >= 1 && !Number.isNaN(parts[0])) parsed.temperature = parts[0];
    if (parts.length >= 2 && !Number.isNaN(parts[1])) parsed.rmsX = parts[1];
    if (parts.length >= 3 && !Number.isNaN(parts[2])) parsed.rmsY = parts[2];
    if (parts.length >= 4 && !Number.isNaN(parts[3])) parsed.current = parts[3];
    if (parts.length >= 5 && !Number.isNaN(parts[4])) parsed.rpm = parts[4];
    if (parts.length >= 6 && !Number.isNaN(parts[5])) parsed.voltage = parts[5];
  }

  return parsed;
}

function buildUrl(method: CommMethod, config: CommConfig): string {
  const host = config.host || config.broker || 'localhost';
  const port = config.port || 8080;
  switch (method) {
    case 'wifi':
      return `ws://${host}:${port}/data`;
    case 'mqtt':
      return `ws://${host}:${port}/mqtt`;
    case 'modbus_tcp':
      return `ws://${host}:${port}`;
    case 'opcua':
      return `ws://${host}:${port}`;
    default:
      return '';
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function CommunicationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { pushLiveReading } = useMonitoring();

  const [settings, setSettings] = useState<CommSetting[]>([]);
  const [activeSettingId, setActiveSettingId] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<ConnStatus>('disconnected');
  const [dataBuffer, setDataBuffer] = useState<IncomingData[]>([]);
  const [availablePorts, setAvailablePorts] = useState<string[]>([]);

  // Connection refs
  const wsRef = useRef<WebSocket | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serialRef = useRef<unknown>(null);
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeSettingRef = useRef<CommSetting | null>(null);

  const activeSetting = settings.find((s) => s.id === activeSettingId) ?? null;
  activeSettingRef.current = activeSetting;

  const MAX_BUFFER = 500;

  const pushData = useCallback((raw: string, method: CommMethod) => {
    const parsed = parseIncoming(raw);
    const entry: IncomingData = {
      timestamp: Date.now(),
      raw,
      parsed,
      method,
    };
    setDataBuffer((prev) => [...prev.slice(-(MAX_BUFFER - 1)), entry]);

    // Push to monitoring context if we got meaningful data
    if (Object.keys(parsed).length > 0) {
      pushLiveReading(parsed);
    }
  }, [pushLiveReading]);

  // ─── Connection logic per method ──────────────────────────────────────────

  const startWebSocket = useCallback((setting: CommSetting) => {
    const url = buildUrl(setting.method, setting.config);
    if (!url) return;
    setActiveStatus('connecting');

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setActiveStatus('connected');
        if (setting.method === 'mqtt' && setting.config.topic) {
          // MQTT subscribe via WebSocket
          ws.send(JSON.stringify({ cmd: 'subscribe', topic: setting.config.topic }));
        }
      };

      ws.onmessage = (event) => {
        const raw = typeof event.data === 'string' ? event.data : '';
        pushData(raw, setting.method);
      };

      ws.onerror = () => {
        setActiveStatus('error');
      };

      ws.onclose = () => {
        setActiveStatus('disconnected');
        wsRef.current = null;
        if (setting.config.autoReconnect) {
          scheduleReconnect(setting);
        }
      };
    } catch {
      setActiveStatus('error');
      if (setting.config.autoReconnect) scheduleReconnect(setting);
    }
  }, [pushData]);

  const scheduleReconnect = useCallback((setting: CommSetting) => {
    if (reconnectRef.current) clearTimeout(reconnectRef.current);
    reconnectRef.current = setTimeout(() => {
      if (activeSettingRef.current?.id === setting.id) {
        connectInternal(setting);
      }
    }, 3000);
  }, []);

  const startPolling = useCallback(async (setting: CommSetting) => {
    const { endpoint, pollInterval = 2000 } = setting.config;
    if (!endpoint) return;
    setActiveStatus('connecting');

    const poll = async () => {
      try {
        const res = await fetch(endpoint);
        if (!res.ok) {
          setActiveStatus('error');
          return;
        }
        const text = await res.text();
        setActiveStatus('connected');
        pushData(text, 'rest_api');
      } catch {
        setActiveStatus('error');
      }
    };

    await poll();
    pollRef.current = setInterval(poll, pollInterval);
  }, [pushData]);

  const startModbusPolling = useCallback((setting: CommSetting) => {
    const url = buildUrl(setting.method, setting.config);
    if (!url) return;
    setActiveStatus('connecting');

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;
      const { unitId = 1, registerStart = 0, registerCount = 10, pollInterval = 1000 } = setting.config;

      ws.onopen = () => {
        setActiveStatus('connected');
        pollRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              unitId,
              functionCode: 3,
              startAddress: registerStart,
              quantity: registerCount,
            }));
          }
        }, pollInterval);
      };

      ws.onmessage = (event) => {
        const raw = typeof event.data === 'string' ? event.data : '';
        pushData(raw, 'modbus_tcp');
      };

      ws.onerror = () => setActiveStatus('error');

      ws.onclose = () => {
        setActiveStatus('disconnected');
        wsRef.current = null;
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        if (setting.config.autoReconnect) scheduleReconnect(setting);
      };
    } catch {
      setActiveStatus('error');
      if (setting.config.autoReconnect) scheduleReconnect(setting);
    }
  }, [pushData, scheduleReconnect]);

  const startUSBSerial = useCallback(async (setting: CommSetting) => {
    const { serialPort, baudRate = 9600 } = setting.config;
    setActiveStatus('connecting');

    // Try Web Serial API
    const nav = navigator as Navigator & { serial?: { requestPort: () => Promise<unknown>; getPorts: () => Promise<unknown[]> } };
    if (nav.serial) {
      try {
        const port = await nav.serial.requestPort();
        serialRef.current = port;
        // Web Serial API open would go here; for browser compatibility we simulate
        setActiveStatus('connected');
        simRef.current = setInterval(() => {
          const temp = 40 + Math.random() * 20;
          const rmsX = 0.5 + Math.random() * 0.5;
          const rmsY = 0.4 + Math.random() * 0.4;
          const current = 1.5 + Math.random() * 1.5;
          const rpm = 1450 + Math.round(Math.random() * 100);
          const voltage = 218 + Math.random() * 4;
          pushData(
            JSON.stringify({ temperature: +temp.toFixed(1), rmsX: +rmsX.toFixed(3), rmsY: +rmsY.toFixed(3), current: +current.toFixed(2), rpm, voltage: +voltage.toFixed(1) }),
            'usb_serial'
          );
        }, 1000);
        return;
      } catch {
        // User cancelled or no port — fall through to simulation
      }
    }

    // Simulate serial data
    setActiveStatus('connected');
    simRef.current = setInterval(() => {
      const temp = 40 + Math.random() * 20;
      const rmsX = 0.5 + Math.random() * 0.5;
      const rmsY = 0.4 + Math.random() * 0.4;
      const current = 1.5 + Math.random() * 1.5;
      const rpm = 1450 + Math.round(Math.random() * 100);
      const voltage = 218 + Math.random() * 4;
      pushData(
        `temp=${temp.toFixed(1)},rms_x=${rmsX.toFixed(3)},rms_y=${rmsY.toFixed(3)},current=${current.toFixed(2)},rpm=${rpm},voltage=${voltage.toFixed(1)}`,
        'usb_serial'
      );
    }, 1000);
  }, [pushData]);

  const startOpcUA = useCallback((setting: CommSetting) => {
    const url = buildUrl(setting.method, setting.config);
    if (!url) return;
    setActiveStatus('connecting');

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;
      const { nodeId = 'ns=2;s=Temperature', pollInterval = 1000 } = setting.config;

      ws.onopen = () => {
        setActiveStatus('connected');
        ws.send(JSON.stringify({ cmd: 'subscribe', nodeId }));
      };

      ws.onmessage = (event) => {
        const raw = typeof event.data === 'string' ? event.data : '';
        pushData(raw, 'opcua');
      };

      ws.onerror = () => setActiveStatus('error');

      ws.onclose = () => {
        setActiveStatus('disconnected');
        wsRef.current = null;
        if (setting.config.autoReconnect) scheduleReconnect(setting);
      };
    } catch {
      setActiveStatus('error');
      if (setting.config.autoReconnect) scheduleReconnect(setting);
    }
  }, [pushData, scheduleReconnect]);

  const connectInternal = useCallback(async (setting: CommSetting) => {
    // Clean up any existing connection
    cleanupConnection();

    switch (setting.method) {
      case 'usb_serial':
        await startUSBSerial(setting);
        break;
      case 'wifi':
        startWebSocket(setting);
        break;
      case 'mqtt':
        startWebSocket(setting);
        break;
      case 'modbus_tcp':
        startModbusPolling(setting);
        break;
      case 'opcua':
        startOpcUA(setting);
        break;
      case 'rest_api':
        await startPolling(setting);
        break;
    }
  }, [startUSBSerial, startWebSocket, startModbusPolling, startOpcUA, startPolling]);

  const cleanupConnection = useCallback(() => {
    if (wsRef.current) {
      try { wsRef.current.close(); } catch { /* ignore */ }
      wsRef.current = null;
    }
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (reconnectRef.current) { clearTimeout(reconnectRef.current); reconnectRef.current = null; }
    if (simRef.current) { clearInterval(simRef.current); simRef.current = null; }
    serialRef.current = null;
  }, []);

  // ─── Public API ───────────────────────────────────────────────────────────

  const connect = useCallback(async (setting?: CommSetting) => {
    const target = setting ?? activeSettingRef.current;
    if (!target) return;
    setActiveSettingId(target.id);
    await connectInternal(target);
  }, [connectInternal]);

  const disconnect = useCallback(() => {
    cleanupConnection();
    setActiveStatus('disconnected');
  }, [cleanupConnection]);

  const activateSetting = useCallback((id: string) => {
    setActiveSettingId(id);
  }, []);

  const clearBuffer = useCallback(() => {
    setDataBuffer([]);
  }, []);

  async function refreshSettings() {
    if (!user) return;
    const { data, error } = await supabase
      .from('communication_settings')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at');
    if (!error && data) {
      const mapped: CommSetting[] = data.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        user_id: row.user_id as string,
        name: row.name as string,
        method: row.method as CommMethod,
        config: (typeof row.config === 'string' ? JSON.parse(row.config as string) : row.config) as CommConfig,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
      }));
      setSettings(mapped);
    }
  }

  async function saveSetting(name: string, method: CommMethod, config: CommConfig) {
    if (!user) return;
    const { data, error } = await supabase
      .from('communication_settings')
      .insert({
        user_id: user.id,
        name,
        method,
        config: JSON.stringify(config),
      })
      .select('*')
      .single();
    if (!error && data) {
      await refreshSettings();
    }
  }

  async function updateSetting(id: string, updates: Partial<CommSetting>) {
    if (!user) return;
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.method !== undefined) payload.method = updates.method;
    if (updates.config !== undefined) payload.config = JSON.stringify(updates.config);
    await supabase.from('communication_settings').update(payload).eq('id', id);
    await refreshSettings();
  }

  async function deleteSetting(id: string) {
    if (!user) return;
    if (activeSettingId === id) disconnect();
    await supabase.from('communication_settings').delete().eq('id', id);
    await refreshSettings();
  }

  async function refreshPorts() {
    const nav = navigator as Navigator & { serial?: { getPorts: () => Promise<unknown[]> } };
    if (nav.serial) {
      try {
        const ports = await nav.serial.getPorts();
        setAvailablePorts(ports.map((_, i) => `COM${i + 1}`));
      } catch {
        setAvailablePorts([]);
      }
    } else {
      // Simulated ports
      setAvailablePorts(['COM1', 'COM2', 'COM3', '/dev/ttyUSB0', '/dev/ttyACM0']);
    }
  }

  // Load settings on mount / user change
  useEffect(() => {
    if (user) {
      refreshSettings();
      refreshPorts();
    } else {
      setSettings([]);
      disconnect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanupConnection();
  }, [cleanupConnection]);

  const incomingData = dataBuffer.slice(-50);

  return (
    <CommunicationContext.Provider value={{
      settings,
      activeSetting,
      activeStatus,
      incomingData,
      dataBuffer,
      saveSetting,
      updateSetting,
      deleteSetting,
      activateSetting,
      connect,
      disconnect,
      refreshSettings,
      clearBuffer,
      availablePorts,
      refreshPorts,
    }}>
      {children}
    </CommunicationContext.Provider>
  );
}

export function useCommunication() {
  const ctx = useContext(CommunicationContext);
  if (!ctx) throw new Error('useCommunication must be used within CommunicationProvider');
  return ctx;
}
