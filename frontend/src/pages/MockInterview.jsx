import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useUser } from '../context/UserContext'
import { listResumes, generateQuestions, evaluateAnswer } from '../api/client'
import { Mic, ChevronRight, RotateCcw, CheckCircle, Loader2, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const QUESTION_TYPES = [
  { key: 'technical',   label: 'Technical',   desc: 'Role-specific coding & system design' },
  { key: 'behavioral',  label: 'Behavioral',  desc: 'STAR-format experience questions' },
  { key: 'situational', label: 'Situational', desc: 'What would you do if...' },
  { key: 'hr',          label: 'HR Round',    desc: 'Motivation, salary, culture fit' },
]

const DIFFICULTY_COLOR = {
  easy:   'bg-emerald-500/10 text-emerald-400',
  medium: 'bg-yellow-500/10 text-yellow-400',
  hard:   'bg-red-500/10 text-red-400',
}

function ScoreBar({ score, outOf }) {
  const pct = (score / outOf) * 100
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-bold text-white">{score}/{outOf}</span>
    </div>
  )
}

export default function MockInterview() {
  const { user } = useUser()
  const [resumeId, setResumeId] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [jobDesc, setJobDesc] = useState('')
  const [qType, setQType] = useState('technical')
  const [questions, setQuestions] = useState([])
  const [currentQ, setCurrentQ] = useState(0)
  const [answer, setAnswer] = useState('')
  const [evaluations, setEvaluations] = useState({})
  const [phase, setPhase] = useState('setup') // setup | interview | results

  const { data: resumes = [] } = useQuery({
    queryKey: ['resumes', user?.id],
    queryFn: () => listResumes(user.id).then(r => r.data),
    enabled: !!user,
  })

  const generateMutation = useMutation({
    mutationFn: () => generateQuestions(Number(resumeId), jobTitle, jobDesc, qType, 5).then(r => r.data),
    onSuccess: (data) => {
      setQuestions(data)
      setCurrentQ(0)
      setEvaluations({})
      setAnswer('')
      setPhase('interview')
    },
    onError: (e) => toast.error(e.message),
  })

  const evaluateMutation = useMutation({
    mutationFn: () => evaluateAnswer(
      questions[currentQ].question,
      answer,
      jobTitle,
      questions[currentQ].ideal_answer_framework,
    ).then(r => r.data),
    onSuccess: (data) => {
      setEvaluations(prev => ({ ...prev, [currentQ]: data }))
    },
    onError: (e) => toast.error(e.message),
  })

  const nextQuestion = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1)
      setAnswer('')
    } else {
      setPhase('results')
    }
  }

  const avgScore = Object.values(evaluations).length > 0
    ? (Object.values(evaluations).reduce((s, e) => s + e.score, 0) / Object.values(evaluations).length).toFixed(1)
    : null

  // ── Setup Screen ─────────────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white">Mock Interview</h1>
          <p className="text-gray-500 text-sm mt-1">AI-powered interview prep tailored to your resume and target role.</p>
        </div>

        <div className="card space-y-5">
          {/* Resume selector */}
          <div>
            <label className="label">Your Resume</label>
            <select className="input" value={resumeId} onChange={e => setResumeId(e.target.value)}>
              <option value="">Select a resume...</option>
              {resumes.map(r => <option key={r.id} value={r.id}>{r.filename}</option>)}
            </select>
          </div>

          {/* Job title */}
          <div>
            <label className="label">Target Job Title</label>
            <input
              className="input"
              placeholder="e.g. Backend Engineer, Data Scientist"
              value={jobTitle}
              onChange={e => setJobTitle(e.target.value)}
            />
          </div>

          {/* Job description (optional) */}
          <div>
            <label className="label">Job Description <span className="text-gray-600">(optional)</span></label>
            <textarea
              className="input min-h-24 resize-none"
              placeholder="Paste the job description for more targeted questions..."
              value={jobDesc}
              onChange={e => setJobDesc(e.target.value)}
            />
          </div>

          {/* Question type */}
          <div>
            <label className="label">Question Type</label>
            <div className="grid grid-cols-2 gap-2">
              {QUESTION_TYPES.map(qt => (
                <button
                  key={qt.key}
                  onClick={() => setQType(qt.key)}
                  className={clsx(
                    'text-left p-3 rounded-xl border transition-colors',
                    qType === qt.key
                      ? 'border-brand-500 bg-brand-600/10'
                      : 'border-gray-700 hover:border-gray-600'
                  )}
                >
                  <p className="text-sm font-medium text-white">{qt.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{qt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => generateMutation.mutate()}
            disabled={!resumeId || !jobTitle.trim() || generateMutation.isPending}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {generateMutation.isPending
              ? <><Loader2 size={16} className="animate-spin" /> Generating questions...</>
              : <><Mic size={16} /> Start Interview</>
            }
          </button>
        </div>
      </div>
    )
  }

  // ── Results Screen ────────────────────────────────────────────────────────
  if (phase === 'results') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Interview Complete</h1>
            <p className="text-gray-500 text-sm">{jobTitle} · {QUESTION_TYPES.find(q => q.key === qType)?.label}</p>
          </div>
          <button onClick={() => setPhase('setup')} className="btn-secondary flex items-center gap-2 text-sm">
            <RotateCcw size={14} /> New Session
          </button>
        </div>

        {/* Overall score */}
        <div className="card mb-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Overall Performance</p>
          <div className="flex items-center gap-4 mb-3">
            <div className="text-4xl font-bold text-white">{avgScore ?? '—'}</div>
            <div className="flex-1">
              {avgScore && <ScoreBar score={parseFloat(avgScore)} outOf={10} />}
              <p className="text-xs text-gray-500 mt-1">
                {Object.keys(evaluations).length} of {questions.length} questions evaluated
              </p>
            </div>
          </div>
        </div>

        {/* Per-question breakdown */}
        <div className="space-y-4">
          {questions.map((q, i) => {
            const ev = evaluations[i]
            return (
              <div key={i} className="card">
                <div className="flex items-start gap-2 mb-3">
                  <span className={clsx('badge shrink-0', DIFFICULTY_COLOR[q.difficulty] || 'bg-gray-700 text-gray-300')}>
                    {q.difficulty}
                  </span>
                  <p className="text-sm text-white leading-relaxed">{q.question}</p>
                </div>
                {ev ? (
                  <div className="space-y-3">
                    <ScoreBar score={ev.score} outOf={ev.score_out_of} />
                    <p className="text-xs text-gray-400 italic">"{ev.verdict}"</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-emerald-400 font-medium mb-1">Strengths</p>
                        {ev.strengths.map((s, j) => <p key={j} className="text-gray-400">• {s}</p>)}
                      </div>
                      <div>
                        <p className="text-yellow-400 font-medium mb-1">Improve</p>
                        {ev.improvements.map((s, j) => <p key={j} className="text-gray-400">• {s}</p>)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-600">Not answered</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Interview Screen ──────────────────────────────────────────────────────
  const q = questions[currentQ]
  const ev = evaluations[currentQ]

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Progress */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Question {currentQ + 1} of {questions.length}</h1>
          <p className="text-gray-500 text-sm">{jobTitle}</p>
        </div>
        <div className="flex gap-1">
          {questions.map((_, i) => (
            <div
              key={i}
              className={clsx(
                'w-2 h-2 rounded-full transition-colors',
                i < currentQ ? 'bg-brand-500' : i === currentQ ? 'bg-white' : 'bg-gray-700'
              )}
            />
          ))}
        </div>
      </div>

      {/* Question card */}
      <div className="card mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className={clsx('badge', DIFFICULTY_COLOR[q.difficulty] || 'bg-gray-700 text-gray-300')}>
            {q.difficulty}
          </span>
          <span className="badge bg-gray-700 text-gray-300">
            {QUESTION_TYPES.find(qt => qt.key === qType)?.label}
          </span>
        </div>
        <p className="text-white font-medium leading-relaxed">{q.question}</p>
      </div>

      {/* Answer input */}
      {!ev && (
        <div className="card mb-4">
          <label className="label">Your Answer</label>
          <textarea
            className="input min-h-36 resize-none mb-3"
            placeholder="Type your answer here... Be specific and use examples."
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            disabled={evaluateMutation.isPending}
          />
          <button
            onClick={() => evaluateMutation.mutate()}
            disabled={answer.trim().length < 20 || evaluateMutation.isPending}
            className="btn-primary flex items-center gap-2"
          >
            {evaluateMutation.isPending
              ? <><Loader2 size={15} className="animate-spin" /> Evaluating...</>
              : <><Star size={15} /> Submit & Evaluate</>
            }
          </button>
        </div>
      )}

      {/* Evaluation result */}
      {ev && (
        <div className="card mb-4 space-y-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Score</p>
            <ScoreBar score={ev.score} outOf={ev.score_out_of} />
            <p className="text-sm text-gray-400 mt-2 italic">"{ev.verdict}"</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-emerald-400 font-medium mb-2 uppercase tracking-wider">Strengths</p>
              {ev.strengths.map((s, i) => (
                <p key={i} className="text-xs text-gray-400 mb-1 flex gap-1.5">
                  <CheckCircle size={11} className="text-emerald-500 mt-0.5 shrink-0" /> {s}
                </p>
              ))}
            </div>
            <div>
              <p className="text-xs text-yellow-400 font-medium mb-2 uppercase tracking-wider">Improve</p>
              {ev.improvements.map((s, i) => (
                <p key={i} className="text-xs text-gray-400 mb-1 flex gap-1.5">
                  <ChevronRight size={11} className="text-yellow-500 mt-0.5 shrink-0" /> {s}
                </p>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Stronger Answer</p>
            <p className="text-xs text-gray-300 leading-relaxed bg-gray-800 rounded-lg p-3">
              {ev.sample_better_answer}
            </p>
          </div>

          <button onClick={nextQuestion} className="btn-primary w-full flex items-center justify-center gap-2">
            {currentQ < questions.length - 1
              ? <><ChevronRight size={15} /> Next Question</>
              : <><CheckCircle size={15} /> View Results</>
            }
          </button>
        </div>
      )}
    </div>
  )
}
