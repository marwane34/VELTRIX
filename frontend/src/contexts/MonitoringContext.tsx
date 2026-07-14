import { useState, useEffect, createContext, useContext, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useSimulatedData } from '../hooks/useSimulatedData';
import type { Machine, SensorReading, AIPrediction, Anomaly, Recommendation, HealthTrendPoint, MachineLimits } from '../types';

interface MonitoringContextType {
  machines: Machine[];
  selectedMachine: Machine | null;
  readings: SensorReading[];
  frequencyData: number[];
  aiPrediction: AIPrediction | null;
  anomalies: Anomaly[];
  recommendations: Recommendation[];
  healthTrend: HealthTrendPoint[];
  limits: MachineLimits;
  loading: boolean;
  error: string | null;
  selectMachine: (m: Machine) => void;
  addMachine: (d: { name: string; location: string; description: string }) => Promise<boolean>;
  removeMachine: (id: string) => Promise<boolean>;
  setMachineLimits: (id: string, limits: MachineLimits) => Promise<boolean>;
  refreshMachines: () => Promise<void>;
}

const MonitoringContext = createContext<MonitoringContextType | undefined>(undefined);

export function MonitoringProvider({ children }: { children: ReactNode }) {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedMachine = machines.find(m => m.id === selectedMachineId) ?? null;

  const limits: MachineLimits = selectedMachine ? {
    rmsMin: Number(selectedMachine.rms_min ?? 0.5), rmsMax: Number(selectedMachine.rms_max ?? 3.0),
    tempMin: Number(selectedMachine.temp_min ?? 20), tempMax: Number(selectedMachine.temp_max ?? 85),
    currentMin: Number(selectedMachine.current_min ?? 0.5), currentMax: Number(selectedMachine.current_max ?? 5.0),
  } : { rmsMin: 0.5, rmsMax: 3.0, tempMin: 20, tempMax: 85, currentMin: 0.5, currentMax: 5.0 };

  const simData = useSimulatedData(selectedMachine?.id ?? 'none', !!selectedMachine, limits);

  const refreshMachines = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('machines').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      setMachines(data as Machine[]);
      if (data && data.length > 0 && !selectedMachineId) setSelectedMachineId(data[0].id);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, [selectedMachineId]);

  useEffect(() => { refreshMachines(); }, [refreshMachines]);

  const selectMachine = useCallback((m: Machine) => setSelectedMachineId(m.id), []);

  const addMachine = useCallback(async (d: { name: string; location: string; description: string }) => {
    try {
      const { error } = await supabase.from('machines').insert({ name: d.name, location: d.location, description: d.description, status: 'online' });
      if (error) throw error;
      await refreshMachines(); return true;
    } catch (e: any) { setError(e.message); return false; }
  }, [refreshMachines]);

  const removeMachine = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('machines').delete().eq('id', id);
      if (error) throw error;
      if (selectedMachineId === id) setSelectedMachineId(null);
      await refreshMachines(); return true;
    } catch (e: any) { setError(e.message); return false; }
  }, [refreshMachines, selectedMachineId]);

  const setMachineLimits = useCallback(async (id: string, newLimits: MachineLimits) => {
    try {
      const { error } = await supabase.from('machines').update({
        rms_min: newLimits.rmsMin, rms_max: newLimits.rmsMax,
        temp_min: newLimits.tempMin, temp_max: newLimits.tempMax,
        current_min: newLimits.currentMin, current_max: newLimits.currentMax,
      }).eq('id', id);
      if (error) throw error;
      await refreshMachines(); return true;
    } catch (e: any) { setError(e.message); return false; }
  }, [refreshMachines]);

  return (
    <MonitoringContext.Provider value={{
      machines, selectedMachine, readings: simData.readings, frequencyData: simData.frequencyData,
      aiPrediction: simData.aiPrediction, anomalies: simData.anomalies, recommendations: simData.recommendations,
      healthTrend: simData.healthTrend, limits: simData.limits, loading, error,
      selectMachine, addMachine, removeMachine, setMachineLimits, refreshMachines,
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
