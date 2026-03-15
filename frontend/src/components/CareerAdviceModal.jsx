import { useState } from 'react'
import { X, Loader2, Lightbulb, MessageSquare, Target, Copy, CheckCheck } from 'lucide-react'
import MatchScoreBar from './MatchScoreBar'
import { getCareerAdvice } from '../api/client'
import { useUser } from '../context/UserContext'
import toast from 'react-hot-toast'

export default function CareerAdviceModal({ job, resumeId, onClose }) {
  const [advice, setAdvice] = useState(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const fetchAdvice = async () => {
    setLoading(true)
    try {
      const res = await getCareerAdvice(resumeId, job.title, job.description || '')
      setAdvice(res.data)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const copyLetter = () => {
    navigator.clipboard.writeText(advice.cover_letter_draft)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-800">
          <div>
            <h2 className="font-semibold text-white">{job.title}</h2>
            <p className="text-sm text-gray-500">{job.company} · {job.location}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {!advice && !loading && (
            <div className="text-center py-8">
              <Target size={40} className="text-brand-500 mx-auto mb-3" />
              <p className="text-gray-400 text-sm mb-4">
                Get AI-powered analysis: ATS score, skill gaps, cover letter, and interview tips.
              </p>
              <button onClick={fetchAdvice} className="btn-primary">
                Analyze with Gemini AI
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-8">
              <Loader2 size={36} className="text-brand-500 mx-auto mb-3 animate-spin" />
              <p className="text-gray-400 text-sm">Generating personalized career advice...</p>
            </div>
          )}

          {advice && (
            <div className="space-y-5">
              {/* ATS Score */}
              <div className="card">
                <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">ATS Match Score</p>
                <MatchScoreBar score={advice.ats_score} />
              </div>

              {/* Skills */}
              <div className="grid grid-cols-2 gap-3">
                <div className="card">
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Matched Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {advice.matched_skills.length > 0
                      ? advice.matched_skills.map(s => (
                          <span key={s} className="badge bg-emerald-500/10 text-emerald-400">{s}</span>
                        ))
                      : <span className="text-xs text-gray-600">None identified</span>
                    }
                  </div>
                </div>
                <div className="card">
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Skill Gaps</p>
                  <div className="flex flex-wrap gap-1.5">
                    {advice.skill_gaps.length > 0
                      ? advice.skill_gaps.map(s => (
                          <span key={s} className="badge bg-red-500/10 text-red-400">{s}</span>
                        ))
                      : <span className="text-xs text-gray-600">None — great fit!</span>
                    }
                  </div>
                </div>
              </div>

              {/* Suggestions */}
              <div className="card">
                <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                  <Lightbulb size={12} /> Improvement Suggestions
                </p>
                <ul className="space-y-2">
                  {advice.improvement_suggestions.map((s, i) => (
                    <li key={i} className="text-sm text-gray-300 flex gap-2">
                      <span className="text-brand-500 shrink-0">→</span> {s}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Interview Tips */}
              <div className="card">
                <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare size={12} /> Interview Tips
                </p>
                <ul className="space-y-2">
                  {advice.interview_tips.map((t, i) => (
                    <li key={i} className="text-sm text-gray-300 flex gap-2">
                      <span className="text-emerald-500 shrink-0">{i + 1}.</span> {t}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Cover Letter */}
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Cover Letter Draft</p>
                  <button
                    onClick={copyLetter}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors"
                  >
                    {copied ? <CheckCheck size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <pre className="text-xs text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
                  {advice.cover_letter_draft}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
