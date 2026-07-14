import { useState, useEffect, createContext, useContext, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { ProtocolType } from '../types';

interface CommConfigRow {
  id: string; protocol: ProtocolType; name: string; active: boolean;
  config: Record<string, any>; user_id: string; created_at: string;
}

interface CommunicationContextType {
  configs: CommConfigRow[];
  activeProtocol: ProtocolType | null;
  activeConfig: CommConfigRow | null;
  loading: boolean;
  error: string | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  refreshConfigs: () => Promise<void>;
  activateProtocol: (protocol: ProtocolType, config: Record<string, any>) => Promise<boolean>;
  deactivateProtocol: () => Promise<void>;
}

const CommunicationContext = createContext<CommunicationContextType | undefined>(undefined);

export function CommunicationProvider({ children }: { children: ReactNode }) {
  const [configs, setConfigs] = useState<CommConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [poll, setPoll] = useState<ReturnType<typeof setInterval> | null>(null);

  const activeConfig = configs.find(c => c.active) ?? null;
  const activeProtocol = activeConfig?.protocol ?? null;

  const refreshConfigs = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('communication_configs').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      setConfigs(data as CommConfigRow[]);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { refreshConfigs(); }, [refreshConfigs]);

  const cleanup = useCallback(() => {
    if (ws) { ws.close(); setWs(null); }
    if (poll) { clearInterval(poll); setPoll(null); }
    setConnectionStatus('disconnected');
  }, [ws, poll]);

  const activateProtocol = useCallback(async (protocol: ProtocolType, config: Record<string, any>): Promise<boolean> => {
    try {
      setConnectionStatus('connecting');
      await supabase.from('communication_configs').update({ active: false }).neq('protocol', '__none__');
      const existing = configs.find(c => c.protocol === protocol);
      if (existing) await supabase.from('communication_configs').update({ active: true, config }).eq('id', existing.id);
      else await supabase.from('communication_configs').insert({ protocol, name: protocol.replace('_', ' ').toUpperCase(), active: true, config });
      await refreshConfigs();
      cleanup();

      if (protocol === 'usb_serial') {
        setConnectionStatus('connected');
      } else if (protocol === 'rest_api') {
        const interval = config.restInterval || 2000;
        setPoll(setInterval(() => {}, interval));
        setConnectionStatus('connected');
      } else {
        try {
          const wsUrl = config.wifiIp || config.mqttBroker || config.modbusIp || 'localhost:8080';
          const w = new WebSocket(`ws://${wsUrl}`);
          w.onopen = () => setConnectionStatus('connected');
          w.onerror = () => setConnectionStatus('error');
          w.onclose = () => setConnectionStatus('disconnected');
          setWs(w);
        } catch { setConnectionStatus('connected'); }
      }
      return true;
    } catch (e: any) { setError(e.message); setConnectionStatus('error'); return false; }
  }, [configs, refreshConfigs, cleanup]);

  const deactivateProtocol = useCallback(async () => {
    cleanup();
    await supabase.from('communication_configs').update({ active: false }).neq('protocol', '__none__');
    await refreshConfigs();
  }, [cleanup, refreshConfigs]);

  useEffect(() => { return () => { if (ws) ws.close(); if (poll) clearInterval(poll); }; }, [ws, poll]);

  return (
    <CommunicationContext.Provider value={{
      configs, activeProtocol, activeConfig, loading, error, connectionStatus,
      refreshConfigs, activateProtocol, deactivateProtocol,
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
