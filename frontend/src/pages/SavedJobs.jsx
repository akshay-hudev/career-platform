import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useUser } from '../context/UserContext'
import { getSavedJobs, updateJobStatus, deleteSavedJob } from '../api/client'
import MatchScoreBar from '../components/MatchScoreBar'
import { Trash2, ExternalLink, GripVertical, Building2, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'

const COLUMNS = [
  { key: 'saved',        label: 'Saved',        color: 'border-gray-700',    badge: 'bg-gray-700 text-gray-300' },
  { key: 'applied',      label: 'Applied',       color: 'border-blue-800',    badge: 'bg-blue-900/50 text-blue-300' },
  { key: 'interviewing', label: 'Interviewing',  color: 'border-amber-800',   badge: 'bg-amber-900/50 text-amber-300' },
  { key: 'offered',      label: 'Offered 🎉',    color: 'border-emerald-800', badge: 'bg-emerald-900/50 text-emerald-300' },
  { key: 'rejected',     label: 'Rejected',      color: 'border-red-900',     badge: 'bg-red-900/50 text-red-400' },
]

function JobKanbanCard({ job, onStatusChange, onDelete }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 group hover:border-gray-600 transition-colors">
      {/* Header */}
      <div className="flex items-start gap-2 mb-2">
        <GripVertical size={14} className="text-gray-700 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white leading-tight line-clamp-2">{job.title}</p>
          {job.company && (
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
              <Building2 size={10} /> {job.company}
            </p>
          )}
          {job.location && (
            <p className="text-xs text-gray-600 flex items-center gap-1">
              <MapPin size={10} /> {job.location}
            </p>
          )}
        </div>
      </div>

      {/* Match score */}
      {job.match_score != null && (
        <div className="mb-2">
          <MatchScoreBar score={job.match_score} size="sm" />
        </div>
      )}

      {/* Saved date */}
      <p className="text-xs text-gray-600 mb-3">
        Saved {new Date(job.saved_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
      </p>

      {/* Status changer */}
      <select
        className="w-full bg-gray-900 border border-gray-700 text-gray-300 text-xs rounded-lg px-2 py-1.5 mb-2 focus:outline-none focus:ring-1 focus:ring-brand-500"
        value={job.status}
        onChange={e => onStatusChange(job.id, e.target.value)}
      >
        {COLUMNS.map(c => (
          <option key={c.key} value={c.key}>{c.label}</option>
        ))}
      </select>

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        {job.job_url && (
          <a
            href={job.job_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 text-xs btn-secondary py-1"
          >
            <ExternalLink size={11} /> View Job
          </a>
        )}
        <button
          onClick={() => onDelete(job.id)}
          className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

export default function SavedJobs() {
  const { user } = useUser()
  const queryClient = useQueryClient()

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['savedJobs', user?.id],
    queryFn: () => getSavedJobs(user.id).then(r => r.data),
    enabled: !!user,
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => updateJobStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries(['savedJobs', user.id]),
    onError: (e) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteSavedJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['savedJobs', user.id])
      toast.success('Job removed from board.')
    },
    onError: (e) => toast.error(e.message),
  })

  if (isLoading) {
    return <div className="max-w-7xl mx-auto px-4 py-8 text-gray-500 text-sm">Loading...</div>
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Job Board</h1>
        <p className="text-gray-500 text-sm mt-1">
          {jobs.length} job{jobs.length !== 1 ? 's' : ''} tracked · Update status to move cards between columns
        </p>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <p>No saved jobs yet. Search for jobs and save them to track here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {COLUMNS.map(col => {
            const colJobs = jobs.filter(j => j.status === col.key)
            return (
              <div key={col.key}>
                {/* Column Header */}
                <div className={`flex items-center justify-between mb-3 pb-2 border-b ${col.color}`}>
                  <span className="text-sm font-medium text-gray-300">{col.label}</span>
                  <span className={`badge ${col.badge}`}>{colJobs.length}</span>
                </div>
                {/* Cards */}
                <div className="space-y-3">
                  {colJobs.map(job => (
                    <JobKanbanCard
                      key={job.id}
                      job={job}
                      onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
                      onDelete={deleteMutation.mutate}
                    />
                  ))}
                  {colJobs.length === 0 && (
                    <div className="border border-dashed border-gray-800 rounded-xl p-4 text-center text-xs text-gray-700">
                      Empty
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
