import { GeoCategory } from './services/geoClassifier';
import { ResumeLanguage } from './services/resumeLanguageDetector';

export type { GeoCategory, ResumeLanguage };

export interface Role {
  title: string;
  period: string;
  highlights: string[];
}

export interface Experience {
  company: string;
  roles: Role[];
}

export interface Education {
  degree: string;
  institution: string;
  status: string;
}

export interface Language {
  language: string;
  level: string;
}

export type ApplicationStatus =
  | 'NEW'
  | 'PREPARED'
  | 'APPLIED'
  | 'INTERVIEW'
  | 'REJECTED'
  | 'OFFER';

export interface UserProfile {
  name: string;
  phone?: string;
  email?: string;
  linkedin?: string;
  location?: string;
  targetTitles: string[];
  skills: string[];
  provenResults: string[];
  mainExperiences: Experience[];
  education: Education[];
  languages: Language[];
  tools: string[];
}

export type WorkplaceType = 'Remoto' | 'Híbrido' | 'Presencial';
export type SeniorityLevel = 'Estágio' | 'Júnior' | 'Pleno' | 'Sênior' | 'Especialista' | 'Liderança';

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  workplaceType: WorkplaceType;
  seniority: SeniorityLevel;
  description: string;
  requirements: string[];
  url: string;
  publishedAt: string;
  salaryRange?: string;
  source?: 'mock' | 'adzuna' | 'greenhouse' | string;
  sources?: string[];
  discovery_source?: string;
  roleFamily?: string;
  language?: string;
  geoCategory?: GeoCategory;
  status?: ApplicationStatus;
  resumeLanguageOverride?: 'auto' | 'pt-BR' | 'en';
  isUnresolved?: boolean;
  unresolvedReason?: string;
}

export interface ScoreBreakdown {
  titleScore: number;       // Max 20
  skillsScore: number;      // Max 25
  experienceScore: number;  // Max 20
  toolsScore: number;       // Max 10
  seniorityScore: number;   // Max 10
  languageScore: number;    // Max 5
  educationScore: number;   // Max 3
  locationScore: number;    // Max 3
  keywordsScore: number;    // Max 4
  total: number;            // Max 100
}

export interface RelatedSkillMatch {
  jobSkill: string;
  matchedProfileSkill: string;
}

export type MatchClassification = 
  | 'Excelente'
  | 'Muito alta'
  | 'Boa'
  | 'Média'
  | 'Baixa prioridade';

export interface JobAnalysis {
  score: number;
  classification: MatchClassification;
  breakdown: ScoreBreakdown;
  matchedSkills: string[];
  relatedSkills: RelatedSkillMatch[];
  missingSkills: string[];
  atsKeywords: string[];
  matchReasons: string[];
  strengths: string[];
  gaps: string[];
  relevantExperienceSummary: string[];
  scoreCapApplied?: string | null;
}

export type ApplyPriorityClassification =
  | 'APPLY NOW'
  | 'HIGH PRIORITY'
  | 'REVIEW'
  | 'LOW PRIORITY'
  | 'SKIP / VERY LOW'
  | 'ALREADY APPLIED'
  | 'IN INTERVIEW'
  | 'OFFER'
  | 'REJECTED'
  | 'NOT ELIGIBLE'
  | 'CLOSED';

export interface ApplyPriorityBreakdown {
  matchComponent: number;       // Max 30
  atsComponent: number;         // Max 15
  recencyComponent: number;     // Max 15
  geographyComponent: number;   // Max 10
  roleFitComponent: number;     // Max 10
  criticalGapsComponent: number;// Max 10
  sourceComponent: number;      // Max 5
  urgencyComponent: number;     // Max 5
  total: number;                // Max 100
}

export interface ApplyPriorityResult {
  score: number;
  classification: ApplyPriorityClassification;
  breakdown: ApplyPriorityBreakdown;
  reasons: string[];
  warnings: string[];
  blockers: string[];
}

export interface ApplyPriorityContext {
  atsCoverage?: number;
  sourceYield?: number | null;
}

export type FollowUpState =
  | 'WAIT'
  | 'FOLLOW_UP_SOON'
  | 'FOLLOW_UP_RECOMMENDED'
  | 'FOLLOW_UP_OVERDUE'
  | 'INTERVIEW_SOON'
  | 'NEXT_STEP_TODAY'
  | 'NEXT_STEP_OVERDUE'
  | 'PROCESS_ACTIVE'
  | 'READY_TO_APPLY'
  | 'NO_ACTION_NEEDED'
  | 'CLOSED';

export type FollowUpOverride = 'AUTO' | 'DO_NOT_FOLLOW_UP' | 'FOLLOW_UP_LATER';

export interface FollowUpResult {
  state: FollowUpState;
  urgencyScore: number;
  recommendedAction: string;
  reason: string;
  nextRecommendedDate?: string;
  daysSinceApplied?: number;
  daysSinceLastActivity?: number;
  daysUntilNextStep?: number;
  warnings: string[];
  isSnoozed?: boolean;
  snoozedUntil?: string | null;
  override?: FollowUpOverride;
}

export interface JobWithAnalysis extends Job {
  analysis: JobAnalysis;
}

export type ApplicationChannel =
  | 'LinkedIn'
  | 'Indeed'
  | 'Gupy'
  | 'Greenhouse'
  | 'Company Website'
  | 'Referral'
  | 'Email'
  | 'Other';

export type ApplicationEventType =
  | 'STATUS_CHANGE'
  | 'RECRUITER_CONTACT'
  | 'INTERVIEW_SCHEDULED'
  | 'INTERVIEW_COMPLETED'
  | 'TECHNICAL_TEST'
  | 'CASE_SUBMITTED'
  | 'FOLLOW_UP_SENT'
  | 'OTHER';

export interface ApplicationEvent {
  id: string;
  user_id?: string;
  application_id: string;
  job_id: string;
  from_status?: ApplicationStatus | null;
  to_status?: ApplicationStatus | null;
  event_type: ApplicationEventType;
  notes?: string | null;
  metadata?: Record<string, any>;
  event_key?: string | null;
  created_at: string;
}

export interface ApplicationDetails {
  id?: string;
  jobId: string;
  jobKey: string;
  status: ApplicationStatus;
  prepared_at?: string | null;
  applied_at?: string | null;
  interview_at?: string | null;
  rejected_at?: string | null;
  offer_at?: string | null;
  last_activity_at?: string | null;
  notes?: string | null;
  company_contact_name?: string | null;
  company_contact_email?: string | null;
  recruiter_name?: string | null;
  recruiter_linkedin?: string | null;
  salary_expectation?: string | null;
  salary_offered?: string | null;
  work_model?: WorkplaceType | string | null;
  application_channel?: ApplicationChannel | string | null;
  application_url?: string | null;
  next_step?: string | null;
  next_step_date?: string | null;
  apply_priority_at_application?: number | null;
  match_score_at_application?: number | null;
  ats_coverage_at_application?: number | null;
  follow_up_snoozed_until?: string | null;
  follow_up_override?: FollowUpOverride;
  created_at?: string;
  updated_at?: string;
}

