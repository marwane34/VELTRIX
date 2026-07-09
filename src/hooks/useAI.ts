import { useMemo } from 'react';
import type { AIAnalysis, Machine } from '../types';

interface SensorReading {
  temperature: number;
  rmsX: number;
  rmsY: number;
  current: number;
  rpm: number;
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export function runAIAnalysis(reading: SensorReading, machine: Machine): AIAnalysis {
  const { temperature, rmsX, rmsY, current } = reading;
  const combinedRms = Math.sqrt((rmsX * rmsX + rmsY * rmsY) / 2);

  // Normalized excess beyond thresholds (0 = at threshold, 1 = fully exceeded)
  const tempExcess = clamp((temperature - machine.temp_max) / (machine.temp_max * 0.15), 0, 1);
  const rmsExcess = clamp((combinedRms - machine.rms_max) / (machine.rms_max * 0.3), 0, 1);
  const currExcess = clamp((current - machine.current_max) / (machine.current_max * 0.2), 0, 1);

  // --- Component-level risks ---
  // Bearing wear: driven by RMS anomaly + high-frequency presence (simulated by rmsX/rmsY ratio)
  const axisImbalance = Math.abs(rmsX - rmsY) / Math.max(rmsX, rmsY, 0.01);
  const bearingWear = clamp(rmsExcess * 0.6 + axisImbalance * 0.3 + currExcess * 0.1, 0, 1);

  // Overheating risk: temperature excess + current excess (high load)
  const overheatRisk = clamp(tempExcess * 0.7 + currExcess * 0.3, 0, 1);

  // Failure risk: combined weighted
  const failureRisk = clamp(
    bearingWear * 0.45 + overheatRisk * 0.35 + rmsExcess * 0.2,
    0, 1
  );

  // Health score: inverse of failure risk, tempered by individual factors
  const rawHealth = 100 - (failureRisk * 45 + rmsExcess * 25 + tempExcess * 20 + currExcess * 10);
  const healthScore = clamp(Math.round(rawHealth), 0, 100);

  // Status classification
  let status: 'healthy' | 'warning' | 'critical';
  if (healthScore >= 70) status = 'healthy';
  else if (healthScore >= 40) status = 'warning';
  else status = 'critical';

  // Remaining useful life (hours) — simplified linear model
  const rulHours = status === 'healthy'
    ? Math.round(2000 - failureRisk * 1000)
    : status === 'warning'
    ? Math.round(500 - failureRisk * 400)
    : Math.round(50 - failureRisk * 40);

  // Anomaly descriptions
  const anomalies: string[] = [];
  if (bearingWear > 0.35) anomalies.push('Bearing Wear Detected (2x RPM peak elevated)');
  if (overheatRisk > 0.3) anomalies.push(`Temperature Elevated (${temperature.toFixed(1)}°C)`);
  if (currExcess > 0.2) anomalies.push(`Current Spike (${current.toFixed(1)} A)`);
  if (rmsExcess > 0.25) anomalies.push(`Abnormal Vibration RMS (${combinedRms.toFixed(2)} g)`);
  if (axisImbalance > 0.4) anomalies.push('Axis Imbalance Detected');

  // Recommendation
  let recommendation = 'System operating normally. Continue scheduled monitoring.';
  if (status === 'warning') {
    recommendation = anomalies[0]
      ? `Inspect ${anomalies[0].split(' ')[0]} — schedule maintenance within 2 weeks.`
      : 'Monitor closely. Elevated readings detected.';
  } else if (status === 'critical') {
    recommendation = 'IMMEDIATE ATTENTION REQUIRED. Risk of imminent failure. Take offline for inspection.';
  }

  return {
    healthScore,
    status,
    bearingWear: Math.round(bearingWear * 100),
    overheatRisk: Math.round(overheatRisk * 100),
    failureRisk: Math.round(failureRisk * 100),
    rulHours,
    anomalies,
    recommendation,
  };
}

export function useAI(
  reading: SensorReading,
  machine: Machine | null
): AIAnalysis | null {
  return useMemo(() => {
    if (!machine) return null;
    return runAIAnalysis(reading, machine);
  }, [reading.temperature, reading.rmsX, reading.rmsY, reading.current, reading.rpm, machine]);
}
