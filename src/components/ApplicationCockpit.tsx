import React, { useState, useMemo } from 'react';
import {
  Briefcase,
  Search,
  Filter,
  ArrowUpDown,
  Building2,
  MapPin,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Award,
  ChevronRight,
  TrendingUp,
  FileText,
  Tag,
  ArrowRight
} from 'lucide-react';
import { JobWithAnalysis, UserProfile, ApplicationStatus, WorkplaceType } from '../types';
import {
  STATUS_LABELS,
  STATUS_COLORS,
  getApplicationDetails,
  getDaysInCurrentStage,
  getDaysSinceApplied,
  getStoredDetails,
  getStoredStatuses
} from '../services/applicationStatus';
import { getStoredTailoredResumes } from '../services/resume';
import { ApplicationDetailsModal } from './ApplicationDetailsModal';

interface ApplicationCockpitProps {
  jobs: JobWithAnalysis[];
  profile: UserProfile;
  onViewResume: (job: JobWithAnalysis) => void;
  onReturnToSearch?: () => void;
}

type SortOption =
  | 'recent'
  | 'oldest'
  | 'score_desc'
  | 'ats_desc'
  | 'inactivity_desc'
  | 'days_in_stage_desc';

const KANBAN_COLUMNS: { status: ApplicationStatus; title: string; colorClass: string }[] = [
  { status: 'PREPARED', title: 'Preparadas', colorClass: 'border-t-indigo-500 bg-indigo-50/20' },
  { status: 'APPLIED', title: 'Candidatadas', colorClass: 'border-t-blue-500 bg-blue-50/20' },
  { status: 'INTERVIEW', title: 'Entrevistas', colorClass: 'border-t-amber-500 bg-amber-50/20' },
  { status: 'REJECTED', title: 'Rejeitadas', colorClass: 'border-t-rose-500 bg-rose-50/20' },
  { status: 'OFFER', title: 'Ofertas', colorClass: 'border-t-emerald-500 bg-emerald-50/20' },
];

