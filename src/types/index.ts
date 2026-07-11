export type MachineStatus = 'online' | 'offline' | 'warning' | 'critical';
export type AlertType = 'bearing_wear' | 'overheating' | 'abnormal_vibration' | 'current_spike' | 'rpm_anomaly';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type HealthStatus = 'healthy' | 'warning' | 'critical';

export interface Machine {
  id: string; user_id: string; name: string; location: string; description: string;
  status: MachineStatus;
  rms_min: number; rms_max: number; temp_min: number; temp_max: number;
  current_min: number; current_max: number;
  created_at: string; updated_at: string;
}

export interface SensorSnapshot {
  id: string; machine_id: string; user_id: string;
  temperature: number; vibration_rms: number; current: number; rpm: number; voltage: number;
  recorded_at: string;
}

export interface Alert {
  id: string; machine_id: string; user_id: string;
  type: AlertType; severity: AlertSeverity; message: string;
  is_read: boolean; resolved_at: string | null; created_at: string;
}

export interface Prediction {
  id: string; machine_id: string; user_id: string;
  health_score: number; status: HealthStatus;
  bearing_wear_pct: number; overheating_risk_pct: number; failure_risk_pct: number;
  rul_hours: number; predicted_at: string;
}

export interface MachineHealth {
  machine_id: string; user_id: string;
  rms_x: number; rms_y: number; temperature: number; current: number; rpm: number; voltage: number;
  health_score: number; status: HealthStatus; updated_at: string;
}

export interface AIAnalysis {
  healthScore: number; status: HealthStatus;
  bearingWear: number; overheatRisk: number; failureRisk: number; rulHours: number;
  anomalies: string[]; recommendation: string;
}

export type SensorType = 'vibration' | 'temperature' | 'current' | 'frequency' | 'rpm' | 'voltage' | 'pressure' | 'multi';
export type SensorStatus = 'active' | 'inactive' | 'error';

export interface Sensor {
  id: string; machine_id: string | null; user_id: string;
  name: string; type: SensorType; channel: string; unit: string;
  status: SensorStatus; sampling_rate: number; min_value: number; max_value: number;
  description: string; created_at: string; updated_at: string;
}

export interface SensorData {
  id: string; sensor_id: string; machine_id: string; user_id: string;
  value: number; unit: string; quality: string; recorded_at: string;
}

export interface Setting {
  id: string; user_id: string; key: string; value: string; category: string; updated_at: string;
}
