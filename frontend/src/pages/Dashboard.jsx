import { useQuery } from '@tanstack/react-query'
import { useUser } from '../context/UserContext'
import { listResumes, getSavedJobs } from '../api/client'
import { Link } from 'react-router-dom'
import { FileText, Search, Bookmark, TrendingUp, ArrowRight, Zap } from 'lucide-react'
import MatchScoreBar from '../components/MatchScoreBar'

function StatCard({ icon: Icon, label, value, color, to }) {
  return (
    <Link to={to} className="card hover:border-gray-700 transition-colors group flex items-center gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="flex-1">
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
      <ArrowRight size={16} className="text-gray-700 group-hover:text-gray-500 transition-colors" />
    </Link>
  )
}

export default function Dashboard() {
  const { user } = useUser()

  const { data: resumes = [] } = useQuery({
    queryKey: ['resumes', user?.id],
    queryFn: () => listResumes(user.id).then(r => r.data),
    enabled: !!user,
  })

  const { data: savedJobs = [] } = useQuery({
    queryKey: ['savedJobs', user?.id],
    queryFn: () => getSavedJobs(user.id).then(r => r.data),
    enabled: !!user,
  })

  const applied = savedJobs.filter(j => j.status === 'applied').length
  const interviewing = savedJobs.filter(j => j.status === 'interviewing').length
  const latestResume = resumes[0]

  const statusCounts = {
    saved: savedJobs.filter(j => j.status === 'saved').length,
    applied: savedJobs.filter(j => j.status === 'applied').length,
    interviewing: savedJobs.filter(j => j.status === 'interviewing').length,
    offered: savedJobs.filter(j => j.status === 'offered').length,
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          Welcome back, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">Here's your career progress at a glance.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={FileText} label="Resumes uploaded" value={resumes.length} color="bg-brand-600" to="/resume" />
        <StatCard icon={Bookmark} label="Jobs saved" value={savedJobs.length} color="bg-violet-600" to="/saved" />
        <StatCard icon={TrendingUp} label="Applications sent" value={applied} color="bg-emerald-600" to="/saved" />
        <StatCard icon={Zap} label="Interviews active" value={interviewing} color="bg-amber-600" to="/saved" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Resume */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white text-sm">Latest Resume</h2>
            <Link to="/resume" className="text-xs text-brand-400 hover:text-brand-300">Manage →</Link>
          </div>
          {latestResume ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-600/10 rounded-lg">
                  <FileText size={18} className="text-brand-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{latestResume.filename}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(latestResume.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {latestResume.ats_score !== null && (
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">ATS Score</p>
                  <MatchScoreBar score={latestResume.ats_score} size="sm" />
                </div>
              )}
              {latestResume.parsed_data?.skills?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">Top Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {latestResume.parsed_data.skills.slice(0, 8).map(s => (
                      <span key={s} className="badge bg-brand-600/10 text-brand-400">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <FileText size={28} className="text-gray-700 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No resume uploaded yet</p>
              <Link to="/resume" className="text-xs text-brand-400 hover:text-brand-300 mt-1 inline-block">
                Upload your resume →
              </Link>
            </div>
          )}
        </div>

        {/* Application Pipeline */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white text-sm">Application Pipeline</h2>
            <Link to="/saved" className="text-xs text-brand-400 hover:text-brand-300">View board →</Link>
          </div>
          {savedJobs.length > 0 ? (
            <div className="space-y-3">
              {[
                { key: 'saved', label: 'Saved', color: 'bg-gray-600' },
                { key: 'applied', label: 'Applied', color: 'bg-blue-600' },
                { key: 'interviewing', label: 'Interviewing', color: 'bg-amber-500' },
                { key: 'offered', label: 'Offered', color: 'bg-emerald-500' },
              ].map(({ key, label, color }) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-24 shrink-0">{label}</span>
                  <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${color} transition-all`}
                      style={{ width: savedJobs.length > 0 ? `${(statusCounts[key] / savedJobs.length) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-4 text-right">{statusCounts[key]}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Bookmark size={28} className="text-gray-700 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No jobs saved yet</p>
              <Link to="/search" className="text-xs text-brand-400 hover:text-brand-300 mt-1 inline-block">
                Search for jobs →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
