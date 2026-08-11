import { Check } from 'lucide-react'

export function BipolarMatrixQ({ question, value = {}, onChange }) {
  const cfg = question.bipolarConfig
  const toggle = (rowId, colId, side) => {
    const rv = value[rowId] || { left: null, center: null, right: null }
    if (side === 'left') {
      if (cfg.leftSelectType === 'single') onChange({ ...value, [rowId]: { ...rv, left: rv.left === colId ? null : colId } })
      else { const a = rv.left || []; onChange({ ...value, [rowId]: { ...rv, left: a.includes(colId) ? a.filter(c=>c!==colId) : [...a,colId] } }) }
    } else if (side === 'center') {
      onChange({ ...value, [rowId]: { ...rv, center: rv.center === colId ? null : colId } })
    } else {
      if (cfg.rightSelectType === 'single') onChange({ ...value, [rowId]: { ...rv, right: rv.right === colId ? null : colId } })
      else { const a = rv.right || []; onChange({ ...value, [rowId]: { ...rv, right: a.includes(colId) ? a.filter(c=>c!==colId) : [...a,colId] } }) }
    }
  }
  const isSel = (rowId, colId, side) => {
    const rv = value[rowId]; if (!rv) return false
    if (side === 'left')   return Array.isArray(rv.left)  ? rv.left.includes(colId)  : rv.left === colId
    if (side === 'center') return rv.center === colId
    return Array.isArray(rv.right) ? rv.right.includes(colId) : rv.right === colId
  }
  const Cell = ({ rowId, colId, side, isMulti }) => {
    const sel = isSel(rowId, colId, side)
    const clr = side === 'left' ? (sel ? 'border-rose-500 bg-rose-500' : 'border-rose-200 hover:border-rose-400') : (sel ? 'border-brand-500 bg-brand-500' : 'border-brand-200 hover:border-brand-400')
    return (
      <td className="px-2 py-2.5 text-center">
        <button onClick={() => toggle(rowId, colId, side)} className={`w-4 h-4 mx-auto rounded-${isMulti?'md':'full'} border-2 flex items-center justify-center transition-all ${clr}`}>
          {sel && (isMulti ? <Check size={8} className="text-white" strokeWidth={3} /> : <div className="w-1.5 h-1.5 rounded-full bg-white" />)}
        </button>
      </td>
    )
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th />
            <th colSpan={cfg.leftColumns.length} className="text-center text-rose-600 font-semibold py-1 bg-rose-50">{cfg.leftLabel||'Left'}</th>
            {cfg.showCenter && <th className="bg-ink-100 text-ink-500 px-2">{cfg.centerLabel}</th>}
            <th colSpan={cfg.rightColumns.length} className="text-center text-brand-600 font-semibold py-1 bg-brand-50">{cfg.rightLabel||'Right'}</th>
          </tr>
          <tr>
            <th className="text-left px-3 py-1.5 min-w-[100px] text-ink-400" />
            {cfg.leftColumns.map(c=><th key={c.id} className="px-2 py-1.5 text-center text-ink-600 border-b border-rose-100 bg-rose-50/40">{c.text}</th>)}
            {cfg.showCenter && <th className="px-2 py-1.5 text-center border-b border-ink-200 bg-ink-50">{cfg.centerLabel}</th>}
            {cfg.rightColumns.map(c=><th key={c.id} className="px-2 py-1.5 text-center text-ink-600 border-b border-brand-100 bg-brand-50/40">{c.text}</th>)}
          </tr>
        </thead>
        <tbody>
          {cfg.rows.map((row,ri)=>(
            <tr key={row.id} className={ri%2===0?'bg-white':'bg-ink-50/40'}>
              <td className="px-3 py-2 text-ink-700 font-medium">{row.text}</td>
              {cfg.leftColumns.map(c=><Cell key={c.id} rowId={row.id} colId={c.id} side="left" isMulti={cfg.leftSelectType==='multi'} />)}
              {cfg.showCenter && <Cell key="center" rowId={row.id} colId="center" side="center" isMulti={false} />}
              {cfg.rightColumns.map(c=><Cell key={c.id} rowId={row.id} colId={c.id} side="right" isMulti={cfg.rightSelectType==='multi'} />)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default BipolarMatrixQ
