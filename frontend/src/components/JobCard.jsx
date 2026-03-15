import { MapPin, Building2, ExternalLink, Bookmark, IndianRupee } from 'lucide-react'
import MatchScoreBar from './MatchScoreBar'
import clsx from 'clsx'

function formatSalary(min, max) {
  if (!min && !max) return null
  const toLPA = (val) => (val / 100000).toFixed(1) + ' LPA'
  if (min && max) return `${toLPA(min)} – ${toLPA(max)}`
  if (min) return `From ${toLPA(min)}`
  return `Up to ${toLPA(max)}`
}

export default function JobCard({ job, onSave, onAdvice, saved = false }) {
  const salary = formatSalary(job.salary_min, job.salary_max)

  return (
    <div className="card hover:border-gray-700 transition-colors group">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-sm leading-tight truncate">
            {job.title}
          </h3>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            {job.company && (
              <span className="flex items-center gap-1">
                <Building2 size={11} /> {job.company}
              </span>
            )}
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPin size={11} /> {job.location}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {job.job_url && (
            <a
              href={job.job_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-gray-600 hover:text-brand-400 hover:bg-gray-800 transition-colors"
            >
              <ExternalLink size={14} />
            </a>
          )}
          {onSave && (
            <button
              onClick={() => onSave(job)}
              disabled={saved}
              className={clsx(
                'p-1.5 rounded-lg transition-colors',
                saved
                  ? 'text-brand-400 bg-brand-600/10 cursor-default'
                  : 'text-gray-600 hover:text-brand-400 hover:bg-gray-800'
              )}
              title={saved ? 'Saved' : 'Save job'}
            >
              <Bookmark size={14} fill={saved ? 'currentColor' : 'none'} />
            </button>
          )}
        </div>
      </div>

      {/* Match Score */}
      {job.match_score !== null && job.match_score !== undefined && (
        <div className="mb-3">
          <MatchScoreBar score={job.match_score} size="sm" />
        </div>
      )}

      {/* Salary */}
      {salary && (
        <div className="flex items-center gap-1 text-xs text-emerald-400 mb-3">
          <IndianRupee size={11} />
          {salary}
        </div>
      )}

      {/* Description snippet */}
      {job.description && (
        <p className="text-xs text-gray-500 line-clamp-2 mb-3">
          {job.description}
        </p>
      )}

      {/* AI Advice Button */}
      {onAdvice && (
        <button
          onClick={() => onAdvice(job)}
          className="w-full text-xs btn-secondary py-1.5 mt-1"
        >
          Get AI Career Advice →
        </button>
      )}
    </div>
  )
}
