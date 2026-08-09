import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Resolve environment variables safely in Vite / Node context
function getEnvVar(viteKey: string, processKey: string): string | undefined {
  const metaEnv = (import.meta as any).env;
  if (metaEnv && metaEnv[viteKey]) {
    return metaEnv[viteKey];
  }
  if (typeof process !== 'undefined' && process.env && process.env[processKey]) {
    return process.env[processKey];
  }
  if (typeof process !== 'undefined' && process.env && (process.env as any)[viteKey]) {
    return (process.env as any)[viteKey];
  }
  return undefined;
}


const supabaseUrl = getEnvVar('VITE_SUPABASE_URL', 'SUPABASE_URL');
const supabaseAnonKey =
  getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_PUBLISHABLE_KEY') ||
  getEnvVar('VITE_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY');

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl.trim().length > 0 &&
  supabaseAnonKey &&
  supabaseAnonKey.trim().length > 0
);

export let supabaseClient: SupabaseClient | null = null;

if (isSupabaseConfigured && supabaseUrl && supabaseAnonKey) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  } catch (err) {
    console.warn('[Supabase] Erro ao inicializar cliente Supabase:', err);
    supabaseClient = null;
  }
}

/**
 * Retorna o ID do usuário autenticado no Supabase ou null se não houver sessão ativa.
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
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
