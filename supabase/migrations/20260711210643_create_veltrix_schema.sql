/*
# VELTRIX Predictive Maintenance — Full Schema

Creates all tables for the VELTRIX SCADA dashboard:
- machines: Monitored machines with vibration/temp/current thresholds
- sensors: Sensors attached to machines (vibration, temperature, current, etc.)
- sensor_data: Time-series readings from sensors
- sensor_snapshots: Aggregated machine health snapshots (temp, vibration, current, rpm, voltage)
- machine_health: Latest health state per machine (rms, temp, current, rpm, health_score, status)
- alerts: Anomaly alerts (bearing wear, overheating, abnormal vibration, etc.)
- settings: General key-value settings per user
- communication_settings: Industrial protocol configs (USB Serial, Wi-Fi, MQTT, REST API, Modbus TCP, OPC UA)

All tables are user-scoped with user_id DEFAULT auth.uid() and owner-based RLS.
Only one communication method can be active at a time per user.
*/

-- Machines
CREATE TABLE IF NOT EXISTS machines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  location text DEFAULT '',
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'online',
  rms_min numeric DEFAULT 0.8,
  rms_max numeric DEFAULT 2.2,
  temp_min numeric DEFAULT 40,
  temp_max numeric DEFAULT 80,
  current_min numeric DEFAULT 1.0,
  current_max numeric DEFAULT 3.5,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_machines" ON machines;
CREATE POLICY "select_own_machines" ON machines FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_machines" ON machines;
CREATE POLICY "insert_own_machines" ON machines FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_machines" ON machines;
CREATE POLICY "update_own_machines" ON machines FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_machines" ON machines;
CREATE POLICY "delete_own_machines" ON machines FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Sensors
CREATE TABLE IF NOT EXISTS sensors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  machine_id uuid REFERENCES machines(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'vibration',
  channel text DEFAULT 'X',
  unit text DEFAULT 'g',
  status text NOT NULL DEFAULT 'active',
  sampling_rate integer DEFAULT 1000,
  min_value numeric DEFAULT 0,
  max_value numeric DEFAULT 100,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE sensors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_sensors" ON sensors;
CREATE POLICY "select_own_sensors" ON sensors FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_sensors" ON sensors;
CREATE POLICY "insert_own_sensors" ON sensors FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_sensors" ON sensors;
CREATE POLICY "update_own_sensors" ON sensors FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_sensors" ON sensors;
CREATE POLICY "delete_own_sensors" ON sensors FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Sensor Data (time-series)
CREATE TABLE IF NOT EXISTS sensor_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  sensor_id uuid REFERENCES sensors(id) ON DELETE CASCADE,
  machine_id uuid REFERENCES machines(id) ON DELETE CASCADE,
  value numeric NOT NULL,
  unit text DEFAULT '',
  quality text DEFAULT 'good',
  metadata jsonb DEFAULT '{}',
  recorded_at timestamptz DEFAULT now()
);
ALTER TABLE sensor_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_sensor_data" ON sensor_data;
CREATE POLICY "select_own_sensor_data" ON sensor_data FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_sensor_data" ON sensor_data;
CREATE POLICY "insert_own_sensor_data" ON sensor_data FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_sensor_data" ON sensor_data;
CREATE POLICY "update_own_sensor_data" ON sensor_data FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_sensor_data" ON sensor_data;
CREATE POLICY "delete_own_sensor_data" ON sensor_data FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Sensor Snapshots (aggregated per reading cycle)
CREATE TABLE IF NOT EXISTS sensor_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  machine_id uuid REFERENCES machines(id) ON DELETE CASCADE,
  temperature numeric DEFAULT 0,
  vibration_rms numeric DEFAULT 0,
  current numeric DEFAULT 0,
  rpm numeric DEFAULT 0,
  voltage numeric DEFAULT 220,
  recorded_at timestamptz DEFAULT now()
);
ALTER TABLE sensor_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_snapshots" ON sensor_snapshots;
CREATE POLICY "select_own_snapshots" ON sensor_snapshots FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_snapshots" ON sensor_snapshots;
CREATE POLICY "insert_own_snapshots" ON sensor_snapshots FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_snapshots" ON sensor_snapshots;
CREATE POLICY "delete_own_snapshots" ON sensor_snapshots FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Machine Health (latest state, upserted)
CREATE TABLE IF NOT EXISTS machine_health (
  machine_id uuid PRIMARY KEY REFERENCES machines(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  rms_x numeric DEFAULT 0,
  rms_y numeric DEFAULT 0,
  temperature numeric DEFAULT 0,
  current numeric DEFAULT 0,
  rpm numeric DEFAULT 0,
  voltage numeric DEFAULT 220,
  health_score numeric DEFAULT 100,
  status text DEFAULT 'healthy',
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE machine_health ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_health" ON machine_health;
CREATE POLICY "select_own_health" ON machine_health FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_health" ON machine_health;
CREATE POLICY "insert_own_health" ON machine_health FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_health" ON machine_health;
CREATE POLICY "update_own_health" ON machine_health FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_health" ON machine_health;
CREATE POLICY "delete_own_health" ON machine_health FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Alerts
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  machine_id uuid REFERENCES machines(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'bearing_wear',
  severity text NOT NULL DEFAULT 'warning',
  message text NOT NULL,
  is_read boolean DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_alerts" ON alerts;
CREATE POLICY "select_own_alerts" ON alerts FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_alerts" ON alerts;
CREATE POLICY "insert_own_alerts" ON alerts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_alerts" ON alerts;
CREATE POLICY "update_own_alerts" ON alerts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_alerts" ON alerts;
CREATE POLICY "delete_own_alerts" ON alerts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Settings (key-value)
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text NOT NULL DEFAULT '',
  category text DEFAULT 'general',
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_settings" ON settings;
CREATE POLICY "select_own_settings" ON settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_settings" ON settings;
CREATE POLICY "insert_own_settings" ON settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_settings" ON settings;
CREATE POLICY "update_own_settings" ON settings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_settings" ON settings;
CREATE POLICY "delete_own_settings" ON settings FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Communication Settings (6 industrial protocols)
CREATE TABLE IF NOT EXISTS communication_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  method text NOT NULL,
  name text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}',
  is_active boolean DEFAULT false,
  status text DEFAULT 'disconnected',
  last_connected_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE communication_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_comm" ON communication_settings;
CREATE POLICY "select_own_comm" ON communication_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_comm" ON communication_settings;
CREATE POLICY "insert_own_comm" ON communication_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_comm" ON communication_settings;
CREATE POLICY "update_own_comm" ON communication_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_comm" ON communication_settings;
CREATE POLICY "delete_own_comm" ON communication_settings FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_machines_user ON machines(user_id);
CREATE INDEX IF NOT EXISTS idx_sensors_user ON sensors(user_id);
CREATE INDEX IF NOT EXISTS idx_sensors_machine ON sensors(machine_id);
CREATE INDEX IF NOT EXISTS idx_sensor_data_machine ON sensor_data(machine_id);
CREATE INDEX IF NOT EXISTS idx_sensor_data_recorded ON sensor_data(recorded_at);
CREATE INDEX IF NOT EXISTS idx_snapshots_machine ON sensor_snapshots(machine_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_recorded ON sensor_snapshots(recorded_at);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_comm_settings_user ON communication_settings(user_id);
