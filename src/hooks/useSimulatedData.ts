import { useState, useEffect, useRef, useCallback } from 'react';

export interface VibrationPoint {
  t: number;
  x: number;
  y: number;
  z: number;
}

export interface FreqBar {
  freq: number;
  amplitude: number;
  isRed: boolean;
}

export interface TrendPoint {
  t: number;
  value: number;
}

export function generateVibration(offset: number, anomalyLevel = 0): VibrationPoint[] {
  const points: VibrationPoint[] = [];
  const count = 200;
  const al = anomalyLevel; // 0-1
  for (let i = 0; i < count; i++) {
    const t = (i / count) * 6;
    const to = t + offset * 0.3;
    const x =
      Math.sin(2 * Math.PI * to * 1.2) * (1.8 + al * 1.2) +
      Math.sin(2 * Math.PI * to * 2.4) * (0.5 + al * 0.8) +
      Math.sin(2 * Math.PI * to * 0.6) * 0.9 +
      (Math.random() - 0.5) * (0.3 + al * 0.5);
    const y =
      Math.sin(2 * Math.PI * to * 1.8 + 1.2) * (1.4 + al * 0.8) +
      Math.sin(2 * Math.PI * to * 3.0 + 0.8) * 0.4 +
      (Math.random() - 0.5) * (0.25 + al * 0.4);
    const z =
      Math.sin(2 * Math.PI * to * 2.5 + 2.0) * 0.9 +
      Math.sin(2 * Math.PI * to * 1.0 + 1.5) * 0.5 +
      (Math.random() - 0.5) * 0.2;
    points.push({ t, x, y, z });
  }
  return points;
}

export function generateFrequencyBars(anomalyLevel = 0): FreqBar[] {
  const bars: FreqBar[] = [];
  const freqSteps = [
    0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.4, 2.6,
    2.8, 3.0, 3.2, 3.4, 3.6, 3.8, 4.0, 4.2, 4.4, 4.6,
    4.8, 5.0, 5.2, 5.4, 5.6,
  ];
  const al = anomalyLevel;
  freqSteps.forEach((f) => {
    let amp = Math.random() * 0.12 + 0.02;
    let isRed = false;
    if (f >= 0.9 && f <= 1.1) { amp = 0.42 + Math.random() * 0.08; }
    if (f >= 1.9 && f <= 2.2) { amp = 0.60 + al * 0.25 + Math.random() * 0.12; isRed = true; }
    if (f >= 4.6 && f <= 5.4) { amp = 0.50 + al * 0.35 + Math.random() * 0.15; isRed = true; }
    if (f >= 3.0 && f <= 3.4) { amp = 0.16 + al * 0.2 + Math.random() * 0.08; isRed = al > 0.3; }
    bars.push({ freq: f, amplitude: Math.min(amp, 0.99), isRed });
  });
  return bars;
}

export function generateCurrentTrend(offset: number, targetCurrent: number): TrendPoint[] {
  const points: TrendPoint[] = [];
  const count = 80;
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const base = (targetCurrent - 1.8) * t + 1.0;
    const noise = (Math.random() - 0.5) * 0.3 + Math.sin(t * 12 + offset) * 0.12;
    points.push({ t: i, value: Math.max(0, base + noise) });
  }
  return points;
}

export function generateTemperatureTrend(offset: number, targetTemp: number): TrendPoint[] {
  const points: TrendPoint[] = [];
  const count = 20;
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const base = (targetTemp - 2) + t * 2.5;
    const noise = Math.sin(t * 8 + offset * 0.5) * 0.3 + (Math.random() - 0.5) * 0.2;
    points.push({ t: i, value: base + noise });
  }
  return points;
}

export function useSimulatedData(active: boolean, anomalyLevel = 0.4) {
  const tickRef = useRef(0);
  const [vibration, setVibration] = useState<VibrationPoint[]>(() => generateVibration(0, anomalyLevel));
  const [freqBars, setFreqBars] = useState<FreqBar[]>(() => generateFrequencyBars(anomalyLevel));
  const [currentTrend, setCurrentTrend] = useState<TrendPoint[]>(() => generateCurrentTrend(0, 2.9));
  const [tempTrend, setTempTrend] = useState<TrendPoint[]>(() => generateTemperatureTrend(0, 78.5));
  const [temperature, setTemperature] = useState(78.5);
  const [currentVal, setCurrentVal] = useState(2.9);
  const [rmsX, setRmsX] = useState(0.8);
  const [rmsY, setRmsY] = useState(2.1);
  const [rpm, setRpm] = useState(1450);
  const [timestamp, setTimestamp] = useState('12:06:23');

  const tick = useCallback(() => {
    tickRef.current += 1;
    const t = tickRef.current;
    setVibration(generateVibration(t, anomalyLevel));
    if (t % 4 === 0) setFreqBars(generateFrequencyBars(anomalyLevel));

    const tempBase = 78.5 + anomalyLevel * 8;
    const currBase = 2.9 + anomalyLevel * 1.2;
    const newTemp = +(tempBase + Math.sin(t * 0.12) * 0.4 + Math.random() * 0.15).toFixed(1);
    const newCurr = +(currBase + Math.sin(t * 0.18) * 0.3 + Math.random() * 0.1).toFixed(1);

    setCurrentTrend(generateCurrentTrend(t * 0.1, newCurr));
    setTempTrend(generateTemperatureTrend(t * 0.05, newTemp));
    setTemperature(newTemp);
    setCurrentVal(newCurr);
    setRmsX(+(0.8 + anomalyLevel * 1.2 + Math.random() * 0.1).toFixed(2));
    setRmsY(+(2.1 + anomalyLevel * 0.8 + Math.random() * 0.1).toFixed(2));
    setRpm(Math.round(1450 + anomalyLevel * 120 + (Math.random() - 0.5) * 40));

    const now = new Date();
    setTimestamp(`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`);
  }, [anomalyLevel]);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [active, tick]);

  return { vibration, freqBars, currentTrend, tempTrend, temperature, currentVal, rmsX, rmsY, rpm, timestamp };
}
