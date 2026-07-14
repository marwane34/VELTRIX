import { useState, useEffect, useRef, useCallback } from 'react';
import type { SensorReading, AIPrediction, Anomaly, Recommendation, HealthTrendPoint, MachineLimits } from '../types';

const DEFAULT_LIMITS: MachineLimits = {
  rmsMin: 0.5, rmsMax: 3.0, tempMin: 20, tempMax: 85, currentMin: 0.5, currentMax: 5.0,
};

export function useSimulatedData(machineId: string, enabled: boolean, limits: MachineLimits) {
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [frequencyData, setFrequencyData] = useState<number[]>([]);
  const [aiPrediction, setAIPrediction] = useState<AIPrediction | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [healthTrend, setHealthTrend] = useState<HealthTrendPoint[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const aiIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const effectiveLimits = { ...DEFAULT_LIMITS, ...limits };

  const generateReading = useCallback((): SensorReading => {
    const now = Date.now();
    return {
      timestamp: now,
      vibration: 0.8 + Math.random() * 1.2 + (Math.random() - 0.5) * 0.4,
      temperature: 40 + Math.random() * 20 + (Math.random() - 0.5) * 5,
      current: 2 + Math.random() * 2 + (Math.random() - 0.5) * 0.8,
      rpm: 1750 + Math.random() * 100 + (Math.random() - 0.5) * 50,
      frequency: 50 + Math.random() * 2 + (Math.random() - 0.5) * 0.5,
    };
  }, []);

  const generateFrequencyData = useCallback((): number[] => {
    return Array.from({ length: 32 }, (_, i) => {
      if (i === 5 || i === 6) return 0.6 + Math.random() * 0.3;
      if (i === 12 || i === 13) return 0.3 + Math.random() * 0.2;
      return Math.random() * 0.15;
    });
  }, []);

  const runAIAnalysis = useCallback((data: SensorReading[]) => {
    if (data.length < 5) return;
    const recent = data.slice(-20);
    const avgVib = recent.reduce((s, r) => s + r.vibration, 0) / recent.length;
    const avgTemp = recent.reduce((s, r) => s + r.temperature, 0) / recent.length;
    const avgCurr = recent.reduce((s, r) => s + r.current, 0) / recent.length;

    const vibRatio = avgVib / effectiveLimits.rmsMax;
    const tempRatio = avgTemp / effectiveLimits.tempMax;
    const currRatio = avgCurr / effectiveLimits.currentMax;

    const bearingWear = Math.min(100, vibRatio * 60 + Math.random() * 10);
    const overheatRisk = Math.min(100, tempRatio * 70 + Math.random() * 5);
    const failureRisk = Math.min(100, (vibRatio * 0.4 + tempRatio * 0.35 + currRatio * 0.25) * 100);
    const rulHours = Math.max(1, Math.round(8760 - failureRisk * 70));
    const confidence = 85 + Math.random() * 10;
    const trend: AIPrediction['trend'] = failureRisk > 50 ? 'degrading' : failureRisk < 20 ? 'improving' : 'stable';

    setAIPrediction({ bearingWear, overheatRisk, failureRisk, rulHours, confidence, trend, lastUpdate: Date.now() });

    const healthScore = Math.max(0, Math.min(100, 100 - failureRisk));
    setHealthTrend(prev => [...prev, { timestamp: Date.now(), health: healthScore }].slice(-60));

    const newAnomalies: Anomaly[] = [];
    if (avgVib > effectiveLimits.rmsMax * 0.8) {
      newAnomalies.push({ id: `anom-vib-${Date.now()}`, type: 'vibration', severity: avgVib > effectiveLimits.rmsMax ? 'critical' : 'warning', message: 'Vibration exceeding threshold', value: avgVib, threshold: effectiveLimits.rmsMax, timestamp: Date.now(), machineId, machineName: '' });
    }
    if (avgTemp > effectiveLimits.tempMax * 0.8) {
      newAnomalies.push({ id: `anom-temp-${Date.now()}`, type: 'temperature', severity: avgTemp > effectiveLimits.tempMax ? 'critical' : 'warning', message: 'Temperature approaching limit', value: avgTemp, threshold: effectiveLimits.tempMax, timestamp: Date.now(), machineId, machineName: '' });
    }
    if (avgCurr > effectiveLimits.currentMax * 0.85) {
      newAnomalies.push({ id: `anom-curr-${Date.now()}`, type: 'current', severity: avgCurr > effectiveLimits.currentMax ? 'critical' : 'warning', message: 'Current draw high', value: avgCurr, threshold: effectiveLimits.currentMax, timestamp: Date.now(), machineId, machineName: '' });
    }
    setAnomalies(newAnomalies);

    const recs: Recommendation[] = [];
    if (bearingWear > 70) recs.push({ id: 'rec-bearing', priority: 'high', action: 'Replace bearings', component: 'Bearing Assembly', eta: `${Math.max(1, Math.round(rulHours * 0.01))} days`, description: 'Bearing wear exceeds 70%. Schedule replacement to prevent failure.' });
    else if (bearingWear > 40) recs.push({ id: 'rec-bearing-monitor', priority: 'medium', action: 'Monitor bearings', component: 'Bearing Assembly', eta: `${Math.round(rulHours * 0.02)} days`, description: 'Bearing wear moderate. Increase monitoring frequency.' });
    if (overheatRisk > 70) recs.push({ id: 'rec-cooling', priority: 'high', action: 'Inspect cooling system', component: 'Cooling System', eta: '7 days', description: 'Overheat risk high. Check coolant levels and fan operation.' });
    if (failureRisk > 60) recs.push({ id: 'rec-inspect', priority: 'high', action: 'Full inspection', component: 'All Systems', eta: '3 days', description: 'Failure risk critical. Schedule comprehensive maintenance inspection.' });
    if (recs.length === 0) recs.push({ id: 'rec-routine', priority: 'low', action: 'Routine check', component: 'General', eta: '30 days', description: 'All parameters normal. Continue regular maintenance schedule.' });
    setRecommendations(recs);
  }, [machineId, effectiveLimits]);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);
      return;
    }
    setReadings(Array.from({ length: 20 }, () => generateReading()));
    setFrequencyData(generateFrequencyData());

    intervalRef.current = setInterval(() => {
      setReadings(prev => [...prev.slice(-99), generateReading()]);
      setFrequencyData(generateFrequencyData());
    }, 2000);

    aiIntervalRef.current = setInterval(() => {
      setReadings(current => { runAIAnalysis(current); return current; });
    }, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);
    };
  }, [enabled, generateReading, generateFrequencyData, runAIAnalysis]);

  return { readings, frequencyData, aiPrediction, anomalies, recommendations, healthTrend, limits: effectiveLimits };
}
