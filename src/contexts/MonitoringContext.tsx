import {
  createContext, useContext, useEffect, useState,
  useRef, ReactNode,
} from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useSimulatedData } from '../hooks/useSimulatedData';
import { runAIAnalysis } from '../hooks/useAI';
import type { Machine, Alert, AIAnalysis } from '../types';
import type { VibrationPoint, FreqBar, TrendPoint } from '../hooks/useSimulatedData';

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
  temperature: number;
  currentVal: number;
  rmsX: number;
  rmsY: number;
  rpm: number;
  timestamp: string;
  aiAnalysis: AIAnalysis | null;
  recentAlerts: Alert[];
  unreadCount: number;
  refreshMachines: () => Promise<void>;
  markAlertsRead: () => Promise<void>;
  persistSnapshot: () => Promise<void>;
}

const MonitoringContext = createContext<MonitoringContextValue | null>(null);

export function MonitoringProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  const [monitoring, setMonitoring] = useState(true);
  const [simulateLoad, setSimulateLoad] = useState(false);
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([]);

  const anomalyLevel = simulateLoad ? 0.75 : 0.35;
  const simData = useSimulatedData(monitoring, anomalyLevel);

  const selectedMachine = machines.find((m) => m.id === selectedMachineId) ?? machines[0] ?? null;

  // AI analysis on every tick
  const aiAnalysis: AIAnalysis | null = selectedMachine
    ? runAIAnalysis(
        {
          temperature: simData.temperature,
          rmsX: simData.rmsX,
          rmsY: simData.rmsY,
          current: simData.currentVal,
          rpm: simData.rpm,
        },
        selectedMachine
      )
    : null;

  async function refreshMachines() {
    if (!user) return;
    const { data } = await supabase.from('machines').select('*').eq('user_id', user.id).order('created_at');
    if (data) setMachines(data);
  }

  async function loadAlerts() {
    if (!user) return;
    const { data } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setRecentAlerts(data);
  }

  useEffect(() => {
    if (!user) return;
    refreshMachines();
    loadAlerts();

    const alertSub = supabase
      .channel('alerts-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts', filter: `user_id=eq.${user.id}` }, () => {
        loadAlerts();
      })
      .subscribe();

    return () => { alertSub.unsubscribe(); };
  }, [user]);

  // Persist snapshot every 5s when monitoring
  const persistTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastAlertRef = useRef<number>(0);

  async function persistSnapshot() {
    if (!user || !selectedMachine) return;

    await supabase.from('sensor_snapshots').insert({
      machine_id: selectedMachine.id,
      user_id: user.id,
      temperature: simData.temperature,
      vibration_rms: +((simData.rmsX + simData.rmsY) / 2).toFixed(3),
      current: simData.currentVal,
      rpm: simData.rpm,
      voltage: 220 + (Math.random() - 0.5) * 5,
    });

    await supabase.from('machine_health').upsert({
      machine_id: selectedMachine.id,
      user_id: user.id,
      rms_x: simData.rmsX,
      rms_y: simData.rmsY,
      temperature: simData.temperature,
      current: simData.currentVal,
      rpm: simData.rpm,
      voltage: 220,
      health_score: aiAnalysis?.healthScore ?? 100,
      status: aiAnalysis?.status ?? 'healthy',
      updated_at: new Date().toISOString(),
    });

    // Fire alert if anomaly and cooldown elapsed (60s)
    const now = Date.now();
    if (aiAnalysis && aiAnalysis.status !== 'healthy' && now - lastAlertRef.current > 60000) {
      lastAlertRef.current = now;
      const type = aiAnalysis.bearingWear > 40 ? 'bearing_wear'
        : aiAnalysis.overheatRisk > 40 ? 'overheating'
        : 'abnormal_vibration';
      const severity = aiAnalysis.status === 'critical' ? 'critical' : 'warning';
      await supabase.from('alerts').insert({
        machine_id: selectedMachine.id,
        user_id: user.id,
        type,
        severity,
        message: aiAnalysis.anomalies[0] ?? `${severity} condition detected`,
        is_read: false,
      });

      // Update prediction
      await supabase.from('predictions').insert({
        machine_id: selectedMachine.id,
        user_id: user.id,
        health_score: aiAnalysis.healthScore,
        status: aiAnalysis.status,
        bearing_wear_pct: aiAnalysis.bearingWear,
        overheating_risk_pct: aiAnalysis.overheatRisk,
        failure_risk_pct: aiAnalysis.failureRisk,
        rul_hours: aiAnalysis.rulHours,
      });
    }
  }

  useEffect(() => {
    if (!monitoring || !selectedMachine) return;
    persistTimerRef.current = setInterval(persistSnapshot, 5000);
    return () => {
      if (persistTimerRef.current) clearInterval(persistTimerRef.current);
    };
  }, [monitoring, selectedMachine, simData.temperature, simData.currentVal, simData.rpm, aiAnalysis]);

  function selectMachine(id: string) {
    setSelectedMachineId(id);
  }

  async function markAlertsRead() {
    if (!user) return;
    await supabase.from('alerts').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    await loadAlerts();
  }

  const unreadCount = recentAlerts.filter((a) => !a.is_read).length;

  return (
    <MonitoringContext.Provider
      value={{
        machines,
        selectedMachine,
        selectMachine,
        monitoring,
        setMonitoring,
        simulateLoad,
        setSimulateLoad,
        ...simData,
        aiAnalysis,
        recentAlerts,
        unreadCount,
        refreshMachines,
        markAlertsRead,
        persistSnapshot,
      }}
    >
      {children}
    </MonitoringContext.Provider>
  );
}

export function useMonitoring() {
  const ctx = useContext(MonitoringContext);
  if (!ctx) throw new Error('useMonitoring must be used within MonitoringProvider');
  return ctx;
}
