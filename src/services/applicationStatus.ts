import { Job, ApplicationStatus } from '../types';
import { syncApplicationStatus } from './cloudSync';

export const LOCAL_STORAGE_KEY = 'job_hunter_application_status_v1';

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  NEW: 'Nova',
  PREPARED: 'Preparada',
  APPLIED: 'Candidatado',
  INTERVIEW: 'Entrevista',
  REJECTED: 'Rejeitada',
  OFFER: 'Oferta',
};

export const STATUS_COLORS: Record<ApplicationStatus, { bg: string; text: string; border: string }> = {
  NEW: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  PREPARED: { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300' },
  APPLIED: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  INTERVIEW: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
  REJECTED: { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300' },
  OFFER: { bg: 'bg-amber-100', text: 'text-amber-900', border: 'border-amber-300' },
};

/**
 * Computes a stable identifier for a job to survive page reloads and re-searches.
 * Priority: 1. Normalized URL, 2. Fallback: company + title + location
 */
export function getJobStableId(job: Job): string {
  if (job.url && job.url.trim().length > 5) {
    try {
      const parsed = new URL(job.url);
      // Clean query params that might be session-dependent while preserving job ID params
      return `${parsed.hostname}${parsed.pathname}`.toLowerCase().replace(/\/+$/, '');
    } catch {
      return job.url.toLowerCase().trim();
    }
  }

  const comp = (job.company || '').toLowerCase().trim();
  const tit = (job.title || '').toLowerCase().trim();
  const loc = (job.location || '').toLowerCase().trim();

  return `${comp}_${tit}_${loc}`.replace(/[^a-z0-9_]/g, '_');
}

/**
 * Loads stored status mapping from localStorage.
 */
export function getStoredStatuses(): Record<string, ApplicationStatus> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {};
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading application statuses from localStorage:', err);
    return {};
  }
}

/**
 * Saves status map to localStorage.
 */
export function saveStatusMap(map: Record<string, ApplicationStatus>): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.error('Error saving application statuses to localStorage:', err);
  }
}

/**
 * Gets status for a specific job.
 */
export function getJobStatus(job: Job): ApplicationStatus {
  const map = getStoredStatuses();
  const stableId = getJobStableId(job);
  return map[stableId] || 'NEW';
}

/**
 * Updates status for a specific job.
 */
export function setJobStatus(job: Job, status: ApplicationStatus): Record<string, ApplicationStatus> {
  const map = getStoredStatuses();
  const stableId = getJobStableId(job);
  map[stableId] = status;
  saveStatusMap(map);

  // Background Cloud Sync (Rule 12)
  syncApplicationStatus(job, status).catch((err) => {
    console.warn('[CloudSync] Background status sync notice:', err);
  });

  return map;
}

