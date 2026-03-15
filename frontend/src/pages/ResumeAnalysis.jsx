import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useUser } from '../context/UserContext'
import { uploadResume, listResumes, deleteResume } from '../api/client'
import ResumeUpload from '../components/ResumeUpload'
import MatchScoreBar from '../components/MatchScoreBar'
import { Trash2, FileText, Calendar, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'

function ResumeCard({ resume, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const parsed = resume.parsed_data || {}

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-600/10 rounded-xl">
            <FileText size={18} className="text-brand-400" />
          </div>
          <div>
            <p className="font-medium text-white text-sm">{resume.filename}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
              <Calendar size={11} />
              {new Date(resume.uploaded_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric'
              })}
            </p>
          </div>
        </div>
        <button
          onClick={() => onDelete(resume.id)}
          className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* ATS Score */}
      {resume.ats_score !== null && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-1.5 uppercase tracking-wider">ATS Score</p>
          <MatchScoreBar score={resume.ats_score} />
        </div>
      )}

      {/* Summary */}
      {parsed.summary && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-1.5 uppercase tracking-wider">AI Summary</p>
          <p className="text-xs text-gray-300 leading-relaxed">{parsed.summary}</p>
        </div>
      )}

      {/* Skills */}
      {parsed.skills?.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">
            Extracted Skills ({parsed.skills.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {parsed.skills.map(s => (
              <span key={s} className="badge bg-brand-600/10 text-brand-400">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Expandable details */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors w-full"
      >
        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        {expanded ? 'Hide details' : 'Show more details'}
      </button>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-800 space-y-3">
          {parsed.experience_years && (
            <div>
              <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Experience</p>
              <p className="text-sm text-gray-300">{parsed.experience_years} years</p>
            </div>
          )}
          {parsed.companies?.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Companies Mentioned</p>
              <div className="flex flex-wrap gap-1.5">
                {parsed.companies.map(c => (
                  <span key={c} className="badge bg-gray-700 text-gray-300">{c}</span>
                ))}
              </div>
            </div>
          )}
          {parsed.education?.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Education</p>
              <ul className="space-y-1">
                {parsed.education.map((e, i) => (
                  <li key={i} className="text-xs text-gray-300">{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ResumeAnalysis() {
  const { user } = useUser()
  const queryClient = useQueryClient()

  const { data: resumes = [], isLoading } = useQuery({
    queryKey: ['resumes', user?.id],
    queryFn: () => listResumes(user.id).then(r => r.data),
    enabled: !!user,
  })

  const uploadMutation = useMutation({
    mutationFn: (file) => uploadResume(file, user.id),
    onSuccess: () => {
      queryClient.invalidateQueries(['resumes', user.id])
      toast.success('Resume parsed successfully!')
    },
    onError: (e) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (resumeId) => deleteResume(resumeId),
    onSuccess: () => {
      queryClient.invalidateQueries(['resumes', user.id])
      toast.success('Resume deleted.')
    },
    onError: (e) => toast.error(e.message),
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Resume Analysis</h1>
        <p className="text-gray-500 text-sm mt-1">
          Upload your PDF resume — we'll extract skills, calculate your ATS score, and generate embeddings for job matching.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload */}
        <div>
          <h2 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Upload New Resume</h2>
          <ResumeUpload
            onUpload={(file) => uploadMutation.mutate(file)}
            loading={uploadMutation.isPending}
          />

          {/* ATS Tips */}
          <div className="card mt-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">ATS Score Guide</p>
            <div className="space-y-2">
              {[
                { range: '70–100', label: 'Strong Match', color: 'text-emerald-400' },
                { range: '45–69', label: 'Partial Match', color: 'text-yellow-400' },
                { range: '0–44', label: 'Low Match', color: 'text-red-400' },
              ].map(({ range, label, color }) => (
                <div key={range} className="flex items-center justify-between text-xs">
                  <span className={`font-medium ${color}`}>{range}</span>
                  <span className="text-gray-500">{label}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-3 leading-relaxed">
              Score is based on skills density, education, experience mentions, and extracted entities.
            </p>
          </div>
        </div>

        {/* Resume List */}
        <div>
          <h2 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">
            Your Resumes ({resumes.length})
          </h2>
          {isLoading ? (
            <div className="card text-center py-8 text-gray-600">Loading...</div>
          ) : resumes.length === 0 ? (
            <div className="card text-center py-8">
              <FileText size={28} className="text-gray-700 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No resumes yet — upload one!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {resumes.map(r => (
                <ResumeCard
                  key={r.id}
                  resume={r}
                  onDelete={deleteMutation.mutate}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
