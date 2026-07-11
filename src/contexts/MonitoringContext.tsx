import {
  createContext, useContext, useEffect, useState, useRef, ReactNode,
} from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useSimulatedData } from '../hooks/useSimulatedData';
import { runAIAnalysis } from '../hooks/useSimulatedData';
import type { Machine, Alert, AIAnalysis, Sensor, Setting } from '../types';
import type { VibrationPoint, FreqBar, TrendPoint } from '../hooks/useSimulatedData';

export interface LiveReading {
  temperature?: number; rmsX?: number; rmsY?: number;
  current?: number; rpm?: number; voltage?: number;
}

interface MonitoringContextValue {
  machines: Machine[];
  selectedMachine: Machine | null;
  selectMachine: (id: string) => void;
  monitoring: boolean;
  setMonitoring: (v: boolean) => void;
  simulateLoad: boolean;
  setSimulateLoad: (v: boolean) => void;
  vibration: VibrationPoint[];
  freqBars: FreqBar[];
  currentTrend: TrendPoint[];
  tempTrend: TrendPoint[];
  temperature: number; currentVal: number; rmsX: number; rmsY: number; rpm: number;
  timestamp: string;
  aiAnalysis: AIAnalysis | null;
  recentAlerts: Alert[];
  unreadCount: number;
  sensors: Sensor[];
  settings: Setting[];
  refreshMachines: () => Promise<void>;
  refreshSensors: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  markAlertsRead: () => Promise<void>;
  persistSnapshot: () => Promise<void>;
  saveSetting: (key: string, value: string, category?: string) => Promise<void>;
  liveReading: LiveReading | null;
  pushLiveReading: (reading: LiveReading) => void;
  dataSource: 'simulated' | 'live';
}

const MonitoringContext = createContext<MonitoringContextValue | null>(null);

