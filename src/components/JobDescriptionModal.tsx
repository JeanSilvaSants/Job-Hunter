import React from 'react';
import { X, Building2, MapPin, DollarSign, Calendar, ExternalLink, Briefcase } from 'lucide-react';
import { JobWithAnalysis } from '../types';

interface JobDescriptionModalProps {
  job: JobWithAnalysis | null;
  onClose: () => void;
  onOpenAnalysis: (job: JobWithAnalysis) => void;
}

export const JobDescriptionModal: React.FC<JobDescriptionModalProps> = ({
  job,
  onClose,
  onOpenAnalysis,
}) => {
  if (!job) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div
        id="job-description-modal"
        className="bg-white border border-slate-200 rounded-lg w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-xl text-slate-800 my-4 flex flex-col"
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 sticky top-0 bg-white/95 z-10 flex items-start justify-between gap-3 backdrop-blur">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                {job.workplaceType}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                {job.seniority}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">{job.title}</h2>
            <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-600 mt-1">
              <span className="flex items-center gap-1 font-bold text-slate-800">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                {job.company}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {job.location}
              </span>
              {job.salaryRange && (
                <span className="flex items-center gap-0.5 text-emerald-700 font-bold">
                  <DollarSign className="w-3.5 h-3.5" />
                  {job.salaryRange}
                </span>
              )}
            </div>
          </div>

          <button
            id="close-description-modal-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4">
          
          {/* Requirements Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-blue-600" />
              Requisitos / Competências Solicitadas
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {job.requirements.map((req, idx) => (
                <span
                  key={idx}
                  className="text-xs bg-white text-slate-800 border border-slate-200 px-2.5 py-1 rounded font-medium shadow-2xs"
                >
                  {req}
                </span>
              ))}
            </div>
          </div>

          {/* Full Description */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Descrição Completa da Vaga
            </h3>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs text-slate-800 leading-relaxed whitespace-pre-line font-sans">
              {job.description}
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200 font-medium">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Publicada: {job.publishedAt}
            </span>
            <span>ID Interno: {job.id}</span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 sticky bottom-0 flex items-center justify-between gap-2">
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white px-3 py-1.5 rounded-md transition border border-slate-200 shadow-2xs"
          >
            <span>Link Externo</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <div className="flex items-center gap-2">
            <button
              id="close-description-modal-bottom-btn"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-md font-bold text-xs transition cursor-pointer"
            >
              Fechar
            </button>
            <button
              id="open-analysis-from-desc-btn"
              onClick={() => {
                onClose();
                onOpenAnalysis(job);
              }}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md text-xs transition shadow-2xs cursor-pointer"
            >
              Ver Análise Detalhada
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
