/*
# Communication Settings Table

## Purpose
Stores per-user industrial communication protocol configurations for the
VELTRIX predictive maintenance system. Each user can save multiple
communication method configurations (USB Serial, Wi-Fi, MQTT, Modbus TCP,
OPC UA, REST API), but only one can be active at a time.

## New Table: communication_settings
- id (uuid, primary key)
- user_id (uuid, FK to auth.users, owner-scoped)
- method (text, one of: usb_serial, wifi, mqtt, modbus_tcp, opcua, rest_api)
- name (text, user-friendly label for the configuration)
- config (jsonb, protocol-specific configuration fields)
- is_active (boolean, whether this is the currently active method)
- status (text, connection status: disconnected, connecting, connected, error)
- last_connected_at (timestamptz, last successful connection time)
- created_at (timestamptz)
- updated_at (timestamptz)

## Security
- RLS enabled, owner-scoped CRUD policies for authenticated users only.
*/

CREATE TABLE IF NOT EXISTS communication_settings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  method          text NOT NULL CHECK (method IN ('usb_serial','wifi','mqtt','modbus_tcp','opcua','rest_api')),
  name            text NOT NULL DEFAULT '',
  config          jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active       boolean NOT NULL DEFAULT false,
  status          text NOT NULL DEFAULT 'disconnected' CHECK (status IN ('disconnected','connecting','connected','error')),
  last_connected_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comm_settings_user ON communication_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_comm_settings_active ON communication_settings(user_id, is_active);

ALTER TABLE communication_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_comm_settings" ON communication_settings;
CREATE POLICY "select_own_comm_settings" ON communication_settings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_comm_settings" ON communication_settings;
CREATE POLICY "insert_own_comm_settings" ON communication_settings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_comm_settings" ON communication_settings;
CREATE POLICY "update_own_comm_settings" ON communication_settings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_comm_settings" ON communication_settings;
CREATE POLICY "delete_own_comm_settings" ON communication_settings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
