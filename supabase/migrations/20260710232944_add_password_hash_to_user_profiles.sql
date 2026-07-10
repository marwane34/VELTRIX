-- Add password_hash column to user_profiles for local auth
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;
