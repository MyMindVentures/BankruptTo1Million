type RequiredSupabaseEnvVar = 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY';

type SupabaseRequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  query?: string;
  accessToken?: string | null;
};

function readRequiredSupabaseEnvVar(name: RequiredSupabaseEnvVar): string {
  const value = import.meta.env[name];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing required Supabase environment variable: ${name}.`);
  }
  return value;
}

const supabaseUrl = readRequiredSupabaseEnvVar('VITE_SUPABASE_URL').replace(/\/$/, '');
const supabaseAnonKey = readRequiredSupabaseEnvVar('VITE_SUPABASE_ANON_KEY');

function headers(accessToken?: string | null, extra?: Record<string, string>) {
  return {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${accessToken || supabaseAnonKey}`,
    'Content-Type': 'application/json',
    ...(extra || {}),
  };
}

export type SupabaseSession = {
  access_token: string;
  refresh_token?: string;
  user: { id: string; email?: string };
};

export const supabase = {
  url: supabaseUrl,
  from(tableName: string) {
    const tableUrl = `${supabaseUrl}/rest/v1/${encodeURIComponent(tableName)}`;
    return {
      request(options: SupabaseRequestOptions = {}) {
        return fetch(`${tableUrl}${options.query ? `?${options.query}` : ''}`, {
          method: options.method || 'GET',
          headers: headers(options.accessToken, options.headers),
          body: options.body === undefined ? undefined : JSON.stringify(options.body),
        });
      },
    };
  },
  rpc(functionName: string, body: unknown, accessToken?: string | null) {
    return fetch(`${supabaseUrl}/rest/v1/rpc/${functionName}`, {
      method: 'POST',
      headers: headers(accessToken),
      body: JSON.stringify(body),
    });
  },
  auth: {
    storageKey: 'b1m.supabase.session',
    getSession(): SupabaseSession | null {
      const raw = window.localStorage.getItem(this.storageKey);
      if (!raw) return null;
      try { return JSON.parse(raw) as SupabaseSession; } catch { return null; }
    },
    setSession(session: SupabaseSession | null) {
      if (session) window.localStorage.setItem(this.storageKey, JSON.stringify(session));
      else window.localStorage.removeItem(this.storageKey);
    },
    async signInWithPassword(email: string, password: string) {
      const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) throw new Error(await response.text());
      const session = await response.json() as SupabaseSession;
      this.setSession(session);
      return session;
    },
    async signUp(email: string, password: string) {
      const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) throw new Error(await response.text());
      const session = await response.json() as SupabaseSession;
      if (session.access_token) this.setSession(session);
      return session;
    },
    signOut() { this.setSession(null); },
  },
};
