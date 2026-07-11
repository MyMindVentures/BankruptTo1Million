import { createClient } from '@supabase/supabase-js';

type RequiredSupabaseEnvVar = 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY';

function readRequiredSupabaseEnvVar(name: RequiredSupabaseEnvVar): string {
  const value = import.meta.env[name];

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(
      `Missing required Supabase environment variable: ${name}. Copy .env.example to .env.local and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.`,
    );
  }

  return value;
}

const supabaseUrl = readRequiredSupabaseEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = readRequiredSupabaseEnvVar('VITE_SUPABASE_ANON_KEY');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