export const ApplicationCockpit: React.FC<ApplicationCockpitProps> = ({
  jobs,
  profile,
  onViewResume,
  onReturnToSearch,
}) => {
  const [selectedJob, setSelectedJob] = useState<JobWithAnalysis | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedSource, setSelectedSource] = useState<string>('ALL');
  const [minScore, setMinScore] = useState<number>(0);
  const [minAtsCoverage, setMinAtsCoverage] = useState<number>(0);
  const [selectedLang, setSelectedLang] = useState<string>('ALL');
  const [selectedWorkModel, setSelectedWorkModel] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  // Trigger re-render when details update
  const forceRefresh = () => setRefreshTrigger((prev) => prev + 1);

  // Load all jobs that have an application status !== 'NEW'
  const appliedJobs = useMemo(() => {
    const statusMap = getStoredStatuses();
    const storedResumes = getStoredTailoredResumes();

    return jobs.filter((job) => {
      const details = getApplicationDetails(job);
      const status = details.status;
      return status !== 'NEW';
    });
  }, [jobs, refreshTrigger]);

  // Unique sources
  const sources = useMemo(() => {
    const set = new Set<string>();
    appliedJobs.forEach((j) => {
      if (j.source) set.add(j.source);
    });
    return Array.from(set);
  }, [appliedJobs]);

  // Filtered & Sorted Jobs
  const filteredJobs = useMemo(() => {
    const storedResumes = getStoredTailoredResumes();

    return appliedJobs
      .filter((job) => {
        const details = getApplicationDetails(job);
        const status = details.status;

        if (selectedStatus !== 'ALL' && status !== selectedStatus) return false;
        if (selectedSource !== 'ALL' && job.source !== selectedSource) return false;
        if (minScore > 0 && (job.analysis?.score ?? 0) < minScore) return false;

        const tailoredResume = storedResumes[job.url];
        const atsScore = tailoredResume?.atsCoverageScore ?? job.analysis?.score ?? 0;
        if (minAtsCoverage > 0 && atsScore < minAtsCoverage) return false;

        if (selectedLang !== 'ALL') {
          const lang = tailoredResume?.resumeLanguage || 'pt-BR';
          if (lang.toLowerCase() !== selectedLang.toLowerCase()) return false;
        }

        if (selectedWorkModel !== 'ALL' && job.workplaceType !== selectedWorkModel) return false;

        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase().trim();
          const matchesTitle = job.title.toLowerCase().includes(q);
          const matchesCompany = job.company.toLowerCase().includes(q);
          const matchesLocation = job.location.toLowerCase().includes(q);
          if (!matchesTitle && !matchesCompany && !matchesLocation) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const detA = getApplicationDetails(a);
        const detB = getApplicationDetails(b);

        if (sortBy === 'score_desc') {
          return (b.analysis?.score ?? 0) - (a.analysis?.score ?? 0);
        }
        if (sortBy === 'ats_desc') {
          const storedResumes = getStoredTailoredResumes();
          const atsA = storedResumes[a.url]?.atsCoverageScore ?? a.analysis?.score ?? 0;
          const atsB = storedResumes[b.url]?.atsCoverageScore ?? b.analysis?.score ?? 0;
          return atsB - atsA;
        }
        if (sortBy === 'inactivity_desc') {
          const timeA = new Date(detA.last_activity_at || detA.created_at || 0).getTime();
          const timeB = new Date(detB.last_activity_at || detB.created_at || 0).getTime();
          return timeA - timeB; // Oldest activity first (most inactive)
        }
        if (sortBy === 'days_in_stage_desc') {
          return getDaysInCurrentStage(detB) - getDaysInCurrentStage(detA);
        }
        if (sortBy === 'oldest') {
          const timeA = new Date(detA.created_at || 0).getTime();
          const timeB = new Date(detB.created_at || 0).getTime();
          return timeA - timeB;
        }
        // Default: recent
        const timeA = new Date(detA.last_activity_at || detA.created_at || 0).getTime();
        const timeB = new Date(detB.last_activity_at || detB.created_at || 0).getTime();
        return timeB - timeA;
      });
  }, [appliedJobs, selectedStatus, selectedSource, minScore, minAtsCoverage, selectedLang, selectedWorkModel, searchTerm, sortBy, refreshTrigger]);

  // Metrics Calculation
  const metrics = useMemo(() => {
    let prepared = 0;
    let applied = 0;
    let interview = 0;
    let offer = 0;
    let rejected = 0;

    appliedJobs.forEach((job) => {
      const details = getApplicationDetails(job);
      switch (details.status) {
        case 'PREPARED':
          prepared++;
          break;
        case 'APPLIED':
          applied++;
          break;
        case 'INTERVIEW':
          interview++;
          break;
        case 'OFFER':
          offer++;
          break;
        case 'REJECTED':
          rejected++;
          break;
      }
    });

    const activeTotal = prepared + applied + interview;
    const appToInterviewRate = applied > 0 ? Math.round((interview / applied) * 100) : 0;
    const interviewToOfferRate = interview > 0 ? Math.round((offer / interview) * 100) : 0;

    return {
      prepared,
      applied,
      interview,
      offer,
      rejected,
      activeTotal,
      appToInterviewRate,
      interviewToOfferRate,
    };
  }, [appliedJobs, refreshTrigger]);

  const openJobDetails = (job: JobWithAnalysis) => {
    setSelectedJob(job);
    setIsDetailsOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Title Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
              FASE 3.1 — APPLICATION COCKPIT
            </span>
            <span className="text-slate-400 text-xs">•</span>
            <span className="text-slate-300 text-xs font-medium">Gestão Operacional de Vagas</span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">
            Painel de Candidaturas e Pipeline
          </h1>
          <p className="text-xs text-slate-400 max-w-xl">
            Acompanhe o ciclo de vida completo dos seus processos seletivos, cronogramas de entrevistas, histórico de eventos e próximos passos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onReturnToSearch && (
            <button
              onClick={onReturnToSearch}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Voltar para Vagas</span>
            </button>
          )}

          <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-700/80">
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400">Total Candidaturas Ativas</div>
              <div className="text-xl font-black text-emerald-400">{metrics.activeTotal}</div>
            </div>
            <TrendingUp className="w-8 h-8 text-emerald-400/80 p-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20" />
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">PREPARADAS</div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-indigo-600">{metrics.prepared}</span>
            <span className="text-[10px] text-slate-400 font-medium">Prontas p/ envio</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">CANDIDATADAS</div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-blue-600">{metrics.applied}</span>
            <span className="text-[10px] text-slate-400 font-medium">Enviadas</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">ENTREVISTAS</div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-amber-600">{metrics.interview}</span>
            <span className="text-[10px] text-amber-600/80 font-bold">Em andamento</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">OFERTAS</div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-emerald-600">{metrics.offer}</span>
            <span className="text-[10px] text-emerald-600/80 font-bold">Aprovado</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">REJEITADAS</div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-rose-600">{metrics.rejected}</span>
            <span className="text-[10px] text-slate-400 font-medium">Encerradas</span>
          </div>
        </div>

        {/* Funnel Metrics Summary */}
        <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">CONVERSÃO DO FUNIL</div>
          <div className="space-y-0.5 mt-1 text-[11px]">
            <div className="flex justify-between items-center text-slate-300">
              <span>App → Interview:</span>
              <strong className="text-emerald-400">{metrics.appToInterviewRate}%</strong>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Interview → Offer:</span>
              <strong className="text-indigo-400">{metrics.interviewToOfferRate}%</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cargo, empresa ou cidade..."
              className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs font-semibold text-slate-600">Ordenar por:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              <option value="recent">Mais recente</option>
              <option value="oldest">Mais antiga</option>
              <option value="score_desc">Maior Score</option>
              <option value="ats_desc">Maior ATS Coverage</option>
              <option value="inactivity_desc">Mais dias sem atividade</option>
              <option value="days_in_stage_desc">Mais dias no estágio</option>
            </select>
          </div>
        </div>

        {/* Detailed Filters Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1 font-semibold text-slate-500 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros:</span>
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2 py-1 border border-slate-200 rounded-md text-xs bg-slate-50 text-slate-700 outline-none"
          >
            <option value="ALL">Todos os Status</option>
            <option value="PREPARED">Preparada</option>
            <option value="APPLIED">Candidatado</option>
            <option value="INTERVIEW">Entrevista</option>
            <option value="REJECTED">Rejeitada</option>
            <option value="OFFER">Oferta</option>
          </select>

          {/* Source Filter */}
          {sources.length > 0 && (
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="px-2 py-1 border border-slate-200 rounded-md text-xs bg-slate-50 text-slate-700 outline-none"
            >
              <option value="ALL">Todas as Fontes</option>
              {sources.map((s) => (
                <option key={s} value={s}>{s.toUpperCase()}</option>
              ))}
            </select>
          )}

          {/* Work Model */}
          <select
            value={selectedWorkModel}
            onChange={(e) => setSelectedWorkModel(e.target.value)}
            className="px-2 py-1 border border-slate-200 rounded-md text-xs bg-slate-50 text-slate-700 outline-none"
          >
            <option value="ALL">Todos os Modelos</option>
            <option value="Remoto">Remoto</option>
            <option value="Híbrido">Híbrido</option>
            <option value="Presencial">Presencial</option>
          </select>

          {/* Language Filter */}
          <select
            value={selectedLang}
            onChange={(e) => setSelectedLang(e.target.value)}
            className="px-2 py-1 border border-slate-200 rounded-md text-xs bg-slate-50 text-slate-700 outline-none"
          >
            <option value="ALL">Todos os Idiomas</option>
            <option value="PT-BR">Português (PT-BR)</option>
            <option value="EN">Inglês (EN)</option>
          </select>

          {/* Clear Filters Button */}
          {(selectedStatus !== 'ALL' || selectedSource !== 'ALL' || selectedWorkModel !== 'ALL' || selectedLang !== 'ALL' || searchTerm.trim()) && (
            <button
              onClick={() => {
                setSelectedStatus('ALL');
                setSelectedSource('ALL');
                setSelectedWorkModel('ALL');
                setSelectedLang('ALL');
                setSearchTerm('');
              }}
              className="text-indigo-600 hover:text-indigo-800 font-medium text-[11px] ml-auto underline"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Kanban Pipeline Board */}
      <div className="overflow-x-auto pb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 min-w-[1000px]">
          {KANBAN_COLUMNS.map((col) => {
            const columnJobs = filteredJobs.filter((job) => {
              const details = getApplicationDetails(job);
              return details.status === col.status;
            });

            return (
              <div
                key={col.status}
                className={`bg-slate-100/70 p-3 rounded-xl border-t-4 ${col.colorClass} border-x border-b border-slate-200/80 flex flex-col max-h-[75vh]`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200/80 shrink-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-800 text-xs tracking-tight">{col.title}</h3>
                    <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px]">
                      {columnJobs.length}
                    </span>
                  </div>
                </div>

                {/* Column Cards Container */}
                <div className="space-y-3 overflow-y-auto pr-1 flex-1">
                  {columnJobs.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg">
                      Nenhuma vaga
                    </div>
                  ) : (
                    columnJobs.map((job) => {
                      const details = getApplicationDetails(job);
                      const daysInStage = getDaysInCurrentStage(details);
                      const daysSinceApplied = getDaysSinceApplied(details);

                      const storedResumes = getStoredTailoredResumes();
                      const tailoredResume = storedResumes[job.url] || null;
                      const resumeLang = tailoredResume?.resumeLanguage?.toUpperCase() || 'PT-BR';

                      return (
                        <div
                          key={job.id}
                          onClick={() => openJobDetails(job)}
                          className="bg-white p-3 rounded-xl border border-slate-200 hover:border-indigo-400 shadow-sm hover:shadow-md transition-all cursor-pointer space-y-2 group"
                        >
                          {/* Card Top: Title & Company */}
                          <div>
                            <div className="text-[10px] text-slate-500 font-semibold truncate">
                              {job.company}
                            </div>
                            <h4 className="font-bold text-slate-900 text-xs leading-snug group-hover:text-indigo-600 transition-colors line-clamp-2">
                              {job.title}
                            </h4>
                          </div>

                          {/* Metrics Badges */}
                          <div className="flex items-center gap-2 text-[10px] font-bold">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Score: {job.analysis?.score ?? 0}%
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              ATS: {tailoredResume?.atsCoverageScore ?? job.analysis?.score ?? 0}%
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                              {resumeLang}
                            </span>
                          </div>

                          {/* Next Step Badge if available */}
                          {details.next_step && (
                            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-1.5 rounded-lg text-[10px]">
                              <span className="font-bold block truncate">Próximo passo: {details.next_step}</span>
                              {details.next_step_date && (
                                <span className="text-amber-700 text-[9px] block">
                                  Data: {new Date(details.next_step_date).toLocaleDateString('pt-BR')}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Card Bottom Metadata */}
                          <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                            <span className="flex items-center gap-1 font-medium">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{daysInStage}d neste estágio</span>
                            </span>
                            {job.source && (
                              <span className="uppercase text-[9px] font-bold text-slate-400">
                                {job.source}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Application Details Modal */}
      {selectedJob && (
        <ApplicationDetailsModal
          job={selectedJob}
          profile={profile}
          isOpen={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false);
            setSelectedJob(null);
          }}
          onViewResume={(j) => {
            setIsDetailsOpen(false);
            onViewResume(j);
          }}
          onStatusChange={forceRefresh}
        />
      )}
    </div>
  );
};
