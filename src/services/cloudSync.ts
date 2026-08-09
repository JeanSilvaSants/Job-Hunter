import { supabaseClient, isSupabaseConfigured, generateExternalKey, getAuthenticatedUserId } from './supabase';
import { Job, JobWithAnalysis, ApplicationStatus } from '../types';
import { TailoredResume } from './resume';

export interface CloudSyncDiagnostics {
  configured: boolean;
  authenticated: boolean;
  connected: boolean;
  userEmail: string | null;
  lastSync: string | null;
  jobsSynced: number;
  applicationsSynced: number;
  resumesSynced: number;
  snapshotsSynced: number;
  errors: string[];
}

let lastSyncTimestamp: string | null = null;
let syncErrors: string[] = [];

// Session cache to prevent saving source snapshot more than once per source per session (Rule 21)
const savedSnapshotsThisSession = new Set<string>();

/**
 * Checks connectivity to Supabase.
 */
export async function testSupabaseConnection(): Promise<boolean> {
  if (!isSupabaseConfigured || !supabaseClient) {
    return false;
  }
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      console.warn('[CloudSync] Test connection: No authenticated user session.');
      return false;
    }
    const { error } = await supabaseClient.from('jobs').select('id').limit(1);
    if (error) {
      console.warn('[CloudSync] Test connection error:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[CloudSync] Connection failed:', err);
    return false;
  }
}

/**
 * Rule 7 & 11: Saves job to Supabase if authenticated AND (score >= 75 OR status != NEW OR forced manually).
 * Enforces user_id and composite constraint (user_id, external_key).
 */
export async function syncJobToSupabase(
  job: Job | JobWithAnalysis,
  options: { force?: boolean } = {}
): Promise<string | null> {
  if (!isSupabaseConfigured || !supabaseClient) {
    return null;
  }

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    // Unauthenticated user — sync is strictly disabled
    return null;
  }

  const score = (job as JobWithAnalysis).analysis?.score ?? 0;
  const status = job.status || 'NEW';
  const shouldSave = options.force || score >= 75 || status !== 'NEW';

  if (!shouldSave) {
    return null;
  }

  const extKey = generateExternalKey(job);
  const now = new Date().toISOString();
  const analysis = (job as JobWithAnalysis).analysis;

  const payload = {
    user_id: userId,
    external_key: extKey,
    title: job.title,
    company: job.company,
    location: job.location || '',
    description: job.description || '',
    url: job.url || '',
    published_at: job.publishedAt ? new Date(job.publishedAt).toISOString() : now,
    source: job.source || 'unknown',
    sources: job.sources || (job.source ? [job.source] : []),
    geo_classification: job.geoCategory || null,
    score: score,
    score_breakdown: analysis?.breakdown || {},
    ats_coverage: analysis ? Math.round((analysis.matchedSkills.length / Math.max(1, analysis.matchedSkills.length + analysis.missingSkills.length)) * 100) : null,
    matched_skills: analysis?.matchedSkills || [],
    related_skills: analysis?.relatedSkills || [],
    missing_skills: analysis?.missingSkills || [],
    ats_keywords: analysis?.atsKeywords || [],
    match_reasons: analysis?.matchReasons || [],
    last_seen_at: now,
    updated_at: now,
  };

  try {
    const { data, error } = await supabaseClient
      .from('jobs')
      .upsert(payload, { onConflict: 'user_id, external_key' })
      .select('id')
      .single();

    if (error) {
      console.error('[CloudSync] Error upserting job:', error.message);
      syncErrors.push(`Job ${job.title}: ${error.message}`);
      return null;
    }

    lastSyncTimestamp = new Date().toLocaleTimeString('pt-BR');
    return data?.id || null;
  } catch (err: any) {
    console.error('[CloudSync] Job sync failed:', err);
    syncErrors.push(`Job ${job.title}: ${err.message || String(err)}`);
    return null;
  }
}

/**
 * Rule 9 & 12: Sync application status change to `applications` table.
 * Enforces job.user_id === authenticated user.id.
 */