export function MonitoringProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  const [monitoring, setMonitoring] = useState(true);
  const [simulateLoad, setSimulateLoad] = useState(false);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [liveReading, setLiveReading] = useState<LiveReading | null>(null);
  const liveReadingRef = useRef<LiveReading | null>(null);
  const liveReadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  liveReadingRef.current = liveReading;

  const anomalyLevel = simulateLoad ? 0.75 : 0.35;
  const simData = useSimulatedData(monitoring, anomalyLevel);

  const selectedMachine = machines.find((m) => m.id === selectedMachineId) ?? machines[0] ?? null;
  const dataSource: 'simulated' | 'live' = liveReading ? 'live' : 'simulated';
  const displayTemp = liveReading?.temperature ?? simData.temperature;
  const displayRmsX = liveReading?.rmsX ?? simData.rmsX;
  const displayRmsY = liveReading?.rmsY ?? simData.rmsY;
  const displayCurrent = liveReading?.current ?? simData.currentVal;
  const displayRpm = liveReading?.rpm ?? simData.rpm;

  const aiAnalysis: AIAnalysis | null = selectedMachine
    ? runAIAnalysis({ temperature: displayTemp, rmsX: displayRmsX, rmsY: displayRmsY, current: displayCurrent, rpm: displayRpm }, selectedMachine)
    : null;

  function pushLiveReading(reading: LiveReading) {
    setLiveReading(reading);
    if (liveReadingTimeoutRef.current) clearTimeout(liveReadingTimeoutRef.current);
    liveReadingTimeoutRef.current = setTimeout(() => setLiveReading(null), 10000);
  }

  async function refreshMachines() {
    if (!user) return;
    const { data } = await supabase.from('machines').select('*').eq('user_id', user.id).order('created_at');
    if (data) { setMachines(data as Machine[]); if (data.length > 0 && !selectedMachineId) setSelectedMachineId(data[0].id); }
  }

  async function refreshSensors() {
    if (!user) return;
    const { data } = await supabase.from('sensors').select('*').eq('user_id', user.id).order('created_at');
    if (data) setSensors(data as Sensor[]);
  }

  async function refreshSettings() {
    if (!user) return;
    const { data } = await supabase.from('settings').select('*').eq('user_id', user.id);
    if (data) setSettings(data as Setting[]);
  }

  async function refreshAlerts() {
    if (!user) return;
    const { data } = await supabase.from('alerts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
    if (data) { setRecentAlerts(data as Alert[]); setUnreadCount((data as Alert[]).filter(a => !a.is_read).length); }
  }

  async function markAlertsRead() {
    if (!user) return;
    await supabase.from('alerts').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    setUnreadCount(0);
  }

  async function saveSetting(key: string, value: string, category = 'general') {
    if (!user) return;
    const existing = settings.find(s => s.key === key);
    if (existing) {
      await supabase.from('settings').update({ value, updated_at: new Date().toISOString() }).eq('id', existing.id);
    } else {
      await supabase.from('settings').insert({ user_id: user.id, key, value, category });
    }
    refreshSettings();
  }

  const persistTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastAlertRef = useRef<number>(0);

  async function persistSnapshot() {
    if (!user || !selectedMachine) return;
    await supabase.from('sensor_snapshots').insert({
      machine_id: selectedMachine.id, user_id: user.id,
      temperature: displayTemp, vibration_rms: +((displayRmsX + displayRmsY) / 2).toFixed(3),
      current: displayCurrent, rpm: displayRpm,
      voltage: liveReading?.voltage ?? 220 + (Math.random() - 0.5) * 5,
    });
    const sensorReadings: Record<string, number> = {
      vibration: +((displayRmsX + displayRmsY) / 2).toFixed(3), temperature: displayTemp,
      current: displayCurrent, rpm: displayRpm,
      voltage: liveReading?.voltage ?? 220 + (Math.random() - 0.5) * 5,
    };
    const machineSensors = sensors.filter(s => s.machine_id === selectedMachine.id);
    if (machineSensors.length > 0) {
      const records = machineSensors.map(s => ({
        sensor_id: s.id, machine_id: selectedMachine.id, user_id: user.id,
        value: sensorReadings[s.type] ?? 0, unit: s.unit, quality: 'good',
      }));
      await supabase.from('sensor_data').insert(records);
    }
    await supabase.from('machine_health').upsert({
      machine_id: selectedMachine.id, user_id: user.id,
      rms_x: displayRmsX, rms_y: displayRmsY, temperature: displayTemp,
      current: displayCurrent, rpm: displayRpm,
      voltage: liveReading?.voltage ?? 220,
      health_score: aiAnalysis?.healthScore ?? 100, status: aiAnalysis?.status ?? 'healthy',
      updated_at: new Date().toISOString(),
    });
    if (aiAnalysis && aiAnalysis.status !== 'healthy' && Date.now() - lastAlertRef.current > 30000) {
      lastAlertRef.current = Date.now();
      await supabase.from('alerts').insert({
        machine_id: selectedMachine.id, user_id: user.id,
        type: aiAnalysis.status === 'critical' ? 'abnormal_vibration' : 'bearing_wear',
        severity: aiAnalysis.status === 'critical' ? 'critical' : 'warning',
        message: aiAnalysis.anomalies[0] ?? 'Anomaly detected', is_read: false,
      });
      refreshAlerts();
    }
  }

  useEffect(() => {
    if (user) { refreshMachines(); refreshSensors(); refreshSettings(); refreshAlerts(); }
  }, [user]);

  useEffect(() => {
    if (monitoring && selectedMachine) {
      persistTimerRef.current = setInterval(persistSnapshot, 5000);
      return () => { if (persistTimerRef.current) clearInterval(persistTimerRef.current); };
    }
  }, [monitoring, selectedMachine, displayTemp, displayCurrent, displayRpm, aiAnalysis]);

  function selectMachine(id: string) { setSelectedMachineId(id); }

  return (
    <MonitoringContext.Provider value={{
      machines, selectedMachine, selectMachine, monitoring, setMonitoring,
      simulateLoad, setSimulateLoad, ...simData,
      temperature: displayTemp, currentVal: displayCurrent, rmsX: displayRmsX, rmsY: displayRmsY, rpm: displayRpm,
      aiAnalysis, recentAlerts, unreadCount, refreshMachines, refreshSensors, refreshSettings,
      saveSetting, sensors, settings, markAlertsRead, persistSnapshot,
      liveReading, pushLiveReading, dataSource,
    }}>
      {children}
    </MonitoringContext.Provider>
  );
}

export function useMonitoring() {
  const ctx = useContext(MonitoringContext);
  if (!ctx) throw new Error('useMonitoring must be used within MonitoringProvider');
  return ctx;
}
