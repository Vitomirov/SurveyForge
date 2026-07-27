import { QUESTION_TYPES, TYPE_COLORS, TYPE_ICONS, QUESTION_TYPE_GROUPS } from '@/utils/questionHelpers'
import { Scissors, FolderPlus, FileText, Zap } from 'lucide-react'

export function AddPanel({ onAddQuestion, onAddPageBreak, onAddGroup, onAddTerminationBlock, onAddTextBlock }) {
  const groups = QUESTION_TYPE_GROUPS
  return (
    <div className="card p-4 space-y-4">
      {groups.map(grp => {
        const types = QUESTION_TYPES.filter(qt => qt.group === grp)
        return (
          <div key={grp}>
            <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">{grp}</p>
            <div className="space-y-1">
              {types.map(qt => {
                const Icon = TYPE_ICONS[qt.type]
                const c    = TYPE_COLORS[qt.type]
                return (
                  <button
                    key={qt.type}
                    onClick={() => onAddQuestion(qt.type)}
                    className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-ink-50 transition-all text-left group border border-transparent hover:border-ink-100"
                  >
                    <span className={`p-1.5 rounded-lg ${c.bg} ${c.text} group-hover:scale-110 transition-transform`}>
                      <Icon size={13} />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-ink-700 leading-none">{qt.label}</p>
                      <p className="text-xs text-ink-400 mt-0.5">{qt.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      <div className="border-t border-ink-100 pt-3 space-y-1">
        <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">Structure</p>
        <button
          onClick={onAddPageBreak}
          className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-ink-50 transition-all text-left border border-transparent hover:border-ink-100"
        >
          <span className="p-1.5 rounded-lg bg-ink-100 text-ink-500"><Scissors size={13} /></span>
          <div>
            <p className="text-sm font-medium text-ink-700">Page Break</p>
            <p className="text-xs text-ink-400">Start a new page</p>
          </div>
        </button>
        <button
          onClick={onAddGroup}
          className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-ink-50 transition-all text-left border border-transparent hover:border-ink-100"
        >
          <span className="p-1.5 rounded-lg bg-ink-800 text-ink-200"><FolderPlus size={13} /></span>
          <div>
            <p className="text-sm font-medium text-ink-700">Question Group</p>
            <p className="text-xs text-ink-400">Bundle questions together</p>
          </div>
        </button>
        <button
          onClick={onAddTextBlock}
          className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-emerald-50 transition-all text-left border border-transparent hover:border-emerald-100"
        >
          <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600"><FileText size={13} /></span>
          <div>
            <p className="text-sm font-medium text-ink-700">Text / Media</p>
            <p className="text-xs text-ink-400">Rich text, instructions or images</p>
          </div>
        </button>
        <button
          onClick={onAddTerminationBlock}
          className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-rose-50 transition-all text-left border border-transparent hover:border-rose-100"
        >
          <span className="p-1.5 rounded-lg bg-rose-600 text-white"><Zap size={13} /></span>
          <div>
            <p className="text-sm font-medium text-ink-700">Termination Block</p>
            <p className="text-xs text-ink-400">Multi-condition screen-out logic</p>
          </div>
        </button>
      </div>
    </div>
  )
}
