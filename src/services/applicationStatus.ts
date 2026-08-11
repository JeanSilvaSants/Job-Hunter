import { Job, ApplicationStatus, ApplicationDetails, ApplicationEvent, ApplicationEventType } from '../types';
import { syncApplicationStatus, syncApplicationEvent } from './cloudSync';

export const LOCAL_STORAGE_KEY = 'job_hunter_application_status_v1';
export const LOCAL_STORAGE_DETAILS_KEY = 'job_hunter_application_details_v1';
export const LOCAL_STORAGE_EVENTS_KEY = 'job_hunter_application_events_v1';

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
  INTERVIEW: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
  REJECTED: { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300' },
  OFFER: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
};

/**
 * Computes a stable identifier for a job to survive page reloads and re-searches.
 * Priority: 1. Normalized URL, 2. Fallback: company + title + location
 */
export function getJobStableId(job: Job): string {
  if (job.url && job.url.trim().length > 5) {
    try {
      const parsed = new URL(job.url);
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
 * Loads stored application details map from localStorage.
 */
export function getStoredDetails(): Record<string, ApplicationDetails> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {};
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DETAILS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading application details from localStorage:', err);
    return {};
  }
}

/**
 * Saves application details map to localStorage.
 */
export function saveDetailsMap(map: Record<string, ApplicationDetails>): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    localStorage.setItem(LOCAL_STORAGE_DETAILS_KEY, JSON.stringify(map));
  } catch (err) {
    console.error('Error saving application details to localStorage:', err);
  }
}

/**
 * Loads stored application events from localStorage.
 */
export function getStoredEvents(): ApplicationEvent[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_EVENTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading application events from localStorage:', err);
    return [];
  }
}

/**
 * Saves application events list to localStorage.
 */
export function saveStoredEvents(events: ApplicationEvent[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    localStorage.setItem(LOCAL_STORAGE_EVENTS_KEY, JSON.stringify(events));
  } catch (err) {
    console.error('Error saving application events to localStorage:', err);
  }
}

/**
 * Calculates days spent in the current stage for an application.
 */
export function getDaysInCurrentStage(app: ApplicationDetails): number {
  const status = app.status;
  let stageDateStr: string | null | undefined = null;

  switch (status) {
    case 'PREPARED':
      stageDateStr = app.prepared_at;
      break;
    case 'APPLIED':
      stageDateStr = app.applied_at;
      break;
    case 'INTERVIEW':
      stageDateStr = app.interview_at;
      break;
    case 'REJECTED':
      stageDateStr = app.rejected_at;
      break;
    case 'OFFER':
      stageDateStr = app.offer_at;
      break;
  }

  stageDateStr = stageDateStr || app.last_activity_at || app.created_at;
  if (!stageDateStr) return 0;

  const stageDate = new Date(stageDateStr);
  if (isNaN(stageDate.getTime())) return 0;

  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - stageDate.getTime());
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculates days elapsed since applied for an application.
 */
export function getDaysSinceApplied(app: ApplicationDetails): number | null {
  if (!app.applied_at) return null;

  const appliedDate = new Date(app.applied_at);
  if (isNaN(appliedDate.getTime())) return null;

  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - appliedDate.getTime());
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Gets application details for a specific job, generating default if not present.
 */
export function getApplicationDetails(job: Job): ApplicationDetails {
  const stableId = getJobStableId(job);
  const detailsMap = getStoredDetails();
  const statusMap = getStoredStatuses();
  const status = statusMap[stableId] || job.status || 'NEW';

  if (detailsMap[stableId]) {
    return {
      ...detailsMap[stableId],
      status, // Ensure status is aligned
    };
  }

  const now = new Date().toISOString();
  const defaultDetails: ApplicationDetails = {
    jobId: job.id,
    jobKey: stableId,
    status,
    work_model: job.workplaceType,
    last_activity_at: now,
    created_at: now,
  };

  if (status === 'PREPARED') defaultDetails.prepared_at = now;
  if (status === 'APPLIED') defaultDetails.applied_at = now;
  if (status === 'INTERVIEW') defaultDetails.interview_at = now;
  if (status === 'REJECTED') defaultDetails.rejected_at = now;
  if (status === 'OFFER') defaultDetails.offer_at = now;

  return defaultDetails;
}

/**
 * Gets status for a specific job.
 */
export function getJobStatus(job: Job): ApplicationStatus {
  const map = getStoredStatuses();
  const stableId = getJobStableId(job);
  return map[stableId] || job.status || 'NEW';
}

/**
 * Updates status and application details for a specific job.
 * Handles automatic stage timestamps and creates a STATUS_CHANGE event if status changed.
 */