export async function syncApplicationStatus(
  job: Job | JobWithAnalysis,
  status: ApplicationStatus,
  notes?: string
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabaseClient) {
    return false;
  }

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return false;
  }

  try {
    // 1. Ensure job is upserted first under current user_id
    const jobId = await syncJobToSupabase(job, { force: true });
    if (!jobId) return false;

    // 2. Fetch existing application to avoid overwriting existing timestamps
    const { data: existingApp } = await supabaseClient
      .from('applications')
      .select('*')
      .eq('user_id', userId)
      .eq('job_id', jobId)
      .maybeSingle();

    const now = new Date().toISOString();

    const prepared_at = status === 'PREPARED' ? (existingApp?.prepared_at || now) : existingApp?.prepared_at || null;
    const applied_at = status === 'APPLIED' ? (existingApp?.applied_at || now) : existingApp?.applied_at || null;
    const interview_at = status === 'INTERVIEW' ? (existingApp?.interview_at || now) : existingApp?.interview_at || null;
    const rejected_at = status === 'REJECTED' ? (existingApp?.rejected_at || now) : existingApp?.rejected_at || null;
    const offer_at = status === 'OFFER' ? (existingApp?.offer_at || now) : existingApp?.offer_at || null;

    const payload = {
      user_id: userId,
      job_id: jobId,
      status,
      prepared_at,
      applied_at,
      interview_at,
      rejected_at,
      offer_at,
      notes: notes !== undefined ? notes : existingApp?.notes || '',
      updated_at: now,
    };

    const { error } = await supabaseClient
      .from('applications')
      .upsert(payload, { onConflict: 'user_id, job_id' });

    if (error) {
      console.error('[CloudSync] Error syncing application status:', error.message);
      syncErrors.push(`Status ${job.title}: ${error.message}`);
      return false;
    }

    lastSyncTimestamp = new Date().toLocaleTimeString('pt-BR');
    return true;
  } catch (err: any) {
    console.error('[CloudSync] Status sync failed:', err);
    syncErrors.push(`Status ${job.title}: ${err.message || String(err)}`);
    return false;
  }
}

/**
 * Rule 9 & 13: Sync tailored resume to `tailored_resumes` table.
 * Enforces job.user_id === authenticated user.id.
 */
export async function syncTailoredResume(
  job: Job | JobWithAnalysis,
  tailoredResume: TailoredResume
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabaseClient) {
    return false;
  }

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return false;
  }

  try {
    // Ensure job is upserted first under current user_id
    const jobId = await syncJobToSupabase(job, { force: true });
    if (!jobId) return false;

    const now = new Date().toISOString();

    const payload = {
      user_id: userId,
      job_id: jobId,
      target_title: tailoredResume.targetTitle || job.title,
      headline: tailoredResume.headline,
      professional_summary: tailoredResume.professionalSummary,
      priority_skills: tailoredResume.prioritySkills || [],
      selected_experience: tailoredResume.selectedExperienceBullets || [],
      ats_keywords: tailoredResume.atsKeywords || {},
      matched_keywords: tailoredResume.atsKeywords?.matched || [],
      related_keywords: tailoredResume.atsKeywords?.related || [],
      missing_keywords: tailoredResume.atsKeywords?.missing || [],
      audit_notes: tailoredResume.notes || [],
      ats_coverage: tailoredResume.atsCoverageScore || 0,
      resume_text: JSON.stringify(tailoredResume),
      updated_at: now,
    };

    const { error } = await supabaseClient
      .from('tailored_resumes')
      .upsert(payload, { onConflict: 'user_id, job_id' });

    if (error) {
      console.error('[CloudSync] Error syncing tailored resume:', error.message);
      syncErrors.push(`Resume ${job.title}: ${error.message}`);
      return false;
    }

    lastSyncTimestamp = new Date().toLocaleTimeString('pt-BR');
    return true;
  } catch (err: any) {
    console.error('[CloudSync] Tailored resume sync failed:', err);
    syncErrors.push(`Resume ${job.title}: ${err.message || String(err)}`);
    return false;
  }
}

/**
 * Rule 10 & 21: Save source snapshot max once per source per session with user_id.
 */
