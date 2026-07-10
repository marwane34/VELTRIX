-- ============================================================
-- SENSORS
-- ============================================================
CREATE TABLE IF NOT EXISTS sensors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid REFERENCES machines(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'vibration' CHECK (type IN ('vibration','temperature','current','frequency','rpm','voltage','multi')),
  channel text NOT NULL DEFAULT 'X',
  unit text NOT NULL DEFAULT 'g',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','error')),
  sampling_rate integer NOT NULL DEFAULT 1000,
  min_value numeric NOT NULL DEFAULT 0,
  max_value numeric NOT NULL DEFAULT 100,
  description text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sensors_machine ON sensors(machine_id);
CREATE INDEX IF NOT EXISTS sensors_user ON sensors(user_id);

ALTER TABLE sensors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sensors_select" ON sensors;
CREATE POLICY "sensors_select" ON sensors FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "sensors_insert" ON sensors;
CREATE POLICY "sensors_insert" ON sensors FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "sensors_update" ON sensors;
CREATE POLICY "sensors_update" ON sensors FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "sensors_delete" ON sensors;
CREATE POLICY "sensors_delete" ON sensors FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- SENSOR_DATA (raw high-frequency readings)
-- ============================================================
CREATE TABLE IF NOT EXISTS sensor_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sensor_id uuid NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
  machine_id uuid NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  value numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'g',
  quality text NOT NULL DEFAULT 'good' CHECK (quality IN ('good','suspect','bad')),
  recorded_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sensor_data_sensor_time ON sensor_data(sensor_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS sensor_data_machine_time ON sensor_data(machine_id, recorded_at DESC);

ALTER TABLE sensor_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sensor_data_select" ON sensor_data;
CREATE POLICY "sensor_data_select" ON sensor_data FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "sensor_data_insert" ON sensor_data;
CREATE POLICY "sensor_data_insert" ON sensor_data FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "sensor_data_update" ON sensor_data;
CREATE POLICY "sensor_data_update" ON sensor_data FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "sensor_data_delete" ON sensor_data;
CREATE POLICY "sensor_data_delete" ON sensor_data FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- SETTINGS (application-level settings per user)
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'general',
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, key)
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_select" ON settings;
CREATE POLICY "settings_select" ON settings FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "settings_insert" ON settings;
CREATE POLICY "settings_insert" ON settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "settings_update" ON settings;
CREATE POLICY "settings_update" ON settings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "settings_delete" ON settings;
CREATE POLICY "settings_delete" ON settings FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- USERS metadata table (extends auth.users with roles)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'operator' CHECK (role IN ('admin','operator','viewer')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_profiles_select" ON user_profiles;
CREATE POLICY "user_profiles_select" ON user_profiles FOR SELECT TO authenticated USING (auth.uid() = id OR true);

DROP POLICY IF EXISTS "user_profiles_insert" ON user_profiles;
CREATE POLICY "user_profiles_insert" ON user_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "user_profiles_update" ON user_profiles;
CREATE POLICY "user_profiles_update" ON user_profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================
-- MAINTENANCE_LOGS: add next_maintenance_at column
-- ============================================================
ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS next_maintenance_at timestamptz;
ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS scheduled_by text NOT NULL DEFAULT 'System';
