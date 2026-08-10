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

export interface SupabaseConfigDetails {
  apiConfigHttpStatus: string;
  configJsonValid: boolean;
  urlReceivedFromBackend: boolean;
  publishableKeyReceivedFromBackend: boolean;
  createClientExecuted: boolean;
  supabaseSessionActive: boolean;
}

export const configDetails: SupabaseConfigDetails = {
  apiConfigHttpStatus: 'Pendente',
  configJsonValid: false,
  urlReceivedFromBackend: false,
  publishableKeyReceivedFromBackend: false,
  createClientExecuted: false,
  supabaseSessionActive: false,
};

export let hasSupabaseUrl = false;
export let hasPublishableKey = false;
export let isSupabaseConfigured = false;
export let supabaseClient: SupabaseClient | null = null;

let initPromise: Promise<boolean> | null = null;

export function initSupabase(force = false): Promise<boolean> {
  if (initPromise && !force && isSupabaseConfigured) {
    return initPromise;
  }

  if (force || !isSupabaseConfigured) {
    initPromise = null;
  }

  initPromise = (async () => {
    let url = getEnvVar('VITE_SUPABASE_URL');
    let key = getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_ANON_KEY');

    if (url && key) {
      configDetails.apiConfigHttpStatus = '200 (Env estático)';
      configDetails.configJsonValid = true;
      configDetails.urlReceivedFromBackend = true;
      configDetails.publishableKeyReceivedFromBackend = true;
    } else if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
      try {
        const res = await fetch('/api/config', { cache: 'no-store' });
        configDetails.apiConfigHttpStatus = String(res.status);
        if (res.ok) {
          try {
            const config = await res.json();
            configDetails.configJsonValid = Boolean(config && typeof config === 'object');
            if (config && config.supabaseUrl && typeof config.supabaseUrl === 'string' && config.supabaseUrl.trim().length > 0) {
              url = config.supabaseUrl.trim();
              configDetails.urlReceivedFromBackend = true;
            } else {
              configDetails.urlReceivedFromBackend = false;
            }
            if (config && config.supabasePublishableKey && typeof config.supabasePublishableKey === 'string' && config.supabasePublishableKey.trim().length > 0) {
              key = config.supabasePublishableKey.trim();
              configDetails.publishableKeyReceivedFromBackend = true;
            } else {
              configDetails.publishableKeyReceivedFromBackend = false;
            }
          } catch {
            configDetails.configJsonValid = false;
          }
        }
      } catch (err) {
        configDetails.apiConfigHttpStatus = 'Erro de Rede';
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
          configDetails.createClientExecuted = true;
        } catch (err) {
          console.warn('[Supabase] Erro ao inicializar cliente Supabase:', err);
          supabaseClient = null;
          isSupabaseConfigured = false;
          configDetails.createClientExecuted = false;
        }
      } else {
        configDetails.createClientExecuted = true;
      }
    } else {
      configDetails.createClientExecuted = false;
    }

    return isSupabaseConfigured;
  })();

  return initPromise;
}

// Trigger initial resolution immediately on module load
initSupabase();

/**
 * Realiza o encerramento da sessão no Supabase, limpa os tokens de autenticação locais
 * e recarrega a página para retornar imediatamente à tela de login.
 */
export async function signOutUser(): Promise<void> {
  await initSupabase();
  if (supabaseClient) {
    try {
      await supabaseClient.auth.signOut();
    } catch {
      try {
        await supabaseClient.auth.signOut({ scope: 'local' });
      } catch (err) {
        console.warn('[Supabase] Erro ao encerrar sessão local:', err);
      }
    }
  }

  // Remapeia e limpa especificamente tokens de auth do Supabase do localStorage sem apagar os dados da app
  if (typeof window !== 'undefined' && window.localStorage) {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase.auth.token'))) {
        localStorage.removeItem(key);
      }
    }
    window.location.href = window.location.origin;
  }
}

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