export function setJobStatus(job: Job, newStatus: ApplicationStatus, notes?: string): Record<string, ApplicationStatus> {
  const stableId = getJobStableId(job);
  const statusMap = getStoredStatuses();
  const oldStatus = statusMap[stableId] || job.status || 'NEW';

  // Update status map
  statusMap[stableId] = newStatus;
  saveStatusMap(statusMap);

  // Update details
  const detailsMap = getStoredDetails();
  const existingDetails = detailsMap[stableId] || getApplicationDetails(job);
  const now = new Date().toISOString();

  const updatedDetails: ApplicationDetails = {
    ...existingDetails,
    jobId: job.id,
    jobKey: stableId,
    status: newStatus,
    last_activity_at: now,
    updated_at: now,
  };

  if (notes !== undefined) {
    updatedDetails.notes = notes;
  }

  // Preserve previous timestamps while setting the timestamp for the new status
  if (newStatus === 'PREPARED' && !updatedDetails.prepared_at) updatedDetails.prepared_at = now;
  if (newStatus === 'APPLIED' && !updatedDetails.applied_at) updatedDetails.applied_at = now;
  if (newStatus === 'INTERVIEW' && !updatedDetails.interview_at) updatedDetails.interview_at = now;
  if (newStatus === 'REJECTED' && !updatedDetails.rejected_at) updatedDetails.rejected_at = now;
  if (newStatus === 'OFFER' && !updatedDetails.offer_at) updatedDetails.offer_at = now;

  detailsMap[stableId] = updatedDetails;
  saveDetailsMap(detailsMap);

  // Only create status_change event if status actually changed
  let autoEvent: ApplicationEvent | null = null;
  if (oldStatus !== newStatus) {
    const eventKey = `status_change_${stableId}_${oldStatus}_${newStatus}_${Date.now()}`;
    autoEvent = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `event_${Date.now()}`,
      application_id: existingDetails.id || stableId,
      job_id: job.id,
      from_status: oldStatus,
      to_status: newStatus,
      event_type: 'STATUS_CHANGE',
      notes: notes || null,
      event_key: eventKey,
      created_at: now,
    };

    const events = getStoredEvents();
    // Prevent duplicate event_key in local storage
    if (!events.some((e) => e.event_key === eventKey)) {
      events.push(autoEvent);
      saveStoredEvents(events);
    }
  }

  // Background Cloud Sync (Rule 12 & Phase 3.1)
  syncApplicationStatus(job, updatedDetails, autoEvent).catch((err) => {
    console.warn('[CloudSync] Background status sync notice:', err);
  });

  return statusMap;
}

/**
 * Updates application details (e.g. notes, recruiter info, salary, next_step) without changing status.
 */
export function updateApplicationDetails(job: Job, updates: Partial<ApplicationDetails>): ApplicationDetails {
  const stableId = getJobStableId(job);
  const detailsMap = getStoredDetails();
  const existing = detailsMap[stableId] || getApplicationDetails(job);
  const now = new Date().toISOString();

  const updated: ApplicationDetails = {
    ...existing,
    ...updates,
    jobId: job.id,
    jobKey: stableId,
    last_activity_at: now,
    updated_at: now,
  };

  detailsMap[stableId] = updated;
  saveDetailsMap(detailsMap);

  // Sync to Supabase in background
  syncApplicationStatus(job, updated, null).catch((err) => {
    console.warn('[CloudSync] Background details sync notice:', err);
  });

  return updated;
}

/**
 * Adds a manual event (e.g. RECRUITER_CONTACT, INTERVIEW_SCHEDULED, etc.) to the application timeline.
 */
export function addManualApplicationEvent(
  job: Job,
  eventType: ApplicationEventType,
  notes?: string,
  metadata?: Record<string, any>
): ApplicationEvent {
  const stableId = getJobStableId(job);
  const details = getApplicationDetails(job);
  const now = new Date().toISOString();
  const eventKey = `manual_event_${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;

  const newEvent: ApplicationEvent = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `evt_${Date.now()}`,
    application_id: details.id || stableId,
    job_id: job.id,
    from_status: null,
    to_status: null,
    event_type: eventType,
    notes: notes || null,
    metadata: metadata || {},
    event_key: eventKey,
    created_at: now,
  };

  const events = getStoredEvents();
  events.push(newEvent);
  saveStoredEvents(events);

  // Update last_activity_at on application details
  updateApplicationDetails(job, { last_activity_at: now });

  // Cloud sync
  syncApplicationEvent(job, newEvent).catch((err) => {
    console.warn('[CloudSync] Background event sync notice:', err);
  });

  return newEvent;
}


