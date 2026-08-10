import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Resolve environment variables safely in Vite / Node context
function getEnvVar(primaryKey: string, fallbackKey?: string): string | undefined {
  const metaEnv = (import.meta as any).env;
  if (metaEnv && metaEnv[primaryKey]) {
    return metaEnv[primaryKey];
  }
  if (fallbackKey && metaEnv && metaEnv[fallbackKey]) {
    return metaEnv[fallbackKey];
  }
  if (typeof process !== 'undefined' && process.env) {
    if ((process.env as any)[primaryKey]) {
      return (process.env as any)[primaryKey];
    }
    if (fallbackKey && (process.env as any)[fallbackKey]) {
      return (process.env as any)[fallbackKey];
    }
  }
  return undefined;
}

export let hasSupabaseUrl = false;
export let hasPublishableKey = false;
export let isSupabaseConfigured = false;
export let supabaseClient: SupabaseClient | null = null;

let initPromise: Promise<boolean> | null = null;

export function initSupabase(): Promise<boolean> {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    let url = getEnvVar('VITE_SUPABASE_URL');
    let key = getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_ANON_KEY');

    // If static env didn't supply credentials and we are in a browser, fetch from /api/config
    if ((!url || !key) && typeof window !== 'undefined' && typeof fetch !== 'undefined') {
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const config = await res.json();
          if (config.supabaseUrl && config.supabaseUrl.trim().length > 0) {
            url = config.supabaseUrl.trim();
          }
          if (config.supabasePublishableKey && config.supabasePublishableKey.trim().length > 0) {
            key = config.supabasePublishableKey.trim();
          }
        }
      } catch (err) {
        console.warn('[Supabase] Erro ao buscar /api/config:', err);
      }
    }

    hasSupabaseUrl = Boolean(url && url.trim().length > 0);
    hasPublishableKey = Boolean(key && key.trim().length > 0);
    isSupabaseConfigured = hasSupabaseUrl && hasPublishableKey;

    if (isSupabaseConfigured && url && key) {
      if (!supabaseClient) {
        try {
          supabaseClient = createClient(url, key, {
            auth: {
              persistSession: true,
              autoRefreshToken: true,
            },
          });
        } catch (err) {
          console.warn('[Supabase] Erro ao inicializar cliente Supabase:', err);
          supabaseClient = null;
          isSupabaseConfigured = false;
        }
      }
    }

    return isSupabaseConfigured;
  })();

  return initPromise;
}

// Trigger initial resolution immediately on module load
initSupabase();

/**
 * Retorna o ID do usuário autenticado no Supabase ou null se não houver sessão ativa.
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
  await initSupabase();
  if (!isSupabaseConfigured || !supabaseClient) {
    return null;
  }
  try {
    const { data: { user }, error } = await supabaseClient.auth.getUser();
    if (error || !user) {
      return null;
    }
    return user.id;
  } catch {
    return null;
  }
}

/**
 * Normaliza URLs de vagas para criar external_key estável e determinística.
 */
export function generateExternalKey(job: { url?: string; company: string; title: string; location?: string }): string {
  if (job.url && job.url.trim().length > 0) {
    try {
      let cleanUrl = job.url.trim().toLowerCase();
      // Remove query parameters and trailing slashes for clean matching
      cleanUrl = cleanUrl.split('?')[0].split('#')[0];
      if (cleanUrl.endsWith('/')) {
        cleanUrl = cleanUrl.slice(0, -1);
      }
      if (cleanUrl.length > 10) {
        return cleanUrl;
      }
    } catch {
      // Fallback below
    }
  }

  // Fallback: company|title|location
  const companyClean = (job.company || '').trim().toLowerCase();
  const titleClean = (job.title || '').trim().toLowerCase();
  const locClean = (job.location || '').trim().toLowerCase();

  return `${companyClean}|${titleClean}|${locClean}`;
}