export async function syncSourceSnapshot(data: {
  sourceName: string;
  provider: string;
  boardToken?: string;
  windowDays?: number;
  totalJobs: number;
  brazilLatamJobs: number;
  relevantJobs: number;
  jobs85Plus: number;
  jobs90Plus: number;
  relevanceRate?: number;
  highMatchRate?: number;
  excellentMatchRate?: number;
  yieldScore: number | null;
  confidence: string;
  currentPriority: number;
  suggestedPriority: number | 'WATCH';
}): Promise<boolean> {
  if (!isSupabaseConfigured || !supabaseClient) {
    return false;
  }

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return false;
  }

  const sessionKey = `${userId}_${data.sourceName}_${data.boardToken || 'default'}`;
  if (savedSnapshotsThisSession.has(sessionKey)) {
    return true; // Already saved this session
  }

  try {
    const payload = {
      user_id: userId,
      source_name: data.sourceName,
      provider: data.provider,
      board_token: data.boardToken || null,
      window_days: data.windowDays || 30,
      total_jobs: data.totalJobs,
      brazil_latam_jobs: data.brazilLatamJobs,
      relevant_jobs: data.relevantJobs,
      jobs_85_plus: data.jobs85Plus,
      jobs_90_plus: data.jobs90Plus,
      relevance_rate: data.relevanceRate ?? (data.brazilLatamJobs > 0 ? Math.round((data.relevantJobs / data.brazilLatamJobs) * 100) : 0),
      high_match_rate: data.highMatchRate ?? (data.brazilLatamJobs > 0 ? Math.round((data.jobs85Plus / data.brazilLatamJobs) * 100) : 0),
      excellent_match_rate: data.excellentMatchRate ?? (data.brazilLatamJobs > 0 ? Math.round((data.jobs90Plus / data.brazilLatamJobs) * 100) : 0),
      yield_score: data.yieldScore,
      confidence: data.confidence,
      current_priority: String(data.currentPriority),
      suggested_priority: String(data.suggestedPriority),
      captured_at: new Date().toISOString(),
    };

    const { error } = await supabaseClient.from('source_snapshots').insert(payload);

    if (error) {
      console.error('[CloudSync] Error saving source snapshot:', error.message);
      syncErrors.push(`Snapshot ${data.sourceName}: ${error.message}`);
      return false;
    }

    savedSnapshotsThisSession.add(sessionKey);
    lastSyncTimestamp = new Date().toLocaleTimeString('pt-BR');
    return true;
  } catch (err: any) {
    console.error('[CloudSync] Snapshot sync failed:', err);
    syncErrors.push(`Snapshot ${data.sourceName}: ${err.message || String(err)}`);
    return false;
  }
}

/**
 * Rule 15: Restore data from Supabase to local state for authenticated user.
 */
export async function restoreCloudData(): Promise<{
  restoredJobs: number;
  restoredApplications: number;
  restoredResumes: number;
  appliedMap: Record<string, ApplicationStatus>;
  tailoredResumesMap: Record<string, TailoredResume>;
} | null> {
  if (!isSupabaseConfigured || !supabaseClient) {
    return null;
  }

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return null;
  }

  try {
    // 1. Fetch jobs owned by user
    const { data: jobs, error: jErr } = await supabaseClient.from('jobs').select('*');
    if (jErr) throw jErr;

    // 2. Fetch applications owned by user
    const { data: apps, error: aErr } = await supabaseClient.from('applications').select('*');
    if (aErr) throw aErr;

    // 3. Fetch tailored resumes owned by user
    const { data: resumes, error: rErr } = await supabaseClient.from('tailored_resumes').select('*');
    if (rErr) throw rErr;

    const appliedMap: Record<string, ApplicationStatus> = {};
    const tailoredResumesMap: Record<string, TailoredResume> = {};

    // Map job UUID -> external_key or URL
    const jobIdToKeyMap = new Map<string, string>();
    (jobs || []).forEach((j) => {
      jobIdToKeyMap.set(j.id, j.external_key);
      if (j.url) jobIdToKeyMap.set(j.id, j.url);
    });

    (apps || []).forEach((app) => {
      const key = jobIdToKeyMap.get(app.job_id);
      if (key) {
        appliedMap[key] = app.status as ApplicationStatus;
      }
    });

    (resumes || []).forEach((res) => {
      const key = jobIdToKeyMap.get(res.job_id);
      if (key && res.resume_text) {
        try {
          tailoredResumesMap[key] = JSON.parse(res.resume_text);
        } catch {
          tailoredResumesMap[key] = {
            targetTitle: res.target_title || '',
            headline: res.headline || '',
            professionalSummary: res.professional_summary || '',
            prioritySkills: res.priority_skills || [],
            selectedExperienceBullets: res.selected_experience || [],
            atsKeywords: res.ats_keywords || { matched: [], related: [], missing: [] },
            atsCoverageScore: res.ats_coverage || 0,
            totalRelevantJobKeywords: 0,
            coveredJobKeywordsCount: 0,
            notes: res.audit_notes || [],
          };
        }
      }
    });

    lastSyncTimestamp = new Date().toLocaleTimeString('pt-BR');

    return {
      restoredJobs: jobs?.length || 0,
      restoredApplications: apps?.length || 0,
      restoredResumes: resumes?.length || 0,
      appliedMap,
      tailoredResumesMap,
    };
  } catch (err: any) {
    console.error('[CloudSync] Restore failed:', err);
    syncErrors.push(`Restore error: ${err.message || String(err)}`);
    return null;
  }
}

