import { useRef, useState } from 'react'
import { shuffleArray } from '@/utils/shuffleArray'

function buildTrials(cfg) {
  const items = [...(cfg.items || [])]
  const n     = items.length
  const k     = Math.min(cfg.itemsPerTrial || 4, n)
  if (n < 2 || k < 2) return []
  const numTrials = cfg.trialsPerRespondent || Math.max(3, Math.ceil(2 * n / k))
  // Build pool: repeat shuffled items until we have enough
  const pool = []
  while (pool.length < numTrials * k) pool.push(...shuffleArray(items))
  return Array.from({ length: numTrials }, (_, t) => pool.slice(t * k, t * k + k))
}

export function MaxDiffQ({ question, value = {}, onChange }) {
  const cfg     = question.maxDiffConfig
  const [trial, setTrial] = useState(0)
  // Generate trials once (stable across renders via ref)
  const trialsRef = useRef(null)
  if (!trialsRef.current) trialsRef.current = buildTrials(cfg)
  const trials = trialsRef.current

  if (!trials.length) return <p className="text-ink-400 text-sm italic">Add at least 2 items to preview this question.</p>

  const total        = trials.length
  const currentItems = trials[trial] || []
  const trialVal     = value[trial] || { best: null, worst: null }

  const selectBest = (id) => {
    const next = { ...trialVal, best: id === trialVal.best ? null : id }
    if (next.best === next.worst) next.worst = null
    onChange({ ...value, [trial]: next })
  }
  const selectWorst = (id) => {
    const next = { ...trialVal, worst: id === trialVal.worst ? null : id }
    if (next.worst === next.best) next.best = null
    onChange({ ...value, [trial]: next })
  }

  const allDone = Array.from({ length: total }, (_, i) => value[i]).every(t => t?.best && t?.worst)

  return (
    <div>
      {/* Progress */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-ink-500">Trial {trial + 1} of {total}</span>
        <div className="flex gap-1">
          {Array.from({ length: total }, (_, i) => {
            const t = value[i] || {}
            return (
              <button key={i} onClick={() => setTrial(i)}
                className={`w-5 h-5 rounded-full text-xs font-bold transition-all border-2 ${
                  i === trial ? 'border-brand-500 bg-brand-500 text-white' :
                  (t.best && t.worst) ? 'border-emerald-400 bg-emerald-400 text-white' :
                  'border-ink-200 text-ink-400'
                }`}
              >
                {i + 1}
              </button>
            )
          })}
        </div>
      </div>

      {/* Instruction */}
      {cfg.instruction && <p className="text-sm text-ink-500 mb-3 italic">{cfg.instruction}</p>}

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-2 sm:gap-x-4 mb-2 px-1 sm:px-2">
        <div />
        <span className="text-[10px] sm:text-xs font-bold text-emerald-600 text-center w-14 sm:w-20">{cfg.bestLabel}</span>
        <span className="text-[10px] sm:text-xs font-bold text-rose-600 text-center w-14 sm:w-20">{cfg.worstLabel}</span>
      </div>

      {/* Items */}
      <div className="space-y-1.5 border-2 border-ink-100 rounded-xl overflow-hidden">
        {currentItems.map((item, i) => {
          const isBest  = trialVal.best  === item.id
          const isWorst = trialVal.worst === item.id
          return (
            <div key={item.id} className={`grid grid-cols-[1fr_auto_auto] gap-x-2 sm:gap-x-4 items-center px-2 sm:px-4 py-2.5 sm:py-3 transition-colors ${
              isBest ? 'bg-emerald-50' : isWorst ? 'bg-rose-50' : i % 2 === 0 ? 'bg-white' : 'bg-ink-50/40'
            }`}>
              <span className="text-xs sm:text-sm text-ink-800 font-medium">{item.text}</span>
              <div className="w-14 sm:w-20 flex justify-center">
                <button onClick={() => selectBest(item.id)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    isBest ? 'border-emerald-500 bg-emerald-500' : isWorst ? 'border-ink-200 opacity-30 cursor-not-allowed' : 'border-ink-300 hover:border-emerald-400'
                  }`} disabled={isWorst}>
                  {isBest && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                </button>
              </div>
              <div className="w-14 sm:w-20 flex justify-center">
                <button onClick={() => selectWorst(item.id)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    isWorst ? 'border-rose-500 bg-rose-500' : isBest ? 'border-ink-200 opacity-30 cursor-not-allowed' : 'border-ink-300 hover:border-rose-400'
                  }`} disabled={isBest}>
                  {isWorst && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Trial navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-3">
        <button onClick={() => setTrial(t => Math.max(0, t - 1))} disabled={trial === 0}
          className="text-xs text-ink-500 hover:text-ink-700 disabled:opacity-30 flex items-center gap-1 self-start sm:self-auto">
          ← Previous
        </button>
        {!allDone && <span className="text-xs text-ink-400 text-center">Complete all trials before proceeding</span>}
        {allDone && <span className="text-xs text-emerald-600 font-semibold text-center">✓ All trials complete</span>}
        <button onClick={() => setTrial(t => Math.min(total - 1, t + 1))} disabled={trial === total - 1}
          className="text-xs text-ink-500 hover:text-ink-700 disabled:opacity-30 flex items-center gap-1 self-end sm:self-auto">
          Next →
        </button>
      </div>
    </div>
  )
}
