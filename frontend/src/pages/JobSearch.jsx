import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useUser } from '../context/UserContext'
import { searchJobs, saveJob, listResumes } from '../api/client'
import JobCard from '../components/JobCard'
import CareerAdviceModal from '../components/CareerAdviceModal'
import { Search, MapPin, Loader2, SlidersHorizontal } from 'lucide-react'
import toast from 'react-hot-toast'

const INDIAN_CITIES = ['India', 'Bengaluru', 'Mumbai', 'Hyderabad', 'Pune', 'Chennai', 'Delhi NCR', 'Noida', 'Gurugram']

export default function JobSearch() {
  const { user } = useUser()
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('India')
  const [selectedResumeId, setSelectedResumeId] = useState(null)
  const [savedIds, setSavedIds] = useState(new Set())
  const [adviceJob, setAdviceJob] = useState(null)
  const [results, setResults] = useState(null)

  const { data: resumes = [] } = useQuery({
    queryKey: ['resumes', user?.id],
    queryFn: () => listResumes(user.id).then(r => r.data),
    enabled: !!user,
  })

  const searchMutation = useMutation({
    mutationFn: () => searchJobs(query, location, 20, selectedResumeId).then(r => r.data),
    onSuccess: (data) => setResults(data),
    onError: (e) => toast.error(e.message),
  })

  const saveMutation = useMutation({
    mutationFn: (job) => saveJob({
      job_external_id: job.external_id,
      title: job.title,
      company: job.company,
      location: job.location,
      description: job.description,
      salary_min: job.salary_min,
      salary_max: job.salary_max,
      job_url: job.job_url,
      match_score: job.match_score,
      resume_id: selectedResumeId,
    }, user.id),
    onSuccess: (_, job) => {
      setSavedIds(prev => new Set([...prev, job.external_id]))
      toast.success('Job saved to your board!')
    },
    onError: (e) => toast.error(e.message),
  })

  const handleSearch = (e) => {
    e.preventDefault()
    if (!query.trim()) return
    searchMutation.mutate()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Search Jobs</h1>
        <p className="text-gray-500 text-sm mt-1">
          {selectedResumeId ? '✨ Results ranked by your resume match score' : 'Select a resume to get AI-ranked results'}
        </p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="card mb-6">
        <div className="flex flex-wrap gap-3">
          {/* Query */}
          <div className="flex-1 min-w-48 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              className="input pl-9"
              placeholder="Job title, skill, or keyword..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>

          {/* Location */}
          <div className="relative min-w-36">
            <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <select
              className="input pl-9 pr-4 appearance-none"
              value={location}
              onChange={e => setLocation(e.target.value)}
            >
              {INDIAN_CITIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Resume for ranking */}
          {resumes.length > 0 && (
            <div className="relative min-w-44">
              <SlidersHorizontal size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <select
                className="input pl-9 pr-4 appearance-none"
                value={selectedResumeId || ''}
                onChange={e => setSelectedResumeId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Rank by resume</option>
                {resumes.map(r => (
                  <option key={r.id} value={r.id}>{r.filename}</option>
                ))}
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={searchMutation.isPending || !query.trim()}
            className="btn-primary flex items-center gap-2 px-6"
          >
            {searchMutation.isPending
              ? <><Loader2 size={15} className="animate-spin" /> Searching...</>
              : <><Search size={15} /> Search</>
            }
          </button>
        </div>
      </form>

      {/* Results */}
      {results && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-400">
              <span className="text-white font-medium">{results.total}</span> jobs found for "{results.query}"
              {selectedResumeId && <span className="text-brand-400"> · Ranked by match</span>}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {results.jobs.map((job) => (
              <JobCard
                key={job.external_id}
                job={job}
                onSave={saveMutation.mutate}
                onAdvice={selectedResumeId ? setAdviceJob : null}
                saved={savedIds.has(job.external_id)}
              />
            ))}
          </div>
        </div>
      )}

      {!results && !searchMutation.isPending && (
        <div className="text-center py-20 text-gray-600">
          <Search size={40} className="mx-auto mb-3" />
          <p>Search for jobs above to get started</p>
        </div>
      )}

      {/* Career Advice Modal */}
      {adviceJob && (
        <CareerAdviceModal
          job={adviceJob}
          resumeId={selectedResumeId}
          onClose={() => setAdviceJob(null)}
        />
      )}
    </div>
  )
}
