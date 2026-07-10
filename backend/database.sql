-- ============================================================
-- PREDICTIVE MAINTENANCE SYSTEM - COMPLETE DATABASE SCHEMA
-- PostgreSQL / Supabase
-- ============================================================
-- This file defines the complete production-ready schema for
-- the AI-powered industrial predictive maintenance system.
-- ============================================================

-- ============================================================
-- 1. USERS (user_profiles - extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT NOT NULL UNIQUE,
  full_name       TEXT NOT NULL DEFAULT '',
  role            TEXT NOT NULL DEFAULT 'operator'
                  CHECK (role IN ('admin', 'operator', 'viewer')),
  password_hash   TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_profiles_select" ON user_profiles
  FOR SELECT TO authenticated USING (auth.uid() = id OR true);
CREATE POLICY "user_profiles_insert" ON user_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "user_profiles_update" ON user_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================
-- 2. MACHINES
-- ============================================================
CREATE TABLE IF NOT EXISTS machines (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL DEFAULT auth.uid()
                REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  location      TEXT NOT NULL DEFAULT '',
  description   TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'online'
                CHECK (status IN ('online','offline','warning','critical')),
  rms_min       NUMERIC NOT NULL DEFAULT 0.5,
  rms_max       NUMERIC NOT NULL DEFAULT 3.0,
  temp_min      NUMERIC NOT NULL DEFAULT 20.0,
  temp_max      NUMERIC NOT NULL DEFAULT 85.0,
  current_min   NUMERIC NOT NULL DEFAULT 0.5,
  current_max   NUMERIC NOT NULL DEFAULT 5.0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_machines_user ON machines(user_id);

ALTER TABLE machines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "machines_select" ON machines
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "machines_insert" ON machines
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "machines_update" ON machines
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "machines_delete" ON machines
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 3. SENSORS
-- ============================================================
CREATE TABLE IF NOT EXISTS sensors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id      UUID REFERENCES machines(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL DEFAULT auth.uid()
                  REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'vibration'
                  CHECK (type IN ('vibration','temperature','current','frequency','rpm','voltage','multi')),
  channel         TEXT NOT NULL DEFAULT 'X',
  unit            TEXT NOT NULL DEFAULT 'g',
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','inactive','error')),
  sampling_rate   INTEGER NOT NULL DEFAULT 1000,
  min_value       NUMERIC NOT NULL DEFAULT 0,
  max_value       NUMERIC NOT NULL DEFAULT 100,
  description     TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sensors_machine ON sensors(machine_id);
CREATE INDEX IF NOT EXISTS idx_sensors_user ON sensors(user_id);

ALTER TABLE sensors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sensors_select" ON sensors
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "sensors_insert" ON sensors
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sensors_update" ON sensors
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sensors_delete" ON sensors
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 4. SENSOR_DATA (raw / aggregated readings)
-- ============================================================
CREATE TABLE IF NOT EXISTS sensor_data (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sensor_id     UUID NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
  machine_id    UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL DEFAULT auth.uid()
                REFERENCES auth.users(id) ON DELETE CASCADE,
  value         NUMERIC NOT NULL DEFAULT 0,
  unit          TEXT NOT NULL DEFAULT 'g',
  quality       TEXT NOT NULL DEFAULT 'good'
                CHECK (quality IN ('good','suspect','bad')),
  recorded_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sensor_data_sensor_time ON sensor_data(sensor_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_data_machine_time ON sensor_data(machine_id, recorded_at DESC);

ALTER TABLE sensor_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sensor_data_select" ON sensor_data
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "sensor_data_insert" ON sensor_data
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sensor_data_update" ON sensor_data
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sensor_data_delete" ON sensor_data
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 5. PREDICTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS predictions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id          UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL DEFAULT auth.uid()
                      REFERENCES auth.users(id) ON DELETE CASCADE,
  health_score        NUMERIC NOT NULL DEFAULT 100
                      CHECK (health_score BETWEEN 0 AND 100),
  status              TEXT NOT NULL DEFAULT 'healthy'
                      CHECK (status IN ('healthy','warning','critical')),
  bearing_wear_pct    NUMERIC NOT NULL DEFAULT 0,
  overheating_risk_pct NUMERIC NOT NULL DEFAULT 0,
  failure_risk_pct    NUMERIC NOT NULL DEFAULT 0,
  rul_hours           INTEGER NOT NULL DEFAULT 9999,
  predicted_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_predictions_machine_time ON predictions(machine_id, predicted_at DESC);

ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "predictions_select" ON predictions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "predictions_insert" ON predictions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "predictions_update" ON predictions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "predictions_delete" ON predictions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 6. ALERTS
-- ============================================================
CREATE TABLE IF NOT EXISTS alerts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id    UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL DEFAULT auth.uid()
                REFERENCES auth.users(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (
                type IN ('bearing_wear','overheating','abnormal_vibration','current_spike','rpm_anomaly')),
  severity      TEXT NOT NULL DEFAULT 'warning'
                CHECK (severity IN ('info','warning','critical')),
  message       TEXT NOT NULL,
  is_read       BOOLEAN NOT NULL DEFAULT false,
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_machine_created ON alerts(machine_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_user_unread ON alerts(user_id, is_read, created_at DESC);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alerts_select" ON alerts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "alerts_insert" ON alerts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "alerts_update" ON alerts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "alerts_delete" ON alerts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 7. MAINTENANCE_LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS maintenance_logs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id            UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL DEFAULT auth.uid()
                        REFERENCES auth.users(id) ON DELETE CASCADE,
  action                TEXT NOT NULL,
  notes                 TEXT NOT NULL DEFAULT '',
  performed_by          TEXT NOT NULL DEFAULT 'System',
  performed_at          TIMESTAMPTZ DEFAULT now(),
  next_maintenance_at   TIMESTAMPTZ,
  scheduled_by          TEXT NOT NULL DEFAULT 'System'
);

CREATE INDEX IF NOT EXISTS idx_maint_logs_machine_time ON maintenance_logs(machine_id, performed_at DESC);

ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "maint_select" ON maintenance_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "maint_insert" ON maintenance_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "maint_update" ON maintenance_logs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "maint_delete" ON maintenance_logs
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 8. SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL DEFAULT auth.uid()
              REFERENCES auth.users(id) ON DELETE CASCADE,
  key         TEXT NOT NULL,
  value       TEXT NOT NULL DEFAULT '',
  category    TEXT NOT NULL DEFAULT 'general',
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, key)
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_select" ON settings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "settings_insert" ON settings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "settings_update" ON settings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "settings_delete" ON settings
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- HELPER: updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_machines_updated
  BEFORE UPDATE ON machines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sensors_updated
  BEFORE UPDATE ON sensors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_user_profiles_updated
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_settings_updated
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
