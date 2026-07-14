export interface Machine {
  id: string;
  name: string;
  location: string;
  description: string;
  status: 'online' | 'offline' | 'warning' | 'critical';
  user_id: string;
  created_at: string;
  updated_at: string;
  rms_min: number;
  rms_max: number;
  temp_min: number;
  temp_max: number;
  current_min: number;
  current_max: number;
}

export interface MachineLimits {
  rmsMin: number; rmsMax: number;
  tempMin: number; tempMax: number;
  currentMin: number; currentMax: number;
}

export interface SensorReading {
  timestamp: number;
  vibration: number;
  temperature: number;
  current: number;
  rpm: number;
  frequency: number;
}

export interface AIPrediction {
  bearingWear: number;
  overheatRisk: number;
  failureRisk: number;
  rulHours: number;
  confidence: number;
  trend: 'improving' | 'stable' | 'degrading';
  lastUpdate: number;
}

export interface Anomaly {
  id: string;
  type: 'vibration' | 'temperature' | 'current' | 'rpm' | 'frequency';
  severity: 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
  machineId: string;
  machineName: string;
}

export interface Recommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  action: string;
  component: string;
  eta: string;
  description: string;
}

export interface HealthTrendPoint { timestamp: number; health: number; }

export type ProtocolType = 'usb_serial' | 'wifi' | 'mqtt' | 'rest_api' | 'modbus_tcp' | 'opc_ua';

export interface CommunicationConfig {
  id: string;
  protocol: ProtocolType;
  name: string;
  active: boolean;
  config: Record<string, any>;
  user_id: string;
  created_at: string;
}

export type ExportType = 'pdf' | 'excel' | 'csv' | 'screenshot' | 'machine_report' | 'ai_report';

export interface Report {
  id: string;
  report_name: string;
  machine_id: string | null;
  export_type: ExportType;
  created_by: string;
  file_path: string;
  file_size: number;
  metadata: Record<string, any>;
  created_at: string;
  user_id: string;
}

export interface ExportData {
  machine: Machine;
  readings: SensorReading[];
  frequencyData: number[];
  aiPrediction: AIPrediction | null;
  anomalies: Anomaly[];
  recommendations: Recommendation[];
  healthTrend: HealthTrendPoint[];
  limits: MachineLimits;
  exportedAt: string;
  exportedBy: string;
}

export type NavItem = 'dashboard' | 'machines' | 'alerts' | 'analytics' | 'communication' | 'export_history';

export interface ElectronAPI {
  minimize: () => Promise<void>;
  maximizeToggle: () => Promise<boolean>;
  isMaximized: () => Promise<boolean>;
  close: () => Promise<void>;
  toggleFullscreen: () => Promise<boolean>;
  isFullscreen: () => Promise<boolean>;
  getTheme: () => Promise<string>;
  toggleTheme: () => Promise<string>;
  setTheme: (theme: string) => Promise<string>;
  showNotification: (title: string, body: string) => Promise<void>;
  getAppVersion: () => Promise<string>;
  getAutoLaunch: () => Promise<boolean>;
  setAutoLaunch: (enabled: boolean) => Promise<boolean>;
  checkForUpdates: () => Promise<boolean>;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
  onUpdateAvailable: (callback: (info: any) => void) => void;
  onUpdateDownloaded: (callback: (info: any) => void) => void;
  onUpdateProgress: (callback: (progress: any) => void) => void;
  platform: string;
  isElectron: boolean;
}

declare global {
  interface Window { electronAPI?: ElectronAPI; }
}
