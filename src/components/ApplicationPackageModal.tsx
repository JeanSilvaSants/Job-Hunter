import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  FileCheck2,
  ExternalLink,
  Award,
  ListOrdered,
  Layers,
  HelpCircle,
  Building2,
  MapPin,
  Download,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { JobWithAnalysis, UserProfile, ApplicationStatus } from '../types';
import { generateTailoredResume, TailoredResume, saveTailoredResumeForJob } from '../services/resume';
import { syncTailoredResume, TailoredResumeSyncDiagnostic } from '../services/cloudSync';
import { buildFullResumeData, formatFullResumeAsText } from '../services/fullResume';
import { exportResumeToDocx } from '../services/exportDocx';
import { exportResumeToPdf } from '../services/exportPdf';
import { getJobStatus, setJobStatus, STATUS_LABELS, STATUS_COLORS } from '../services/applicationStatus';

interface ApplicationPackageModalProps {
  job: JobWithAnalysis | null;
  profile: UserProfile;
  onClose: () => void;
  onStatusChange?: (jobId: string, newStatus: ApplicationStatus) => void;
}

export const ApplicationPackageModal: React.FC<ApplicationPackageModalProps> = ({
  job,
  profile,
  onClose,
  onStatusChange,
}) => {
  const [status, setStatus] = useState<ApplicationStatus>('PREPARED');
  const [langOverride, setLangOverride] = useState<'auto' | 'pt-BR' | 'en'>('auto');
  const [copiedResume, setCopiedResume] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedKeywords, setCopiedKeywords] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [syncDiag, setSyncDiag] = useState<{
    loading: boolean;
    diag: TailoredResumeSyncDiagnostic | null;
  }>({ loading: true, diag: null });

  useEffect(() => {
    if (job) {
      // Ensure status is marked PREPARED when preparing application package
      const current = getJobStatus(job);
      if (current === 'NEW') {
        setJobStatus(job, 'PREPARED');
        setStatus('PREPARED');
        if (onStatusChange) onStatusChange(job.id, 'PREPARED');
      } else {
        setStatus(current);
      }
    }
  }, [job]);

  if (!job) return null;

  const overrideLangParam = langOverride === 'auto' ? undefined : langOverride;
  const tailoredResume: TailoredResume = generateTailoredResume(job, profile, overrideLangParam);
  const fullResumeData = buildFullResumeData(tailoredResume);
  const fullResumeText = formatFullResumeAsText(fullResumeData);

  // Auto-save locally and sync to Supabase with step diagnostics
  useEffect(() => {
    if (job && tailoredResume) {
      saveTailoredResumeForJob(job, tailoredResume);

      setSyncDiag({ loading: true, diag: null });
      syncTailoredResume(job, tailoredResume)
        .then((diag) => {
          setSyncDiag({ loading: false, diag });
        })
        .catch((err) => {
          setSyncDiag({
            loading: false,
            diag: {
              success: false,
              resumeGenerated: true,
              jobSynced: false,
              remoteJobId: null,
              resumeSynced: false,
              error: { message: err.message || String(err) },
            },
          });
        });
    }
  }, [job?.id, overrideLangParam]);

  const handleStatusSelect = (newStatus: ApplicationStatus) => {
    setStatus(newStatus);
    setJobStatus(job, newStatus);
    if (onStatusChange) onStatusChange(job.id, newStatus);
  };

  const handleCopyResume = () => {
    navigator.clipboard.writeText(fullResumeText);
    setCopiedResume(true);
    setTimeout(() => setCopiedResume(false), 2500);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(job.url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopySummary = () => {
    navigator.clipboard.writeText(tailoredResume.professionalSummary);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const handleCopyKeywords = () => {
    const text = [
      `MATCHED KEYWORDS: ${tailoredResume.atsKeywords.matched.join(', ')}`,
      `RELATED KEYWORDS: ${tailoredResume.atsKeywords.related.map((r) => `${r.jobKeyword} -> ${r.candidateEquivalent}`).join(', ')}`,
      `MISSING KEYWORDS (LACUNAS): ${tailoredResume.atsKeywords.missing.join(', ')}`,
    ].join('\n');
    navigator.clipboard.writeText(text);
    setCopiedKeywords(true);
    setTimeout(() => setCopiedKeywords(false), 2500);
  };

  const handleExportDocx = async () => {
    setIsExportingDocx(true);
    try {
      await exportResumeToDocx(fullResumeData, job.company, job.title);
    } catch (err) {
      console.error('Error exporting DOCX:', err);
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      await exportResumeToPdf(fullResumeData, job.company, job.title);
    } catch (err) {
      console.error('Error exporting PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div
        className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-indigo-600/30 border border-indigo-400/40 text-indigo-300 rounded-lg shrink-0">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  PACOTE DE CANDIDATURA PRONTO
                </span>
                <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  {job.company}
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {job.location}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight mt-0.5">
                {job.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {/* Status Selector */}
            <div className="flex items-center gap-1.5 bg-slate-800 p-1.5 rounded-lg border border-slate-700">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                Status:
              </span>
              <select
                id="select-job-status-modal"
                value={status}
                onChange={(e) => handleStatusSelect(e.target.value as ApplicationStatus)}
                className="bg-slate-900 text-white text-xs font-bold px-2 py-1 rounded border border-slate-600 cursor-pointer focus:outline-none focus:border-indigo-400"
              >
                {(Object.keys(STATUS_LABELS) as ApplicationStatus[]).map((stKey) => (
                  <option key={stKey} value={stKey}>
                    {STATUS_LABELS[stKey]}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              title="Fechar Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sync Diagnostics Status Bar */}
        <div className="bg-slate-900 text-slate-200 border-b border-slate-800 px-4 py-2 text-xs font-mono flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1 font-semibold text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Tailored Resume generated: OK
            </span>
            <span className="text-slate-600">•</span>
            {syncDiag.loading ? (
              <span className="text-amber-400 flex items-center gap-1 animate-pulse">
                Sincronizando com Supabase...
              </span>
            ) : syncDiag.diag?.jobSynced ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Job synced: OK
              </span>
            ) : (
              <span className="text-red-400 flex items-center gap-1 font-semibold">
                <AlertCircle className="w-3.5 h-3.5" /> Job synced: ERROR
              </span>
            )}
            <span className="text-slate-600">•</span>
            <span className={syncDiag.diag?.remoteJobId ? 'text-blue-300' : 'text-slate-400'}>
              Remote job_id: {syncDiag.diag?.remoteJobId ? `present (${syncDiag.diag.remoteJobId.slice(0, 8)}...)` : 'missing'}
            </span>
            <span className="text-slate-600">•</span>
            {syncDiag.loading ? (
              <span className="text-slate-400">Tailored Resume synced: ...</span>
            ) : syncDiag.diag?.resumeSynced ? (
              <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Tailored Resume synced: OK
              </span>
            ) : (
              <span className="text-red-400 flex items-center gap-1 font-semibold">
                <AlertCircle className="w-3.5 h-3.5" /> Tailored Resume synced: ERROR
              </span>
            )}
          </div>
        </div>
        {syncDiag.diag?.error && (
          <div className="bg-red-950/60 border-b border-red-800/80 text-red-200 px-4 py-2 text-xs font-mono shrink-0 flex flex-col gap-0.5">
            <div className="font-bold flex items-center gap-1.5 text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Erro de sincronização com Supabase:</span>
            </div>
            <div><strong className="text-red-300">Message:</strong> {syncDiag.diag.error.message}</div>
            {syncDiag.diag.error.code && <div><strong className="text-red-300">Code:</strong> {syncDiag.diag.error.code}</div>}
            {syncDiag.diag.error.details && <div><strong className="text-red-300">Details:</strong> {syncDiag.diag.error.details}</div>}
            {syncDiag.diag.error.hint && <div><strong className="text-red-300">Hint:</strong> {syncDiag.diag.error.hint}</div>}
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs text-slate-800 bg-slate-50/50">
          {/* LANGUAGE SELECTOR & BADGE BAR */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Idioma do Currículo:</span>
              <div className="inline-flex p-1 bg-slate-100 rounded-lg text-xs font-medium">
                <button
                  onClick={() => setLangOverride('auto')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    langOverride === 'auto'
                      ? 'bg-white shadow-xs text-slate-900 font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Automático
                </button>
                <button
                  onClick={() => setLangOverride('pt-BR')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    langOverride === 'pt-BR'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Português
                </button>
                <button
                  onClick={() => setLangOverride('en')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    langOverride === 'en'
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">Versão gerada:</span>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black tracking-wide border ${
                  tailoredResume.resumeLanguage === 'en'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                }`}
              >
                {tailoredResume.resumeLanguage === 'en' ? 'RESUME: EN 🇺🇸' : 'CURRÍCULO: PT-BR 🇧🇷'}
              </span>
            </div>
          </div>

          {/* TOP METRICS & SUMMARY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* General Match Score */}
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Score de Aderência
                </span>
                <div className="text-lg font-black text-slate-900 mt-0.5">
                  {job.analysis.score}%
                  <span className="text-xs font-semibold text-slate-500 ml-1.5">
                    ({job.analysis.classification})
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-extrabold text-xs flex items-center justify-center">
                {job.analysis.score}%
              </div>
            </div>

            {/* ATS Coverage Score */}
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  ATS Coverage (Keywords)
                </span>
                <div className="text-lg font-black text-slate-900 mt-0.5">
                  {tailoredResume.atsCoverageScore}%
                  <span className="text-xs font-medium text-slate-500 ml-1.5">
                    ({tailoredResume.coveredJobKeywordsCount}/{tailoredResume.totalRelevantJobKeywords})
                  </span>
                </div>
              </div>
              <div
                className={`w-10 h-10 rounded-lg font-extrabold text-xs flex items-center justify-center border ${
                  tailoredResume.atsCoverageScore >= 80
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                }`}
              >
                {tailoredResume.atsCoverageScore}%
              </div>
            </div>

            {/* Job Link Quick Action */}
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Link Oficial da Vaga
                </span>
                <p className="text-xs font-semibold text-slate-800 truncate mt-0.5">
                  {job.company}
                </p>
              </div>
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold text-xs transition shadow-2xs shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <span>Acessar</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* HEADLINE */}
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-1 shadow-2xs">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Headline Otimizada para a Vaga
            </span>
            <div className="text-xs sm:text-sm font-bold text-slate-900 font-sans tracking-tight bg-slate-50 p-2.5 rounded border border-slate-200">
              {tailoredResume.headline}
            </div>
          </div>

          {/* RESUMO PROFISSIONAL */}
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-1.5 shadow-2xs">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-blue-600" />
              Resumo Profissional Estratégico
            </span>
            <div className="text-xs text-slate-700 leading-relaxed font-medium bg-slate-50/70 p-3 rounded border border-slate-200">
              {tailoredResume.professionalSummary}
            </div>
          </div>

          {/* SKILLS PRIORITIZADAS */}
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2 shadow-2xs">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Competências Prioritárias Reorganizadas
            </span>
            <div className="flex flex-wrap gap-1.5">
              {tailoredResume.prioritySkills.map((skill) => (
                <span
                  key={skill}
                  className="bg-slate-100 border border-slate-200 text-slate-800 font-bold text-[11px] px-2.5 py-1 rounded shadow-2xs flex items-center gap-1"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* EXPERIÊNCIA SELECIONADA */}
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2.5 shadow-2xs">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <ListOrdered className="w-3.5 h-3.5 text-slate-700" />
              Histórico Profissional Selecionado e Ranqueado por Relevância
            </span>

            <div className="space-y-2.5">
              {tailoredResume.selectedExperienceBullets.map((exp, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-md p-3 space-y-1.5">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                    <div>
                      <span className="font-bold text-slate-900 text-xs">{exp.role}</span>
                      <span className="text-slate-500 text-[11px] ml-2 font-medium">@ {exp.company}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 font-bold">{exp.period}</span>
                  </div>
                  <ul className="space-y-1 text-slate-700 text-xs">
                    {exp.highlights.map((h, hIdx) => (
                      <li key={hIdx} className="flex items-start gap-1.5 leading-relaxed">
                        <span className="text-blue-600 font-bold">•</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* KEYWORDS BREAKDOWN */}
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2 shadow-2xs">
            <span className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              Mapeamento de ATS Keywords
            </span>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {/* MATCHED */}
              <div className="bg-emerald-50/80 border border-emerald-200 rounded p-2.5 space-y-1">
                <div className="text-[10px] font-bold text-emerald-800 uppercase flex items-center justify-between">
                  <span>MATCHED ({tailoredResume.atsKeywords.matched.length})</span>
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {tailoredResume.atsKeywords.matched.map((m) => (
                    <span key={m} className="bg-white text-emerald-800 border border-emerald-300 font-semibold text-[10px] px-1.5 py-0.5 rounded">
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              {/* RELATED */}
              <div className="bg-blue-50/80 border border-blue-200 rounded p-2.5 space-y-1">
                <div className="text-[10px] font-bold text-blue-800 uppercase flex items-center justify-between">
                  <span>RELATED ({tailoredResume.atsKeywords.related.length})</span>
                  <ArrowRight className="w-3 h-3 text-blue-600" />
                </div>
                <div className="space-y-1 pt-1">
                  {tailoredResume.atsKeywords.related.length > 0 ? (
                    tailoredResume.atsKeywords.related.map((r, rIdx) => (
                      <div key={rIdx} className="text-[10px] bg-white border border-blue-200 text-blue-900 px-1.5 py-0.5 rounded font-medium flex items-center justify-between">
                        <span>{r.jobKeyword}</span>
                        <span className="text-[9px] text-blue-600 font-bold">→ {r.candidateEquivalent}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-[10px] text-slate-500 italic">Nenhum termo equivalente.</span>
                  )}
                </div>
              </div>

              {/* MISSING */}
              <div className="bg-amber-50/80 border border-amber-200 rounded p-2.5 space-y-1">
                <div className="text-[10px] font-bold text-amber-900 uppercase flex items-center justify-between">
                  <span>MISSING (LACUNAS REALMENTE MANTIDAS) ({tailoredResume.atsKeywords.missing.length})</span>
                  <AlertCircle className="w-3 h-3 text-amber-600" />
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {tailoredResume.atsKeywords.missing.length > 0 ? (
                    tailoredResume.atsKeywords.missing.map((m) => (
                      <span key={m} className="bg-white text-amber-900 border border-amber-300 font-semibold text-[10px] px-1.5 py-0.5 rounded">
                        {m}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-slate-500 italic">Sem lacunas detectadas.</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RATIONALE AUDIT */}
          {tailoredResume.notes.length > 0 && (
            <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-3 space-y-1.5">
              <span className="text-[10px] font-extrabold text-amber-900 uppercase tracking-wider flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
                Auditoria do Algoritmo de Personalização
              </span>
              <ul className="space-y-1 text-xs text-amber-950 font-medium">
                {tailoredResume.notes.map((note, nIdx) => (
                  <li key={nIdx} className="flex items-start gap-1.5">
                    <span className="text-amber-600 font-bold">•</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions Bar */}
        <div className="bg-slate-900 text-white px-5 py-3.5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          {/* Quick Copy Buttons Group */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              id="btn-copy-full-resume"
              onClick={handleCopyResume}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-md font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              {copiedResume ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedResume ? 'Copiado!' : 'Copiar Currículo'}</span>
            </button>

            <button
              id="btn-copy-job-link"
              onClick={handleCopyLink}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-md font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copiado!' : 'Copiar Link Vaga'}</span>
            </button>

            <button
              id="btn-copy-summary"
              onClick={handleCopySummary}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-md font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSummary ? 'Copiado!' : 'Copiar Resumo'}</span>
            </button>

            <button
              id="btn-copy-keywords"
              onClick={handleCopyKeywords}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-md font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              {copiedKeywords ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKeywords ? 'Copiado!' : 'Copiar Keywords'}</span>
            </button>
          </div>

          {/* Export File Buttons Group */}
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              id="btn-export-docx"
              onClick={handleExportDocx}
              disabled={isExportingDocx}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md transition shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              <span>{isExportingDocx ? 'Exportando DOCX...' : 'EXPORTAR DOCX'}</span>
            </button>

            <button
              id="btn-export-pdf"
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-md transition shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExportingPdf ? 'Exportando PDF...' : 'EXPORTAR PDF'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