/**
 * Rule 14: Migrate local storage data to Supabase under authenticated user.
 */
export async function migrateLocalDataToSupabase(
  appliedMap: Record<string, ApplicationStatus>,
  tailoredResumesMap: Record<string, TailoredResume>,
  jobList: JobWithAnalysis[]
): Promise<{ migratedJobs: number; migratedApps: number; migratedResumes: number }> {
  if (!isSupabaseConfigured || !supabaseClient) {
    return { migratedJobs: 0, migratedApps: 0, migratedResumes: 0 };
  }

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    console.warn('[CloudSync] Migration blocked: User not authenticated.');
    return { migratedJobs: 0, migratedApps: 0, migratedResumes: 0 };
  }

  let migratedJobs = 0;
  let migratedApps = 0;
  let migratedResumes = 0;

  for (const job of jobList) {
    const extKey = generateExternalKey(job);
    const localStatus = appliedMap[job.url] || appliedMap[extKey] || job.status;
    const localResume = tailoredResumesMap[job.url] || tailoredResumesMap[extKey];

    // Sync job if high score or has status/resume
    if ((job.analysis?.score ?? 0) >= 75 || (localStatus && localStatus !== 'NEW') || localResume) {
      const jobId = await syncJobToSupabase({ ...job, status: localStatus }, { force: true });
      if (jobId) {
        migratedJobs++;

        if (localStatus && localStatus !== 'NEW') {
          const success = await syncApplicationStatus({ ...job, status: localStatus }, localStatus);
          if (success) migratedApps++;
        }

        if (localResume) {
          const success = await syncTailoredResume(job, localResume);
          if (success) migratedResumes++;
        }
      }
    }
  }

  lastSyncTimestamp = new Date().toLocaleTimeString('pt-BR');
  return { migratedJobs, migratedApps, migratedResumes };
}

/**
 * Diagnostics stats for UI panel.
 */
export async function getCloudSyncDiagnostics(): Promise<CloudSyncDiagnostics> {
  const configured = isSupabaseConfigured;
  let authenticated = false;
  let userEmail: string | null = null;
  let connected = false;
  let jobsSynced = 0;
  let applicationsSynced = 0;
  let resumesSynced = 0;
  let snapshotsSynced = 0;

  if (configured && supabaseClient) {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) {
        authenticated = true;
        userEmail = user.email || null;

        const { count: jCount, error: jErr } = await supabaseClient.from('jobs').select('*', { count: 'exact', head: true });
        const { count: aCount } = await supabaseClient.from('applications').select('*', { count: 'exact', head: true });
        const { count: rCount } = await supabaseClient.from('tailored_resumes').select('*', { count: 'exact', head: true });
        const { count: sCount } = await supabaseClient.from('source_snapshots').select('*', { count: 'exact', head: true });

        if (!jErr) {
          connected = true;
          jobsSynced = jCount || 0;
          applicationsSynced = aCount || 0;
          resumesSynced = rCount || 0;
          snapshotsSynced = sCount || 0;
        }
      }
    } catch {
      connected = false;
    }
  }

  return {
    configured,
    authenticated,
    userEmail,
    connected,
    lastSync: lastSyncTimestamp,
    jobsSynced,
    applicationsSynced,
    resumesSynced,
    snapshotsSynced,
    errors: syncErrors.slice(-5),
  };
}
