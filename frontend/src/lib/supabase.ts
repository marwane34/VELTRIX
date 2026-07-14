import { createClient } from '@supabase/supabase-js';

const env = (import.meta as any).env;

export const supabase = createClient(
  env.VITE_SUPABASE_URL || '',
  env.VITE_SUPABASE_ANON_KEY || ''
);
