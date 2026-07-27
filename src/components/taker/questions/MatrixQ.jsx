import { useRef } from 'react'
import { Check } from 'lucide-react'
import { shuffleArray } from '@/utils/shuffleArray'

export function MatrixQ({ question, value = {}, onChange }) {
  const cfg = question.matrixConfig
  const rowsRef = useRef(null)
  if (rowsRef.current === null) {
    rowsRef.current = cfg.randomizeRows ? shuffleArray(cfg.rows) : cfg.rows
  }
  const rows = rowsRef.current
  const toggle = (rowId, colId) => {
    if (cfg.subType === 'single') {
      onChange({ ...value, [rowId]: value[rowId] === colId ? null : colId })
    } else {
      const cur = value[rowId] || []
      onChange({ ...value, [rowId]: cur.includes(colId) ? cur.filter(c => c !== colId) : [...cur, colId] })
    }
  }
  const isSel = (rowId, colId) => cfg.subType === 'single' ? value[rowId] === colId : (value[rowId] || []).includes(colId)
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="text-left py-2 px-3 text-ink-500 font-medium min-w-[100px]" />
            {cfg.columns.map(col => <th key={col.id} className="px-3 py-2 text-center text-ink-600 font-medium border-b border-ink-100 min-w-[80px]">{col.text}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={row.id} className={`${ri % 2 === 0 ? 'bg-ink-50/50' : 'bg-white'} hover:bg-brand-50/20 transition-colors`}>
              <td className="px-3 py-2.5 text-ink-700 font-medium">{row.text}</td>
              {cfg.columns.map(col => {
                const sel = isSel(row.id, col.id)
                return (
                  <td key={col.id} className="px-3 py-2.5 text-center">
                    <button onClick={() => toggle(row.id, col.id)} className={`w-5 h-5 mx-auto rounded-${cfg.subType === 'single' ? 'full' : 'md'} border-2 flex items-center justify-center transition-all ${sel ? 'border-brand-500 bg-brand-500' : 'border-ink-300 hover:border-brand-400'}`}>
                      {sel && (cfg.subType === 'single' ? <div className="w-2 h-2 rounded-full bg-white" /> : <Check size={10} className="text-white" strokeWidth={3} />)}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
