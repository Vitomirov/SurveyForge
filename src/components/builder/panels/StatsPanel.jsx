import { QUESTION_TYPES, TYPE_COLORS, TYPE_ICONS } from '@/utils/questionHelpers'
import { BarChart3 } from 'lucide-react'

export function StatsPanel({ items }) {
  const questions   = items.filter(i => i.itemType === 'question')
  const pageBreaks  = items.filter(i => i.itemType === 'page_break')
  const groups      = items.filter(i => i.itemType === 'group')
  const required    = questions.filter(q => q.required).length
  const byType      = QUESTION_TYPES.map(qt => ({
    ...qt, count: questions.filter(q => q.questionType === qt.type).length,
  })).filter(qt => qt.count > 0)

  return (
    <div className="card p-4">
      <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <BarChart3 size={11} /> Survey Stats
      </p>
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between"><span className="text-ink-500">Questions</span><span className="font-bold text-ink-800">{questions.length}</span></div>
        <div className="flex justify-between"><span className="text-ink-500">Required</span><span className="font-semibold text-ink-700">{required}</span></div>
        <div className="flex justify-between"><span className="text-ink-500">Pages</span><span className="font-semibold text-ink-700">{pageBreaks.length + 1}</span></div>
        {groups.length > 0 && <div className="flex justify-between"><span className="text-ink-500">Groups</span><span className="font-semibold text-ink-700">{groups.length}</span></div>}
      </div>
      {byType.length > 0 && (
        <div className="mt-3 pt-3 border-t border-ink-100 space-y-1.5">
          {byType.map(qt => {
            const Icon = TYPE_ICONS[qt.type]
            const c    = TYPE_COLORS[qt.type]
            return (
              <div key={qt.type} className="flex items-center gap-2">
                <span className={`p-0.5 rounded ${c.bg} ${c.text}`}><Icon size={10} /></span>
                <span className="text-xs text-ink-500 flex-1">{qt.label}</span>
                <span className="text-xs font-semibold text-ink-700">{qt.count}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
