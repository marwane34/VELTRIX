import { useEffect, useRef, useState } from 'react';
import type { AIAnalysis, Machine } from '../types';

export interface VibrationPoint { t: number; x: number; y: number; }
export interface FreqBar { freq: number; amp: number; }
export interface TrendPoint { t: number; v: number; }

export function useSimulatedData(running: boolean, anomalyLevel: number) {
  const [vibration, setVibration] = useState<VibrationPoint[]>([]);
  const [freqBars, setFreqBars] = useState<FreqBar[]>([]);
  const [currentTrend, setCurrentTrend] = useState<TrendPoint[]>([]);
  const [tempTrend, setTempTrend] = useState<TrendPoint[]>([]);
  const [temperature, setTemperature] = useState(45);
  const [currentVal, setCurrentVal] = useState(2.0);
  const [rmsX, setRmsX] = useState(0.8);
  const [rmsY, setRmsY] = useState(0.6);
  const [rpm, setRpm] = useState(1500);
  const [timestamp, setTimestamp] = useState(new Date().toISOString());
  const tRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      const t = tRef.current++;
      setTimestamp(new Date().toISOString());

      const baseX = Math.sin(t * 0.3) * 0.5 + (Math.random() - 0.5) * 0.3;
      const baseY = Math.cos(t * 0.25) * 0.4 + (Math.random() - 0.5) * 0.2;
      const noiseX = (Math.random() - 0.5) * anomalyLevel * 2;
      const noiseY = (Math.random() - 0.5) * anomalyLevel * 1.5;

      setVibration((prev) => [...prev.slice(-199), { t, x: baseX + noiseX, y: baseY + noiseY }]);

      const rmsXVal = Math.sqrt((baseX + noiseX) ** 2);
      const rmsYVal = Math.sqrt((baseY + noiseY) ** 2);
      setRmsX(+rmsXVal.toFixed(3));
      setRmsY(+rmsYVal.toFixed(3));

      const newTemp = 45 + Math.sin(t * 0.05) * 10 + anomalyLevel * 15 + (Math.random() - 0.5) * 2;
      setTemperature(+newTemp.toFixed(1));
      setTempTrend((prev) => [...prev.slice(-59), { t, v: +newTemp.toFixed(1) }]);

      const newCurrent = 2.0 + Math.sin(t * 0.08) * 0.5 + anomalyLevel * 1.5 + (Math.random() - 0.5) * 0.3;
      setCurrentVal(+newCurrent.toFixed(2));
      setCurrentTrend((prev) => [...prev.slice(-59), { t, v: +newCurrent.toFixed(2) }]);

      const newRpm = 1500 + Math.sin(t * 0.03) * 50 + (Math.random() - 0.5) * 20;
      setRpm(Math.round(newRpm));

      if (t % 5 === 0) {
        const bars: FreqBar[] = [];
        for (let f = 1; f <= 32; f++) {
          const amp = (Math.sin(f * 0.5) * 0.3 + 0.5) * (1 + anomalyLevel * Math.exp(-f / 10));
          bars.push({ freq: f * 25, amp: +amp.toFixed(3) });
        }
        setFreqBars(bars);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [running, anomalyLevel]);

  return { vibration, freqBars, currentTrend, tempTrend, temperature, currentVal, rmsX, rmsY, rpm, timestamp };
}

export function runAIAnalysis(
  readings: { temperature: number; rmsX: number; rmsY: number; current: number; rpm: number },
  machine: Machine
): AIAnalysis {
  const vibRms = (readings.rmsX + readings.rmsY) / 2;
  const tempRatio = readings.temperature / machine.temp_max;
  const vibRatio = vibRms / machine.rms_max;
  const currRatio = readings.current / machine.current_max;

  const bearingWear = Math.min(100, Math.max(0, (vibRatio - 0.5) * 60 + (tempRatio - 0.5) * 30));
  const overheatRisk = Math.min(100, Math.max(0, (tempRatio - 0.7) * 80));
  const failureRisk = Math.min(100, Math.max(0, bearingWear * 0.4 + overheatRisk * 0.3 + (currRatio - 0.7) * 50));
  const healthScore = Math.max(0, Math.min(100, 100 - failureRisk * 0.8 - bearingWear * 0.2));

  const anomalies: string[] = [];
  if (vibRatio > 0.8) anomalies.push('Vibration exceeds 80% of threshold');
  if (tempRatio > 0.85) anomalies.push('Temperature approaching critical limit');
  if (currRatio > 0.8) anomalies.push('Current draw abnormally high');
  if (readings.rpm < 1200) anomalies.push('RPM below expected operating range');

  const status: AIAnalysis['status'] = healthScore > 70 ? 'healthy' : healthScore > 40 ? 'warning' : 'critical';
  const rulHours = Math.max(0, Math.round((100 - bearingWear) * 50 + (healthScore * 10)));

  let recommendation = 'All systems operating within normal parameters.';
  if (status === 'warning') recommendation = 'Schedule preventive maintenance within 2 weeks. Monitor bearing temperatures closely.';
  if (status === 'critical') recommendation = 'Immediate maintenance required. Risk of failure is high. Reduce load and inspect bearings.';

  return { healthScore: Math.round(healthScore), status, bearingWear: Math.round(bearingWear), overheatRisk: Math.round(overheatRisk), failureRisk: Math.round(failureRisk), rulHours, anomalies, recommendation };
}
