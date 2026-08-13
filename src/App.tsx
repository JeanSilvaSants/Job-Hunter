import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Filter,
  Sparkles,
  RefreshCw,
  LayoutDashboard,
  UserCheck,
  PlusCircle,
  BarChart3,
  Globe,
  Database,
  Terminal,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Tag,
  Calendar,
  Building2,
  MapPin,
  Download,
  FileCheck2,
  FileText,
  Clock,
  Send,
  MessageSquare,
  Briefcase,
  Layers,
  Star,
  X,
  Bookmark,
} from 'lucide-react';
import { userProfile } from './data/profile';
import { mockJobs } from './data/mockJobs';
import { calculateApplyPriority } from './services/applyPriority';
import { calculateJobScore } from './services/scoring';
import { Job, JobWithAnalysis, WorkplaceType, ApplicationStatus } from './types';
import { searchRealJobs, SearchJobsResult, AdzunaDiagnostics } from './services/jobSources';
import { getJobStatus, STATUS_LABELS } from './services/applicationStatus';
import { exportJobsToExcel } from './services/exportExcel';
import {
  SUPPORTED_ADZUNA_COUNTRIES,
  FavoriteLocation,
  getStoredFavoriteLocations,
  addFavoriteLocation,
  removeFavoriteLocation,
  getStoredSelectedCountry,
  saveSelectedCountry,
} from './services/jobLocations';
import { Header } from './components/Header';
import { StatsDashboard } from './components/StatsDashboard';
import { JobCard } from './components/JobCard';
import { JobAnalysisModal } from './components/JobAnalysisModal';
import { JobDescriptionModal } from './components/JobDescriptionModal';
import { TailoredResumeModal } from './components/TailoredResumeModal';
import { ApplicationPackageModal } from './components/ApplicationPackageModal';
import { JobBoardsModal } from './components/JobBoardsModal';
import { ProfileModal } from './components/ProfileModal';
import { AddJobModal } from './components/AddJobModal';
import { CloudSyncModal } from './components/CloudSyncModal';
import { ApplicationCockpit } from './components/ApplicationCockpit';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { AuthGuard } from './components/AuthGuard';
import { getStoredStatuses, saveStatusMap } from './services/applicationStatus';
import { getStoredTailoredResumes, saveTailoredResumesMap } from './services/resume';

