import clsx from 'clsx'

export default function MatchScoreBar({ score, size = 'md' }) {
  if (score === null || score === undefined) return null

  const color =
    score >= 70 ? 'bg-emerald-500' :
    score >= 45 ? 'bg-yellow-500' :
    'bg-red-500'

  const textColor =
    score >= 70 ? 'text-emerald-400' :
    score >= 45 ? 'text-yellow-400' :
    'text-red-400'

  const label =
    score >= 70 ? 'Strong Match' :
    score >= 45 ? 'Partial Match' :
    'Low Match'

  return (
    <div className={clsx('w-full', size === 'sm' ? 'space-y-0.5' : 'space-y-1')}>
      <div className="flex justify-between items-center">
        <span className={clsx('font-semibold', textColor, size === 'sm' ? 'text-xs' : 'text-sm')}>
          {score.toFixed(0)}% — {label}
        </span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
    </div>
  )
}
