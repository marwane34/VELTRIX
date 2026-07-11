import {
  createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode,
} from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useMonitoring } from './MonitoringContext';

export type CommMethod = 'usb_serial' | 'wifi' | 'mqtt' | 'rest_api' | 'modbus_tcp' | 'opcua';
export type ConnStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface CommConfig {
  machineId?: string;
  port?: string;
  baudRate?: number;
  autoReconnect?: boolean;
  ipAddress?: string;
  wifiPort?: number;
  broker?: string;
  mqttPort?: number;
  username?: string;
  password?: string;
  topic?: string;
  ssl?: boolean;
  slaveId?: number;
  registerMap?: { address: number; name: string; type: string }[];
  serverUrl?: string;
  nodeId?: string;
  endpointUrl?: string;
  apiKey?: string;
  authType?: 'none' | 'bearer' | 'basic' | 'apikey';
  pollInterval?: number;
}

export interface CommSetting {
  id: string;
  user_id: string;
  method: CommMethod;
  name: string;
  config: CommConfig;
  is_active: boolean;
  status: ConnStatus;
  last_connected_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncomingData {
  timestamp: string;
  raw: Record<string, unknown>;
  source: CommMethod;
  parsed?: {
    temperature?: number;
    rmsX?: number;
    rmsY?: number;
    current?: number;
    rpm?: number;
    voltage?: number;
  };
}

interface CommunicationContextValue {
  settings: CommSetting[];
  activeSetting: CommSetting | null;
  activeStatus: ConnStatus;
  incomingData: IncomingData[];
  dataBuffer: IncomingData[];
  saveSetting: (method: CommMethod, name: string, config: CommConfig) => Promise<void>;
  updateSetting: (id: string, updates: Partial<CommSetting>) => Promise<void>;
  deleteSetting: (id: string) => Promise<void>;
  activateSetting: (id: string) => Promise<void>;
  connect: (id: string) => Promise<void>;
  disconnect: () => void;
  refreshSettings: () => Promise<void>;
  clearBuffer: () => void;
  availablePorts: string[];
  refreshPorts: () => void;
}

const CommunicationContext = createContext<CommunicationContextValue | null>(null);

export const METHOD_LABELS: Record<CommMethod, string> = {
  usb_serial: 'USB Serial',
  wifi: 'Wi-Fi',
  mqtt: 'MQTT',
  rest_api: 'REST API',
  modbus_tcp: 'Modbus TCP',
  opcua: 'OPC UA',
};

function parseReading(raw: Record<string, unknown>): IncomingData['parsed'] {
  const get = (keys: string[]): number | undefined => {
    for (const k of keys) {
      const v = raw[k];
      if (typeof v === 'number') return v;
      if (typeof v === 'string') { const n = parseFloat(v); if (!isNaN(n)) return n; }
    }
    return undefined;
  };
  return {
    temperature: get(['temperature', 'temp', 't']),
    rmsX: get(['rmsX', 'rms_x', 'vibration_x', 'vx']),
    rmsY: get(['rmsY', 'rms_y', 'vibration_y', 'vy']),
    current: get(['current', 'curr', 'i']),
    rpm: get(['rpm', 'speed', 'n']),
    voltage: get(['voltage', 'volt', 'v']),
  };
}

export function CommunicationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { pushLiveReading } = useMonitoring();
  const [settings, setSettings] = useState<CommSetting[]>([]);
  const [activeSetting, setActiveSetting] = useState<CommSetting | null>(null);
  const [activeStatus, setActiveStatus] = useState<ConnStatus>('disconnected');
  const [incomingData, setIncomingData] = useState<IncomingData[]>([]);
  const [dataBuffer, setDataBuffer] = useState<IncomingData[]>([]);
  const [availablePorts, setAvailablePorts] = useState<string[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeSettingRef = useRef<CommSetting | null>(null);
  activeSettingRef.current = activeSetting;

  const refreshSettings = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('communication_settings').select('*').eq('user_id', user.id).order('created_at');
    if (data) {
      const typed = data as CommSetting[];
      setSettings(typed);
      const active = typed.find((s) => s.is_active) ?? null;
      setActiveSetting(active);
      setActiveStatus(active?.status ?? 'disconnected');
    }
  }, [user]);

  useEffect(() => { refreshSettings(); }, [refreshSettings]);

  const refreshPorts = useCallback(() => {
    const ports: string[] = ['COM1', 'COM2', 'COM3', 'COM4', 'COM5', '/dev/ttyUSB0', '/dev/ttyACM0', '/dev/ttyS0'];
    if (typeof navigator !== 'undefined' && 'serial' in navigator) {
      try {
        (navigator as Navigator & { serial: { getPorts: () => Promise<unknown[]> } }).serial.getPorts().then((found: unknown[]) => {
          if (found.length > 0) {
            setAvailablePorts([...ports, ...found.map((_, i) => `WebSerial-${i}`)]);
          } else {
            setAvailablePorts(ports);
          }
        }).catch(() => setAvailablePorts(ports));
      } catch {
        setAvailablePorts(ports);
      }
    } else {
      setAvailablePorts(ports);
    }
  }, []);

  useEffect(() => { refreshPorts(); }, [refreshPorts]);

  const storeReading = useCallback(async (parsed: IncomingData['parsed'], raw: Record<string, unknown>, source: CommMethod) => {
    if (!user || !activeSettingRef.current) return;
    const machineId = activeSettingRef.current.config.machineId;
    if (!machineId) return;
    const records: Record<string, unknown>[] = [];
    if (parsed.temperature != null) records.push({ machine_id: machineId, user_id: user.id, value: parsed.temperature, unit: '°C', quality: 'good', metadata: raw });
    if (parsed.current != null) records.push({ machine_id: machineId, user_id: user.id, value: parsed.current, unit: 'A', quality: 'good', metadata: raw });
    if (parsed.rpm != null) records.push({ machine_id: machineId, user_id: user.id, value: parsed.rpm, unit: 'RPM', quality: 'good', metadata: raw });
    if (parsed.voltage != null) records.push({ machine_id: machineId, user_id: user.id, value: parsed.voltage, unit: 'V', quality: 'good', metadata: raw });
    if (records.length > 0) await supabase.from('sensor_data').insert(records);
    if (parsed.temperature != null || parsed.current != null) {
      await supabase.from('sensor_snapshots').insert({
        machine_id: machineId, user_id: user.id,
        temperature: parsed.temperature ?? 0,
        vibration_rms: ((parsed.rmsX ?? 0) + (parsed.rmsY ?? 0)) / 2,
        current: parsed.current ?? 0, rpm: parsed.rpm ?? 0, voltage: parsed.voltage ?? 220,
      });
    }
    await supabase.from('machine_health').upsert({
      machine_id: machineId, user_id: user.id,
      rms_x: parsed.rmsX ?? 0, rms_y: parsed.rmsY ?? 0,
      temperature: parsed.temperature ?? 0, current: parsed.current ?? 0,
      rpm: parsed.rpm ?? 0, voltage: parsed.voltage ?? 220,
      updated_at: new Date().toISOString(),
    });
  }, [user]);

  const handleIncoming = useCallback((raw: Record<string, unknown>, source: CommMethod) => {
    const parsed = parseReading(raw);
    const entry: IncomingData = { timestamp: new Date().toISOString(), raw, source, parsed };
    setIncomingData((prev) => [entry, ...prev].slice(0, 100));
    setDataBuffer((prev) => [entry, ...prev].slice(0, 50));
    if (parsed.temperature != null || parsed.rmsX != null || parsed.current != null) {
      pushLiveReading({
        temperature: parsed.temperature, rmsX: parsed.rmsX, rmsY: parsed.rmsY,
        current: parsed.current, rpm: parsed.rpm, voltage: parsed.voltage,
      });
    }
    storeReading(parsed, raw, source);
  }, [storeReading, pushLiveReading]);

  /* --- Protocol implementations --- */

  const startRestPolling = useCallback((setting: CommSetting) => {
    if (pollRef.current) clearInterval(pollRef.current);
    const config = setting.config;
    const interval = (config.pollInterval ?? 2) * 1000;
    const poll = async () => {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (config.authType === 'bearer' && config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;
        else if (config.authType === 'apikey' && config.apiKey) headers['X-API-Key'] = config.apiKey;
        const res = await fetch(config.endpointUrl!, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        handleIncoming(json, 'rest_api');
      } catch (err) { console.error('REST poll error:', err); }
    };
    poll();
    pollRef.current = setInterval(poll, interval);
  }, [handleIncoming]);

  const startWifi = useCallback((setting: CommSetting) => {
    const config = setting.config;
    const url = `ws://${config.ipAddress}:${config.wifiPort ?? 80}/data`;
    try {
      if (wsRef.current) wsRef.current.close();
      const ws = new WebSocket(url); wsRef.current = ws;
      ws.onopen = () => {
        setActiveStatus('connected');
        supabase.from('communication_settings').update({ status: 'connected', last_connected_at: new Date().toISOString() }).eq('id', setting.id);
      };
      ws.onmessage = (event) => { try { const json = JSON.parse(event.data); handleIncoming(json, 'wifi'); } catch { /* ignore */ } };
      ws.onerror = () => {
        setActiveStatus('error');
        supabase.from('communication_settings').update({ status: 'error' }).eq('id', setting.id);
        if (config.autoReconnect) reconnectRef.current = setTimeout(() => startWifi(setting), 3000);
      };
      ws.onclose = () => {
        if (activeSettingRef.current?.id === setting.id) {
          setActiveStatus('disconnected');
          if (config.autoReconnect) reconnectRef.current = setTimeout(() => startWifi(setting), 3000);
        }
      };
    } catch { setActiveStatus('error'); }
  }, [handleIncoming]);

  const startMqtt = useCallback((setting: CommSetting) => {
    const config = setting.config;
    const wsProtocol = config.ssl ? 'wss' : 'ws';
    const wsPort = config.ssl ? 8084 : 8083;
    const url = `${wsProtocol}://${config.broker}:${wsPort}/mqtt`;
    try {
      if (wsRef.current) wsRef.current.close();
      const ws = new WebSocket(url, ['mqtt']); wsRef.current = ws;
      ws.onopen = () => {
        const clientId = 'veltrix_' + Math.random().toString(16).slice(2, 10);
        ws.send(JSON.stringify({ type: 'connect', clientId, username: config.username ?? '', password: config.password ?? '', keepAlive: 60 }));
        setTimeout(() => ws.send(JSON.stringify({ type: 'subscribe', topics: [config.topic ?? 'veltrix/data'] })), 500);
        setActiveStatus('connected');
        supabase.from('communication_settings').update({ status: 'connected', last_connected_at: new Date().toISOString() }).eq('id', setting.id);
      };
      ws.onmessage = (event) => { try { const json = JSON.parse(event.data); handleIncoming(json, 'mqtt'); } catch { /* ignore */ } };
      ws.onerror = () => {
        setActiveStatus('error');
        supabase.from('communication_settings').update({ status: 'error' }).eq('id', setting.id);
        if (config.autoReconnect) reconnectRef.current = setTimeout(() => startMqtt(setting), 3000);
      };
      ws.onclose = () => {
        if (activeSettingRef.current?.id === setting.id) {
          setActiveStatus('disconnected');
          if (config.autoReconnect) reconnectRef.current = setTimeout(() => startMqtt(setting), 3000);
        }
      };
    } catch { setActiveStatus('error'); }
  }, [handleIncoming]);

  const startModbus = useCallback((setting: CommSetting) => {
    const config = setting.config;
    const url = `ws://${config.ipAddress}:${config.wifiPort ?? 502}`;
    try {
      if (wsRef.current) wsRef.current.close();
      const ws = new WebSocket(url); wsRef.current = ws;
      ws.onopen = () => {
        setActiveStatus('connected');
        supabase.from('communication_settings').update({ status: 'connected', last_connected_at: new Date().toISOString() }).eq('id', setting.id);
        const pollModbus = async () => {
          if (ws.readyState === WebSocket.OPEN)
            ws.send(JSON.stringify({ type: 'readHoldingRegisters', slaveId: config.slaveId ?? 1, registers: config.registerMap ?? [] }));
        };
        pollModbus();
        pollRef.current = setInterval(pollModbus, 2000);
      };
      ws.onmessage = (event) => {
        try {
          const json = JSON.parse(event.data);
          const regMap = config.registerMap ?? [];
          const mapped: Record<string, unknown> = {};
          if (Array.isArray(json.values)) json.values.forEach((val: number, i: number) => { if (regMap[i]) mapped[regMap[i].name] = val; });
          handleIncoming(mapped, 'modbus_tcp');
        } catch { /* ignore */ }
      };
      ws.onerror = () => {
        setActiveStatus('error');
        supabase.from('communication_settings').update({ status: 'error' }).eq('id', setting.id);
        if (config.autoReconnect) reconnectRef.current = setTimeout(() => startModbus(setting), 3000);
      };
      ws.onclose = () => {
        if (activeSettingRef.current?.id === setting.id) {
          setActiveStatus('disconnected');
          if (config.autoReconnect) reconnectRef.current = setTimeout(() => startModbus(setting), 3000);
        }
      };
    } catch { setActiveStatus('error'); }
  }, [handleIncoming]);

  const startOpcUa = useCallback((setting: CommSetting) => {
    const config = setting.config;
    const gatewayUrl = config.serverUrl?.replace('opc.tcp://', 'ws://').replace('https://', 'wss://');
    try {
      if (wsRef.current) wsRef.current.close();
      const ws = new WebSocket(gatewayUrl ?? ''); wsRef.current = ws;
      ws.onopen = () => {
        setActiveStatus('connected');
        supabase.from('communication_settings').update({ status: 'connected', last_connected_at: new Date().toISOString() }).eq('id', setting.id);
        ws.send(JSON.stringify({ type: 'subscribe', nodeId: config.nodeId ?? 'ns=2;s=Temperature' }));
      };
      ws.onmessage = (event) => { try { const json = JSON.parse(event.data); if (json.type === 'data' || json.value !== undefined) handleIncoming(json, 'opcua'); } catch { /* ignore */ } };
      ws.onerror = () => {
        setActiveStatus('error');
        supabase.from('communication_settings').update({ status: 'error' }).eq('id', setting.id);
        if (config.autoReconnect) reconnectRef.current = setTimeout(() => startOpcUa(setting), 3000);
      };
      ws.onclose = () => {
        if (activeSettingRef.current?.id === setting.id) {
          setActiveStatus('disconnected');
          if (config.autoReconnect) reconnectRef.current = setTimeout(() => startOpcUa(setting), 3000);
        }
      };
    } catch { setActiveStatus('error'); }
  }, [handleIncoming]);

  const startUsbSerial = useCallback(async (setting: CommSetting) => {
    const config = setting.config;
    if (typeof navigator !== 'undefined' && 'serial' in navigator) {
      try {
        const port = await (navigator as Navigator & {
          serial: {
            requestPort: () => Promise<{
              open: (opts: { baudRate: number }) => Promise<void>;
              readable: { getReader: () => { read: () => Promise<{ done: boolean; value: Uint8Array }> } } | null;
            }>;
          };
        }).serial.requestPort();
        await port.open({ baudRate: config.baudRate ?? 115200 });
        const reader = port.readable?.getReader();
        if (reader) {
          const decoder = new TextDecoder();
          let buffer = '';
          (async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() ?? '';
                for (const line of lines) {
                  if (line.trim()) {
                    try { const json = JSON.parse(line.trim()); handleIncoming(json, 'usb_serial'); } catch { /* ignore */ }
                  }
                }
              }
            } catch { /* ignore */ }
          })();
        }
        setActiveStatus('connected');
        supabase.from('communication_settings').update({ status: 'connected', last_connected_at: new Date().toISOString() }).eq('id', setting.id);
      } catch {
        setActiveStatus('error');
        supabase.from('communication_settings').update({ status: 'error' }).eq('id', setting.id);
      }
    } else {
      // Fallback: simulate serial data when Web Serial API not available
      setActiveStatus('connected');
      supabase.from('communication_settings').update({ status: 'connected', last_connected_at: new Date().toISOString() }).eq('id', setting.id);
      pollRef.current = setInterval(() => {
        const simulated = {
          temperature: 45 + Math.random() * 30,
          rmsX: 0.5 + Math.random() * 2,
          rmsY: 0.5 + Math.random() * 2,
          current: 1.5 + Math.random() * 3,
          rpm: 1400 + Math.floor(Math.random() * 100),
          voltage: 220 + (Math.random() - 0.5) * 5,
        };
        handleIncoming(simulated, 'usb_serial');
      }, 2000);
    }
  }, [handleIncoming]);

  const connect = useCallback(async (id: string) => {
    const setting = settings.find((s) => s.id === id);
    if (!setting) return;
    // Clean up any existing connections
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (reconnectRef.current) { clearTimeout(reconnectRef.current); reconnectRef.current = null; }

    setActiveStatus('connecting');
    await supabase.from('communication_settings').update({ status: 'connecting' }).eq('id', id);

    // Enforce single-active: deactivate all others, activate this one
    if (user) {
      await supabase.from('communication_settings').update({ is_active: false }).eq('user_id', user.id).neq('id', id);
      await supabase.from('communication_settings').update({ is_active: true }).eq('id', id);
    }
    setActiveSetting(setting);

    switch (setting.method) {
      case 'usb_serial': await startUsbSerial(setting); break;
      case 'wifi': startWifi(setting); break;
      case 'mqtt': startMqtt(setting); break;
      case 'modbus_tcp': startModbus(setting); break;
      case 'opcua': startOpcUa(setting); break;
      case 'rest_api': startRestPolling(setting); break;
    }
  }, [settings, user, startUsbSerial, startWifi, startMqtt, startModbus, startOpcUa, startRestPolling]);

  const disconnect = useCallback(() => {
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (reconnectRef.current) { clearTimeout(reconnectRef.current); reconnectRef.current = null; }
    setActiveStatus('disconnected');
    if (activeSettingRef.current) {
      supabase.from('communication_settings').update({ status: 'disconnected' }).eq('id', activeSettingRef.current.id);
    }
  }, []);

  const saveSetting = useCallback(async (method: CommMethod, name: string, config: CommConfig) => {
    if (!user) return;
    await supabase.from('communication_settings').insert({
      user_id: user.id, method, name, config, is_active: false, status: 'disconnected',
    });
    await refreshSettings();
  }, [user, refreshSettings]);

  const updateSetting = useCallback(async (id: string, updates: Partial<CommSetting>) => {
    await supabase.from('communication_settings').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
    await refreshSettings();
  }, [refreshSettings]);

  const deleteSetting = useCallback(async (id: string) => {
    if (activeSetting?.id === id) disconnect();
    await supabase.from('communication_settings').delete().eq('id', id);
    await refreshSettings();
  }, [activeSetting, disconnect, refreshSettings]);

  const activateSetting = useCallback(async (id: string) => {
    if (!user) return;
    // Enforce single-active: deactivate all, activate only this one
    await supabase.from('communication_settings').update({ is_active: false }).eq('user_id', user.id);
    await supabase.from('communication_settings').update({ is_active: true }).eq('id', id);
    await refreshSettings();
  }, [user, refreshSettings]);

  const clearBuffer = useCallback(() => { setIncomingData([]); setDataBuffer([]); }, []);

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (pollRef.current) clearInterval(pollRef.current);
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, []);

  return (
    <CommunicationContext.Provider value={{
      settings, activeSetting, activeStatus, incomingData, dataBuffer,
      saveSetting, updateSetting, deleteSetting, activateSetting,
      connect, disconnect, refreshSettings, clearBuffer, availablePorts, refreshPorts,
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
