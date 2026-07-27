import {
  CheckCircle2, XCircle, Zap, GitBranch,
  ChevronRight, ChevronDown, SkipForward,
} from 'lucide-react'

export function BranchIcon({ type, size = 16 }) {
  if (type === 'complete')     return <CheckCircle2 size={size} className="text-emerald-500" />
  if (type === 'block')        return <Zap size={size} className="text-rose-500" />
  if (type.startsWith('terminate')) return <XCircle size={size} className="text-rose-400" />
  return <GitBranch size={size} className="text-ink-400" />
}

export function LogEntry({ entry }) {
  switch (entry.type) {
    case 'page':
      return (
        <div className="mb-3">
          <p className="text-xs font-bold text-ink-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <SkipForward size={11} /> {entry.label}
          </p>
          <div className="space-y-1 ml-4">
            {entry.items.map((item, i) => (
              <div key={i} className="flex items-baseline gap-2 text-xs">
                <span className="shrink-0 text-ink-400 font-mono w-6">Q{item.qNum}</span>
                <span className="text-ink-600 truncate max-w-[160px]">{item.text}</span>
                <ChevronRight size={10} className="text-ink-300 shrink-0" />
                <span className="text-brand-700 font-medium flex-1">{item.answer}</span>
              </div>
            ))}
          </div>
        </div>
      )
    case 'nav':
      return (
        <p className="text-xs text-ink-400 flex items-center gap-1.5 my-2">
          <ChevronDown size={11} /> {entry.label}
        </p>
      )
    case 'block-pass':
      return (
        <p className="text-xs text-emerald-600 flex items-center gap-1.5 my-1">
          <CheckCircle2 size={11} /> Block "{entry.label}" — conditions not met, continuing
        </p>
      )
    case 'terminate':
      return (
        <div className="mt-2 p-3 rounded-xl bg-rose-50 border border-rose-200">
          <p className="text-sm font-bold text-rose-700 flex items-center gap-1.5">
            <XCircle size={14} /> Screen-out triggered
          </p>
          <p className="text-xs text-rose-600 mt-1">At: {entry.source}</p>
          <p className="text-xs text-rose-500 mt-0.5 italic">{entry.reason}</p>
        </div>
      )
    case 'complete':
      return (
        <div className="mt-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
          <p className="text-sm font-bold text-emerald-700 flex items-center gap-1.5">
            <CheckCircle2 size={14} /> Survey completed
          </p>
          <p className="text-xs text-emerald-600 mt-1">All pages answered, no termination triggered.</p>
        </div>
      )
    default: return null
  }
}

export function AllResultsTable({ results }) {
  return (
    <div>
      <p className="text-xs font-bold text-ink-500 uppercase tracking-wider mb-3">All branches — results</p>
      <div className="space-y-2">
        {results.map(({ branch, outcome }) => (
          <div key={branch.id}
            className={`flex items-center gap-3 p-3 rounded-xl border ${
              outcome.type === 'complete'    ? 'border-emerald-200 bg-emerald-50' :
              outcome.type === 'terminated'  ? 'border-rose-200 bg-rose-50' :
                                              'border-ink-200 bg-ink-50'
            }`}
          >
            <BranchIcon type={outcome.type === 'complete' ? 'complete' : 'terminate-option'} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink-700 truncate">{branch.label}</p>
              <p className="text-xs text-ink-500">{outcome.reason || (outcome.type === 'complete' ? 'Completed ✓' : '—')}</p>
            </div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              outcome.type === 'complete' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}>
              {outcome.type === 'complete' ? 'Complete' : 'Screen-out'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
