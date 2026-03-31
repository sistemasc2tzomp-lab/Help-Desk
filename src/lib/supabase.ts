import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Read from env or localStorage (runtime config)
function getConfig() {
  const url =
    import.meta.env.VITE_SUPABASE_URL ||
    localStorage.getItem('sb_url') ||
    '';
  const key =
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    localStorage.getItem('sb_key') ||
    '';
  return { url, key };
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = getConfig();
  return Boolean(url && key && url.startsWith('http'));
}

// Lazy singleton so we never call createClient with empty strings
let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;
  const { url, key } = getConfig();
  if (!url || !key) {
    throw new Error('Supabase no está configurado. Agrega las variables de entorno o configúralo en la app.');
  }
  _client = createClient(url, key);
  return _client;
}

// Called when user saves credentials at runtime
export function initSupabase(url: string, key: string): SupabaseClient {
  localStorage.setItem('sb_url', url);
  localStorage.setItem('sb_key', key);
  _client = createClient(url, key);
  return _client;
}

export function resetSupabaseClient() {
  _client = null;
}

// Convenience proxy — only use after isSupabaseConfigured() === true
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return getSupabase()[prop as keyof SupabaseClient];
  },
});
