type RequiredSupabaseEnvVar = 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY';

type SupabaseRequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

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

export const supabase = {
  from(tableName: string) {
    const tableUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/${encodeURIComponent(tableName)}`;

    return {
      request(options: SupabaseRequestOptions = {}) {
        return fetch(tableUrl, {
          method: options.method || 'GET',
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
            ...(options.headers || {}),
          },
          body: options.body === undefined ? undefined : JSON.stringify(options.body),
        });
      },
    };
  },
};