export default function App() {
  // Mode toggle: Mock Jobs vs Real Adzuna Search
  const [useMockData, setUseMockData] = useState<boolean>(true);

  // Search parameters for Job Hunter AI
  const [searchQuery, setSearchQuery] = useState<string>('Customer Success');
  const [searchCountry, setSearchCountry] = useState<string>(() => getStoredSelectedCountry());
  const [searchLocation, setSearchLocation] = useState<string>(''); // Default empty to avoid sending 'where=Brazil' to /br/ endpoint
  const [favoriteLocations, setFavoriteLocations] = useState<FavoriteLocation[]>(() => getStoredFavoriteLocations());
  const [searchDaysOld, setSearchDaysOld] = useState<number>(30);
  const [searchMinScore, setSearchMinScore] = useState<number>(0);
  const [searchAllTargets, setSearchAllTargets] = useState<boolean>(false);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'adzuna' | 'greenhouse'>('all');
  const [includeUncertainIntl, setIncludeUncertainIntl] = useState<boolean>(false);

  // Handlers for Favorite Geographic Locations
  const handleCountryChange = (newCountry: string) => {
    setSearchCountry(newCountry);
    saveSelectedCountry(newCountry);
  };

  const handleToggleFavoriteLocation = (locName: string) => {
    const clean = locName.trim();
    if (!clean) return;
    const exists = favoriteLocations.some(
      (f) => f.name.toLowerCase() === clean.toLowerCase() && f.countryCode === searchCountry
    );
    if (exists) {
      const match = favoriteLocations.find(
        (f) => f.name.toLowerCase() === clean.toLowerCase() && f.countryCode === searchCountry
      );
      if (match) {
        const updated = removeFavoriteLocation(match.id);
        setFavoriteLocations(updated);
      }
    } else {
      const updated = addFavoriteLocation(clean, searchCountry);
      setFavoriteLocations(updated);
    }
  };

  const handleRemoveFavoriteLocationById = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = removeFavoriteLocation(id);
    setFavoriteLocations(updated);
  };

  const isCurrentLocationFavorite = useMemo(() => {
    if (!searchLocation.trim()) return false;
    return favoriteLocations.some(
      (f) => f.name.toLowerCase() === searchLocation.trim().toLowerCase() && f.countryCode === searchCountry
    );
  }, [searchLocation, searchCountry, favoriteLocations]);

  // Search execution state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [realJobs, setRealJobs] = useState<JobWithAnalysis[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchErrorCode, setSearchErrorCode] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<AdzunaDiagnostics | null>(null);
  const [showDebug, setShowDebug] = useState<boolean>(false);

  // Custom simulated jobs added via modal
  const [customJobs, setCustomJobs] = useState<Job[]>([]);

  // Local filter controls (post-search filtering without API re-fetch)
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [activeStatFilter, setActiveStatFilter] = useState<string>('all');
  const [workplaceFilter, setWorkplaceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'score' | 'applyPriority' | 'title' | 'company'>('score');
  const [statusVersion, setStatusVersion] = useState<number>(0);

  // Modals state
  const [selectedAnalysisJob, setSelectedAnalysisJob] = useState<JobWithAnalysis | null>(null);
  const [selectedDescriptionJob, setSelectedDescriptionJob] = useState<JobWithAnalysis | null>(null);
  const [selectedTailoredResumeJob, setSelectedTailoredResumeJob] = useState<JobWithAnalysis | null>(null);
  const [selectedApplicationPackageJob, setSelectedApplicationPackageJob] = useState<JobWithAnalysis | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAddJobOpen, setIsAddJobOpen] = useState(false);
  const [isJobBoardsOpen, setIsJobBoardsOpen] = useState(false);
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'cockpit' | 'analytics'>('search');

  // Compute mock jobs with scoring engine
  const mockJobsWithAnalysis: JobWithAnalysis[] = useMemo(() => {
    const rawMock = [...customJobs, ...mockJobs];
    return rawMock.map((job) => ({
      ...job,
      analysis: calculateJobScore(job, userProfile),
    }));
  }, [customJobs]);

  // Execute Search Across Active Sources (Adzuna + Greenhouse)
  const handleExecuteRealSearch = async () => {
    setIsLoading(true);
    setSearchError(null);
    setSearchErrorCode(null);

    const result: SearchJobsResult = await searchRealJobs(
      {
        query: searchQuery,
        location: searchLocation,
        country: searchCountry,
        daysOld: searchDaysOld,
        searchAllTargets: searchAllTargets,
        sourceFilter: sourceFilter,
        includeUncertainIntl: includeUncertainIntl,
      },
      userProfile
    );

    setIsLoading(false);
    setDiagnostics(result.diagnostics);

    if (!result.ok) {
      setSearchError(result.error || 'Erro ao comunicar com as fontes de vagas.');
      setSearchErrorCode(result.errorCode || 'SEARCH_ERROR');
      setRealJobs([]);
    } else {
      setRealJobs(result.jobs);
      setUseMockData(false); // Switch to real data view automatically on search
    }
  };

  // Base list of jobs depending on toggle
  const baseJobs = useMemo(() => {
    return useMockData ? mockJobsWithAnalysis : realJobs;
  }, [useMockData, mockJobsWithAnalysis, realJobs]);

  // Apply local filtering & sorting
  const filteredAndSortedJobs = useMemo(() => {
    return baseJobs
      .filter((job) => {
        // Local keyword search
        const query = localSearchTerm.toLowerCase().trim();
        const matchesQuery =
          !query ||
          job.title.toLowerCase().includes(query) ||
          job.company.toLowerCase().includes(query) ||
          job.location.toLowerCase().includes(query) ||
          job.requirements.some((r) => r.toLowerCase().includes(query)) ||
          job.analysis.matchedSkills.some((s) => s.toLowerCase().includes(query));

        if (!matchesQuery) return false;

        // Min Score filter from search bar or dropdown
        if (searchMinScore > 0 && job.analysis.score < searchMinScore) return false;

        // Stat cards filter
        if (activeStatFilter === 'excellent' && job.analysis.score < 90) return false;
        if (activeStatFilter === 'high' && (job.analysis.score < 85 || job.analysis.score > 89)) return false;
        if (activeStatFilter === 'low' && job.analysis.score >= 75) return false;

        // Workplace model filter
        if (workplaceFilter !== 'all' && job.workplaceType !== workplaceFilter) return false;

        // Status filter
        if (statusFilter !== 'ALL') {
          const currentStatus = getJobStatus(job);
          if (currentStatus !== statusFilter) return false;
        }

        // Apply Priority classification filter
        if (priorityFilter !== 'ALL') {
          const priorityRes = calculateApplyPriority(job);
          if (priorityFilter === 'APPLY_NOW' && priorityRes.classification !== 'APPLY NOW') return false;
          if (priorityFilter === 'HIGH_PRIORITY' && priorityRes.classification !== 'HIGH PRIORITY') return false;
          if (priorityFilter === 'REVIEW' && priorityRes.classification !== 'REVIEW') return false;
          if (priorityFilter === 'NOT_ELIGIBLE' && priorityRes.classification !== 'NOT ELIGIBLE') return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'applyPriority') {
          return calculateApplyPriority(b).score - calculateApplyPriority(a).score;
        }
        if (sortBy === 'score') {
          return b.analysis.score - a.analysis.score;
        }
        if (sortBy === 'title') {
          return a.title.localeCompare(b.title);
        }
        if (sortBy === 'company') {
          return a.company.localeCompare(b.company);
        }
        return 0;
      });
  }, [baseJobs, localSearchTerm, searchMinScore, activeStatFilter, workplaceFilter, statusFilter, priorityFilter, sortBy, statusVersion]);

  // Dashboard Status Indicators (re-evaluated on status update)
  const statusCounts = useMemo(() => {
    let prepared = 0;
    let applied = 0;
    let interview = 0;

    baseJobs.forEach((job) => {
      const st = getJobStatus(job);
      if (st === 'PREPARED') prepared++;
      if (st === 'APPLIED') applied++;
      if (st === 'INTERVIEW') interview++;
    });

    return {
      loaded: baseJobs.length,
      prepared,
      applied,
      interview,
    };
  }, [baseJobs, statusVersion]);

  const handleStatusChange = () => {
    setStatusVersion((v) => v + 1);
  };

  const handleAddJob = (newJob: Job) => {
    setCustomJobs((prev) => [newJob, ...prev]);
    setUseMockData(true);
  };

  const handleResetFilters = () => {
    setLocalSearchTerm('');
    setActiveStatFilter('all');
    setWorkplaceFilter('all');
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
    setSortBy('applyPriority');
    setSearchMinScore(0);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-100 text-slate-800 font-sans antialiased flex flex-col md:flex-row">
      {/* High Density Left Sidebar Navigation */}
      <aside className="w-16 bg-slate-900 border-r border-slate-800 text-slate-400 hidden md:flex flex-col items-center py-4 justify-between shrink-0 sticky top-0 h-screen z-40">
        <div className="flex flex-col items-center gap-6">
          <div className="h-9 w-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
            JH
          </div>
          <nav className="flex flex-col items-center gap-4">
            <button
              id="btn-sidebar-search"
              onClick={() => {
                setActiveTab('search');
                handleResetFilters();
              }}
              className={`p-2.5 rounded-md transition cursor-pointer ${
                activeTab === 'search'
                  ? 'text-white bg-blue-600 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Vagas / Job Discovery"
            >
              <LayoutDashboard className="w-4 h-4" />
            </button>

            <button
              id="btn-sidebar-cockpit"
              onClick={() => setActiveTab('cockpit')}
              className={`p-2.5 rounded-md transition cursor-pointer relative ${
                activeTab === 'cockpit'
                  ? 'text-white bg-indigo-600 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Candidaturas / Application Cockpit"
            >
              <Briefcase className="w-4 h-4" />
              {statusCounts.prepared + statusCounts.applied + statusCounts.interview > 0 && (
                <span className="absolute -top-1 -right-1 px-1 py-0.2 rounded-full text-[9px] bg-indigo-500 text-white font-black">
                  {statusCounts.prepared + statusCounts.applied + statusCounts.interview}
                </span>
              )}
            </button>

            <button
              id="btn-sidebar-analytics"
              onClick={() => setActiveTab('analytics')}
              className={`p-2.5 rounded-md transition cursor-pointer ${
                activeTab === 'analytics'
                  ? 'text-white bg-emerald-600 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Analytics & Métricas de Conversão"
            >
              <BarChart3 className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsProfileOpen(true)}
              className="p-2.5 hover:text-white hover:bg-slate-800 rounded-md transition cursor-pointer"
              title="Perfil Mestre"
            >
              <UserCheck className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsAddJobOpen(true)}
              className="p-2.5 hover:text-white hover:bg-slate-800 rounded-md transition cursor-pointer"
              title="Simular Vaga"
            >
              <PlusCircle className="w-4 h-4" />
            </button>
          </nav>
        </div>
        <div className="text-[10px] font-mono text-slate-500 font-bold">v1.1</div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation Header */}
        <Header
          profile={userProfile}
          onOpenProfile={() => setIsProfileOpen(true)}
          onOpenAddJob={() => setIsAddJobOpen(true)}
          onOpenJobBoards={() => setIsJobBoardsOpen(true)}
          onOpenCloudSync={() => setIsCloudSyncOpen(true)}
        />

        {/* Tab Navigation Bar */}
        <div className="bg-slate-900 border-b border-slate-800 text-white sticky top-[53px] z-20 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between text-xs font-bold">
            <div className="flex items-center gap-1 py-1.5">
              <button
                id="btn-tab-search"
                onClick={() => setActiveTab('search')}
                className={`px-4 py-2 rounded-lg transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'search'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>BUSCA DE VAGAS</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
                  {filteredAndSortedJobs.length}
                </span>
              </button>

              <button
                id="btn-tab-cockpit"
                onClick={() => setActiveTab('cockpit')}
                className={`px-4 py-2 rounded-lg transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'cockpit'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>APPLICATION COCKPIT</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-900/60 text-indigo-300 font-extrabold border border-indigo-700/50">
                  {statusCounts.prepared + statusCounts.applied + statusCounts.interview}
                </span>
              </button>

              <button
                id="btn-tab-analytics"
                onClick={() => setActiveTab('analytics')}
                className={`px-4 py-2 rounded-lg transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'analytics'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>ANALYTICS & CONVERSÃO</span>
              </button>
            </div>
          </div>
        </div>

        <main className="max-w-7xl w-full mx-auto px-3 sm:px-5 py-3 space-y-3">
          {activeTab === 'cockpit' ? (
            <ApplicationCockpit
              jobs={baseJobs}
              profile={userProfile}
              onViewResume={(j) => setSelectedTailoredResumeJob(j)}
              onReturnToSearch={() => setActiveTab('search')}
            />
          ) : activeTab === 'analytics' ? (
            <AnalyticsDashboard
              jobs={baseJobs}
              onOpenJobDetails={(j) => setSelectedAnalysisJob(j)}
            />
          ) : (
            <>
          {/* Real Job Search Panel (Adzuna + Greenhouse Integration) */}
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-md shrink-0">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    Busca de Vagas Reais em Tempo Real (Adzuna + Greenhouse)
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Consulte vagas públicas agregadas no Brasil e Job Boards oficiais com filtro de elegibilidade geográfica.
                  </p>
                </div>
              </div>

              {/* Toggle Mock vs Real Jobs */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-md border border-slate-200 shrink-0 self-start sm:self-auto">
                <span className="text-[10px] font-bold text-slate-500 uppercase px-1">Fonte:</span>
                <button
                  onClick={() => setUseMockData(true)}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                    useMockData
                      ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Dados de Teste (Mock)
                </button>
                <button
                  onClick={() => {
                    setUseMockData(false);
                    if (realJobs.length === 0 && !isLoading) {
                      handleExecuteRealSearch();
                    }
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    !useMockData
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Globe className="w-3 h-3" />
                  <span>Vagas Reais ({realJobs.length})</span>
                </button>
              </div>
            </div>

            {/* High Density Search Form Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 text-xs">
              {/* Cargo / Palavra-chave */}
              <div className="space-y-1 sm:col-span-2 lg:col-span-2">
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  Cargo / Palavra-chave
                </label>
                <input
                  type="text"
                  placeholder="Ex: Customer Success"
                  disabled={searchAllTargets}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-md px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition font-medium disabled:opacity-50 disabled:bg-slate-100"
                />
              </div>

              {/* País (Adzuna Country) */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  País (Adzuna)
                </label>
                <select
                  value={searchCountry}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-md px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none transition font-semibold cursor-pointer"
                >
                  {SUPPORTED_ADZUNA_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Localização com Favoritar / Limpar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    Cidade / Região
                  </label>
                  {searchLocation.trim() && (
                    <button
                      type="button"
                      onClick={() => handleToggleFavoriteLocation(searchLocation)}
                      className={`text-[10px] flex items-center gap-0.5 font-bold cursor-pointer transition ${
                        isCurrentLocationFavorite
                          ? 'text-amber-600 hover:text-amber-700'
                          : 'text-slate-400 hover:text-amber-500'
                      }`}
                      title={isCurrentLocationFavorite ? 'Remover dos favoritos' : 'Salvar como cidade favorita'}
                    >
                      <Star className={`w-3 h-3 ${isCurrentLocationFavorite ? 'fill-amber-400 text-amber-500' : ''}`} />
                      <span>{isCurrentLocationFavorite ? 'Favorito' : 'Favoritar'}</span>
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ex: São Paulo, Curitiba..."
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-md pl-2.5 pr-7 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition font-medium"
                  />
                  {searchLocation && (
                    <button
                      type="button"
                      onClick={() => setSearchLocation('')}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full cursor-pointer"
                      title="Limpar localização"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Fonte de Vagas */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  Fonte de Vagas
                </label>
                <select
                  id="filter-source-select"
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value as 'all' | 'adzuna' | 'greenhouse')}
                  className="w-full bg-indigo-50/50 border border-indigo-200 focus:border-indigo-500 focus:bg-white rounded-md px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none transition font-bold cursor-pointer"
                >
                  <option value="all">Todas (Adzuna + Greenhouse)</option>
                  <option value="adzuna">Somente Adzuna</option>
                  <option value="greenhouse">Somente Greenhouse</option>
                </select>
              </div>

              {/* Submit Button */}
              <div className="space-y-1 flex flex-col justify-end">
                <button
                  id="btn-search-adzuna-jobs"
                  onClick={handleExecuteRealSearch}
                  disabled={isLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-extrabold py-1.5 px-3 rounded-md text-xs transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Buscando...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      <span>BUSCAR VAGAS REAL</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Geographic Shortcuts & Favorite Locations Bar */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-slate-600 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
                <MapPin className="w-3 h-3 text-indigo-500" />
                <span>Locais:</span>
              </span>

              {/* Selected Country Flag and Quick Clear */}
              <button
                type="button"
                onClick={() => setSearchLocation('')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer border ${
                  !searchLocation.trim()
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                🌐 Todo o País ({SUPPORTED_ADZUNA_COUNTRIES.find((c) => c.code === searchCountry)?.name || searchCountry.toUpperCase()})
              </button>

              {/* Preset Cities for Current Country */}
              {(SUPPORTED_ADZUNA_COUNTRIES.find((c) => c.code === searchCountry)?.presetCities || []).map((city) => {
                const isSelected = searchLocation.trim().toLowerCase() === city.toLowerCase();
                return (
                  <button
                    key={city}
                    type="button"
                    onClick={() => setSearchLocation(city)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition cursor-pointer border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {city}
                  </button>
                );
              })}

              {/* Custom Favorite Locations */}
              {favoriteLocations.map((fav) => {
                const isSelected = searchLocation.trim().toLowerCase() === fav.name.toLowerCase();
                return (
                  <div
                    key={fav.id}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition border ${
                      isSelected
                        ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                        : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSearchLocation(fav.name);
                        if (fav.countryCode && fav.countryCode !== searchCountry) {
                          handleCountryChange(fav.countryCode);
                        }
                      }}
                      className="cursor-pointer flex items-center gap-0.5"
                    >
                      <Star className={`w-2.5 h-2.5 ${isSelected ? 'fill-white text-white' : 'fill-amber-400 text-amber-600'}`} />
                      <span>{fav.name}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveFavoriteLocationById(e, fav.id)}
                      className={`hover:opacity-100 p-0.5 rounded-full cursor-pointer ${
                        isSelected ? 'text-white/80 hover:text-white' : 'text-amber-600 hover:text-amber-800'
                      }`}
                      title="Remover dos favoritos"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Options Checkboxes & Debug Toggle */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs font-semibold text-slate-700">
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={searchAllTargets}
                    onChange={(e) => setSearchAllTargets(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                  />
                  <span>Buscar todos os meus cargos-alvo ({userProfile.targetTitles.length} cargos)</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-600 hover:text-slate-900">
                  <input
                    type="checkbox"
                    checked={includeUncertainIntl}
                    onChange={(e) => setIncludeUncertainIntl(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                  />
                  <span>Incluir vagas internacionais com elegibilidade incerta (INTERNATIONAL_UNKNOWN)</span>
                </label>
              </div>

              {diagnostics && (
                <button
                  onClick={() => setShowDebug(!showDebug)}
                  className="text-[11px] text-slate-500 hover:text-slate-800 font-mono font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Terminal className="w-3 h-3 text-slate-400" />
                  <span>Debug Metrics</span>
                  {showDebug ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
            </div>

            {/* Active Geographic Filter Status Banner */}
            {searchLocation.trim() && (
              <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-md px-3 py-1.5 text-xs text-indigo-900 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="font-bold">Filtro geográfico ativo:</span>
                  <span className="bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-mono font-bold text-[11px]">
                    {searchLocation.trim()}
                  </span>
                  <span className="text-indigo-600 text-[11px]">
                    (+ Vagas Remoto Brasil & LATAM compatíveis inclusas)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSearchLocation('')}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                >
                  Remover filtro
                </button>
              </div>
            )}

            {/* Error States Display */}
            {searchError && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-900 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1">
                  <div className="font-bold text-amber-950 flex items-center justify-between">
                    <span>
                      {searchErrorCode === 'MISSING_CREDENTIALS'
                        ? 'Credenciais da Adzuna Não Configuradas'
                        : searchErrorCode === 'AUTH_ERROR'
                        ? 'Erro de Autenticação na Adzuna (401/403)'
                        : 'Atenção ao consultar fontes de vagas'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {diagnostics?.errorStage && (
                        <span className="font-mono text-[9px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-bold uppercase">
                          FALHA: {diagnostics.errorStage}
                        </span>
                      )}
                      <span className="font-mono text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-bold">
                        {searchErrorCode}
                      </span>
                    </div>
                  </div>
                  <div className="text-amber-800 leading-relaxed font-medium">
                    {searchError}
                  </div>
                </div>
              </div>
            )}

            {/* Debug Mode Panel */}
            {showDebug && diagnostics && (
              <div className="bg-slate-900 text-slate-200 p-3.5 rounded-md font-mono text-[11px] space-y-3 border border-slate-800">
                <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px] flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="flex items-center gap-1 text-indigo-400">
                    <Terminal className="w-3.5 h-3.5" />
                    Relatório de Diagnóstico Multi-Fonte (Adzuna + Greenhouse)
                  </span>
                  <span className="text-slate-500 font-normal">
                    Latência Total: {diagnostics.latencyMs} ms
                  </span>
                </div>

                {/* Section 1: ADZUNA */}
                {diagnostics.adzuna && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-blue-400 font-bold text-[10px] block uppercase">ADZUNA API</span>
                      {diagnostics.adzuna.errorStage && (
                        <span className="text-[9px] bg-rose-950 text-rose-300 border border-rose-800 px-1.5 py-0.5 rounded font-bold">
                          ESTÁGIO: {diagnostics.adzuna.errorStage}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-300">
                      <div>
                        <span className="text-slate-500 block text-[10px]">RECEBIDAS:</span>
                        <strong className="text-white">{diagnostics.adzuna.received}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">NORMALIZADAS:</span>
                        <strong className="text-white">{diagnostics.adzuna.normalized}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">HTTP STATUS:</span>
                        <strong className="text-white">
                          Backend: {diagnostics.httpStatus || 200}
                          {diagnostics.adzunaHttpStatus ? ` / Adzuna: ${diagnostics.adzunaHttpStatus}` : ''}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">PAÍS / MERCADO:</span>
                        <strong className="text-white uppercase">{diagnostics.countryCode || 'BR'}</strong>
                      </div>
                      <div className="col-span-2 sm:col-span-4">
                        <span className="text-slate-500 block text-[10px]">QUERY / LOCALIZAÇÃO ENVIADAS:</span>
                        <span className="text-slate-300">
                          what: <strong className="text-white font-mono">{diagnostics.query}</strong> | where: <strong className="text-white font-mono">{diagnostics.location}</strong>
                        </span>
                      </div>
                      <div className="col-span-2 sm:col-span-4">
                        <span className="text-slate-500 block text-[10px]">STATUS DE ERRO:</span>
                        <strong className={diagnostics.adzuna.error ? 'text-rose-400' : 'text-emerald-400'}>
                          {diagnostics.adzuna.error || 'Nenhum erro (Adzuna operacional)'}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Section 2: GREENHOUSE */}
                {diagnostics.greenhouse && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-800">
                    <span className="text-indigo-400 font-bold text-[10px] block uppercase">GREENHOUSE JOB BOARDS</span>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-slate-300">
                      <div>
                        <span className="text-slate-500 block text-[10px]">BOARDS CHECADOS:</span>
                        <strong className="text-white">{diagnostics.greenhouse.boardsChecked}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">SUCESSO / FALHA:</span>
                        <strong className="text-emerald-400">{diagnostics.greenhouse.boardsSuccessful}</strong>
                        <span className="text-slate-500"> / </span>
                        <strong className="text-rose-400">{diagnostics.greenhouse.boardsFailed}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">VAGAS RECEBIDAS:</span>
                        <strong className="text-white">{diagnostics.greenhouse.jobsReceived}</strong>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-500 block text-[10px]">ELEGÍVEIS BRASIL / LATAM:</span>
                        <strong className="text-emerald-400">{diagnostics.greenhouse.brazilCompatible}</strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Section 3: LOCATION FILTER */}
                {diagnostics.locationFilter && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-amber-400 font-bold text-[10px] block uppercase">LOCATION FILTER</span>
                      <span className="text-[10px] text-amber-300 font-bold">
                        SEARCH LOCATION: {diagnostics.locationFilter.searchLocation}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-slate-300 text-[10px]">
                      <div>
                        <span className="text-slate-500 block">BEFORE FILTER:</span>
                        <span>Adzuna: <strong className="text-white">{diagnostics.locationFilter.sourceBefore.adzuna}</strong></span>
                        <br />
                        <span>GH: <strong className="text-white">{diagnostics.locationFilter.sourceBefore.greenhouse}</strong></span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">MATCHED LOCAL:</span>
                        <span>Adzuna: <strong className="text-emerald-400">{diagnostics.locationFilter.matchedLocal.adzuna}</strong></span>
                        <br />
                        <span>GH: <strong className="text-emerald-400">{diagnostics.locationFilter.matchedLocal.greenhouse}</strong></span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">REMOTE BRAZIL:</span>
                        <span>Adzuna: <strong className="text-emerald-400">{diagnostics.locationFilter.remoteBrazil.adzuna}</strong></span>
                        <br />
                        <span>GH: <strong className="text-emerald-400">{diagnostics.locationFilter.remoteBrazil.greenhouse}</strong></span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">LATAM REMOTE:</span>
                        <span>Adzuna: <strong className="text-emerald-400">{diagnostics.locationFilter.latamRemote.adzuna}</strong></span>
                        <br />
                        <span>GH: <strong className="text-emerald-400">{diagnostics.locationFilter.latamRemote.greenhouse}</strong></span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">REJECTED BY LOC:</span>
                        <span>Adzuna: <strong className="text-rose-400">{diagnostics.locationFilter.rejectedByLocation.adzuna}</strong></span>
                        <br />
                        <span>GH: <strong className="text-rose-400">{diagnostics.locationFilter.rejectedByLocation.greenhouse}</strong></span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">TOTAL AFTER FILTER:</span>
                        <strong className="text-amber-400 text-xs">{diagnostics.locationFilter.totalAfter}</strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Section 4: GLOBAL */}
                {diagnostics.global && (
                  <div className="space-y-1 pt-2 border-t border-slate-800">
                    <span className="text-emerald-400 font-bold text-[10px] block uppercase">PIPELINE GLOBAL</span>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-slate-300">
                      <div>
                        <span className="text-slate-500 block text-[10px]">ANTES DEDUPLICAÇÃO:</span>
                        <strong className="text-white">{diagnostics.global.beforeDeduplication}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">DUPLICATAS REMOVIDAS:</span>
                        <strong className="text-amber-400">{diagnostics.global.duplicatesRemoved}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">TOTAL FINAL EXIBIDO:</span>
                        <strong className="text-emerald-400">{diagnostics.global.finalCount}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Dashboard Application Status Indicators & Global Export */}
          <div className="bg-slate-900 text-white rounded-lg p-3.5 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border border-slate-800">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 flex-1">
              {/* Loaded */}
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-md p-2.5 flex items-center gap-2.5">
                <div className="p-2 bg-slate-700 text-slate-300 rounded shrink-0">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Vagas Carregadas</span>
                  <span className="text-base font-black text-white leading-none">{statusCounts.loaded}</span>
                </div>
              </div>

              {/* Prepared */}
              <div className="bg-indigo-950/60 border border-indigo-800/80 rounded-md p-2.5 flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600/30 text-indigo-300 rounded shrink-0">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider block">Preparadas</span>
                  <span className="text-base font-black text-white leading-none">{statusCounts.prepared}</span>
                </div>
              </div>

              {/* Applied */}
              <div className="bg-blue-950/60 border border-blue-800/80 rounded-md p-2.5 flex items-center gap-2.5">
                <div className="p-2 bg-blue-600/30 text-blue-300 rounded shrink-0">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-blue-300 tracking-wider block">Candidatadas</span>
                  <span className="text-base font-black text-white leading-none">{statusCounts.applied}</span>
                </div>
              </div>

              {/* Interview */}
              <div className="bg-emerald-950/60 border border-emerald-800/80 rounded-md p-2.5 flex items-center gap-2.5">
                <div className="p-2 bg-emerald-600/30 text-emerald-300 rounded shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider block">Entrevistas</span>
                  <span className="text-base font-black text-white leading-none">{statusCounts.interview}</span>
                </div>
              </div>
            </div>

            {/* Global Export Button */}
            <button
              id="btn-export-all-jobs-excel"
              onClick={() => exportJobsToExcel(filteredAndSortedJobs, userProfile)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-md transition shadow-2xs shrink-0 flex items-center justify-center gap-1.5 cursor-pointer border border-emerald-500"
              title="Exportar planilha Excel com score, ATS coverage e status de todas as vagas filtradas"
            >
              <Download className="w-4 h-4" />
              <span>EXPORTAR VAGAS (XLSX)</span>
            </button>
          </div>

          {/* Stats Dashboard */}
          <StatsDashboard
            jobs={filteredAndSortedJobs}
            activeFilter={activeStatFilter}
            onSelectFilter={setActiveStatFilter}
          />

          {/* Secondary Controls & Local Filters */}
          <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-2xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 text-xs">
            {/* Search input for returned list */}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="search-jobs-input"
                type="text"
                placeholder="Filtrar listagem por título, empresa ou palavra-chave local..."
                value={localSearchTerm}
                onChange={(e) => setLocalSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition font-medium"
              />
            </div>

            {/* Filters Row */}
            <div className="flex items-center flex-wrap gap-2 text-xs">
              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
                <Tag className="w-3 h-3 text-slate-500" />
                <select
                  id="filter-status-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent text-slate-700 focus:outline-none font-semibold cursor-pointer text-xs"
                >
                  <option value="ALL">Status: Todos</option>
                  <option value="NEW">Nova</option>
                  <option value="PREPARED">Preparada</option>
                  <option value="APPLIED">Candidatado</option>
                  <option value="INTERVIEW">Entrevista</option>
                  <option value="REJECTED">Rejeitada</option>
                  <option value="OFFER">Oferta</option>
                </select>
              </div>

              {/* Apply Priority Filter */}
              <div className="flex items-center gap-1 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-md">
                <Sparkles className="w-3 h-3 text-purple-600" />
                <select
                  id="filter-priority-select"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="bg-transparent text-purple-900 focus:outline-none font-bold cursor-pointer text-xs"
                >
                  <option value="ALL">Apply Priority: Todos</option>
                  <option value="APPLY_NOW">⚡ APPLY NOW (90+)</option>
                  <option value="HIGH_PRIORITY">🔥 HIGH PRIORITY (80-89)</option>
                  <option value="REVIEW">🔍 REVIEW (65-79)</option>
                  <option value="NOT_ELIGIBLE">⛔ NOT ELIGIBLE</option>
                </select>
              </div>

              {/* Workplace filter */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
                <Filter className="w-3 h-3 text-slate-500" />
                <select
                  id="filter-workplace-select"
                  value={workplaceFilter}
                  onChange={(e) => setWorkplaceFilter(e.target.value)}
                  className="bg-transparent text-slate-700 focus:outline-none font-semibold cursor-pointer text-xs"
                >
                  <option value="all">Modelo: Todos</option>
                  <option value="Remoto">100% Remoto</option>
                  <option value="Híbrido">Híbrido</option>
                  <option value="Presencial">Presencial</option>
                </select>
              </div>

              {/* Sort filter */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
                <ArrowUpDown className="w-3 h-3 text-slate-500" />
                <select
                  id="sort-jobs-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'score' | 'applyPriority' | 'title' | 'company')}
                  className="bg-transparent text-slate-700 focus:outline-none font-semibold cursor-pointer text-xs"
                >
                  <option value="applyPriority">Ordenar: Maior Apply Priority ⚡</option>
                  <option value="score">Ordenar: Maior Match Score</option>
                  <option value="title">Ordenar: Cargo</option>
                  <option value="company">Ordenar: Empresa</option>
                </select>
              </div>

              {/* Reset button */}
              {(localSearchTerm || activeStatFilter !== 'all' || workplaceFilter !== 'all' || statusFilter !== 'ALL' || priorityFilter !== 'ALL' || searchMinScore > 0) && (
                <button
                  id="reset-filters-btn"
                  onClick={handleResetFilters}
                  className="flex items-center gap-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-md transition cursor-pointer font-semibold"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Limpar Filtros</span>
                </button>
              )}
            </div>
          </div>

          {/* Section Header */}
          <div className="flex items-center justify-between px-0.5 pt-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold text-slate-900 tracking-tight uppercase">
                Ranking de Vagas ({useMockData ? 'Modo Teste / Mock' : 'Resultados Adzuna API'})
              </h2>
              <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">
                {filteredAndSortedJobs.length} exibidas
              </span>
            </div>

            <span className="text-[11px] text-slate-500 hidden sm:inline font-medium">
              Avaliadas e ranqueadas deterministicamente pelo algoritmo de pontuação.
            </span>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="bg-white border border-slate-200 rounded-lg p-10 text-center my-4 space-y-3 shadow-2xs">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">Consultando API da Adzuna...</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                Buscando vagas reais, normalizando dados, removendo duplicatas e calculando a aderência ao perfil de Jean Silva.
              </p>
            </div>
          )}

          {/* Jobs Grid / Ranking */}
          {!isLoading && filteredAndSortedJobs.length > 0 && (
            <div id="jobs-ranking-grid" className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredAndSortedJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onOpenAnalysis={(j) => setSelectedAnalysisJob(j)}
                  onOpenDescription={(j) => setSelectedDescriptionJob(j)}
                  onOpenTailoredResume={(j) => setSelectedTailoredResumeJob(j)}
                  onOpenApplicationPackage={(j) => setSelectedApplicationPackageJob(j)}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredAndSortedJobs.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-lg p-8 text-center my-4 max-w-md mx-auto space-y-2 shadow-2xs">
              <SlidersHorizontal className="w-6 h-6 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">
                {searchError ? 'Erro ao carregar vagas' : 'Nenhuma vaga encontrada'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {searchError
                  ? searchError
                  : !useMockData
                  ? 'Nenhum resultado retornado para estes parâmetros na Adzuna. Experimente deixar a localização em branco ou ajustar o termo de busca.'
                  : 'Nenhuma oportunidade corresponde aos filtros locais. Tente ajustar os termos ou selecionar "Dados de Teste".'}
              </p>
              <div className="pt-2 flex justify-center gap-2">
                <button
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1 text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-800 px-3 py-1.5 rounded-md transition cursor-pointer"
                >
                  Resetar Filtros
                </button>
                {!useMockData && (
                  <button
                    onClick={() => setUseMockData(true)}
                    className="inline-flex items-center gap-1 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md transition cursor-pointer"
                  >
                    Ver Vagas de Teste (Mock)
                  </button>
                )}
              </div>
            </div>
          )}
          </>
          )}
        </main>
      </div>

      {/* Modals */}
      <JobAnalysisModal
        job={selectedAnalysisJob}
        profile={userProfile}
        onClose={() => setSelectedAnalysisJob(null)}
        onOpenTailoredResume={(j) => setSelectedTailoredResumeJob(j)}
        onOpenApplicationPackage={(j) => setSelectedApplicationPackageJob(j)}
      />

      <JobDescriptionModal
        job={selectedDescriptionJob}
        onClose={() => setSelectedDescriptionJob(null)}
        onOpenAnalysis={(j) => setSelectedAnalysisJob(j)}
      />

      {selectedTailoredResumeJob && (
        <TailoredResumeModal
          job={selectedTailoredResumeJob}
          profile={userProfile}
          onClose={() => setSelectedTailoredResumeJob(null)}
        />
      )}

      {selectedApplicationPackageJob && (
        <ApplicationPackageModal
          job={selectedApplicationPackageJob}
          profile={userProfile}
          onClose={() => setSelectedApplicationPackageJob(null)}
          onStatusChange={handleStatusChange}
        />
      )}

      {isProfileOpen && (
        <ProfileModal
          profile={userProfile}
          onClose={() => setIsProfileOpen(false)}
        />
      )}

      {isAddJobOpen && (
        <AddJobModal
          onAddJob={handleAddJob}
          onClose={() => setIsAddJobOpen(false)}
        />
      )}

      {isJobBoardsOpen && (
        <JobBoardsModal
          onClose={() => setIsJobBoardsOpen(false)}
        />
      )}

      {isCloudSyncOpen && (
        <CloudSyncModal
          onClose={() => setIsCloudSyncOpen(false)}
          appliedMap={getStoredStatuses()}
          tailoredResumesMap={getStoredTailoredResumes()}
          jobs={baseJobs}
          onDataRestored={({ appliedMap, tailoredResumesMap }) => {
            saveStatusMap(appliedMap);
            saveTailoredResumesMap(tailoredResumesMap);
            handleStatusChange();
          }}
        />
      )}
    </div>
    </AuthGuard>
  );
}

