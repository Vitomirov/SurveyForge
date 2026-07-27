import React, { useState, useMemo, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, Check, UserX, Zap, Download, Fingerprint } from 'lucide-react'
import {
  DndContext as SortDndContext, DragOverlay as SortDragOverlay,
  useDraggable, useDroppable,
  PointerSensor as SortPointerSensor,
  useSensor as useSortSensor, useSensors as useSortSensors,
} from '@dnd-kit/core'
import { isChoiceType } from '../utils/questionHelpers.js'
import { buildVisiblePages, isItemVisible } from '../utils/visibilityEngine.js'
import { resolvePipingTokens, buildPipedOptions } from '../utils/piping.js'
import { generateCSV, downloadCSV } from '../utils/csvExport.js'
import { saveResponse, newResponseId } from '../utils/responseStore.js'
import { collectFingerprint } from '../utils/fingerprint.js'
import { isOnDNCList } from '../utils/dncStore.js'

// ─── Termination block evaluator ───────────────────────────────────────────
function evalCondition(cond, responses, allItems) {
  const q      = allItems.find(i => i.id === cond.questionId)
  const answer = responses[cond.questionId]
  if (!q || answer === undefined || answer === null || answer === '') return false

  const isChoice = ['single_select', 'multi_select', 'dropdown'].includes(q.questionType)

  if (isChoice) {
    const selected = Array.isArray(answer) ? answer : [answer]
    const ids = cond.optionIds || []
    switch (cond.conditionType) {
      case 'any_of': return ids.some(id => selected.includes(id))
      case 'none_of': return ids.length > 0 && !ids.some(id => selected.includes(id))
      case 'all_of':  return ids.length > 0 && ids.every(id => selected.includes(id))
      default: return false
    }
  }

  // text-based
  const hay    = String(answer).toLowerCase().trim()
  const needle = String(cond.textValue || '').toLowerCase().trim()
  switch (cond.textOperator) {
    case 'contains':     return hay.includes(needle)
    case 'not_contains': return !hay.includes(needle)
    case 'equals':       return hay === needle
    case 'not_equals':   return hay !== needle
    case 'greater_than': { const n = parseFloat(answer); return !isNaN(n) && n > parseFloat(cond.textValue) }
    case 'less_than':    { const n = parseFloat(answer); return !isNaN(n) && n < parseFloat(cond.textValue) }
    default: return false
  }
}

// AND has higher precedence than OR: A AND B OR C = (A AND B) OR C
function evalBlock(block, responses, allItems) {
  const conds = block.conditions || []
  if (!conds.length) return false

  // Split into OR-separated groups (each group is AND-connected)
  const orGroups = [[]]
  for (const c of conds) {
    if (c.join === 'OR') orGroups.push([c])
    else orGroups[orGroups.length - 1].push(c)
  }
  return orGroups.some(g => g.length > 0 && g.every(c => evalCondition(c, responses, allItems)))
}

// ─── Rule evaluator ────────────────────────────────────────────────────────
function evaluateRule(rule, question, answer) {
  const ruleType = rule.ruleType || 'choice'

  if (ruleType === 'text') {
    if (answer === null || answer === undefined || answer === '') return false
    const haystack = String(answer).toLowerCase().trim()
    const needle   = String(rule.textValue || '').toLowerCase().trim()
    switch (rule.textOperator) {
      case 'contains':     return haystack.includes(needle)
      case 'not_contains': return !haystack.includes(needle)
      case 'equals':       return haystack === needle
      case 'not_equals':   return haystack !== needle
      case 'greater_than': { const n = parseFloat(answer); return !isNaN(n) && n > parseFloat(rule.textValue) }
      case 'less_than':    { const n = parseFloat(answer); return !isNaN(n) && n < parseFloat(rule.textValue) }
      default: return false
    }
  }

  // choice rule
  const qType = question.questionType
  if (qType === 'single_select' || qType === 'dropdown') {
    if (!answer) return false
    // matchMode 'any' = fire if selected option is among optionIds
    // matchMode 'all' is the same for single (only 1 selection possible)
    return rule.optionIds.includes(answer)
  }
  if (qType === 'multi_select') {
    const selected = Array.isArray(answer) ? answer : []
    if (!selected.length) return false
    if (rule.matchMode === 'all') {
      return rule.optionIds.length > 0 && rule.optionIds.every(id => selected.includes(id))
    }
    // 'any': fire if at least one of optionIds is selected
    return rule.optionIds.some(id => selected.includes(id))
  }
  return false
}

// Returns { terminated: boolean, cause: string }
function checkTermination(question, answer) {
  const qType  = question.questionType
  const opts   = question.options || []

  // ── 1. Per-option instant terminate (always if_any semantics, fires immediately) ──
  if (isChoiceType(qType)) {
    if (qType === 'single_select' || qType === 'dropdown') {
      if (answer) {
        const opt = opts.find(o => o.id === answer)
        if (opt?.terminates) return { terminated: true, cause: opt.text }
      }
    } else if (qType === 'multi_select') {
      const selected = Array.isArray(answer) ? answer : []
      const termOpt  = opts.find(o => selected.includes(o.id) && o.terminates)
      if (termOpt) return { terminated: true, cause: termOpt.text }
    }
  }

  // ── 2. terminationRules evaluated with terminationLogic ──────────────────
  const rules = question.terminationRules || []
  if (!rules.length) return { terminated: false }

  const logic   = question.terminationLogic || 'if_any'
  const results = rules.map(r => evaluateRule(r, question, answer))

  if (logic === 'if_any') {
    const idx = results.findIndex(r => r)
    if (idx === -1) return { terminated: false }
    const firedRule = rules[idx]
    return {
      terminated: true,
      cause: firedRule.note || (
        firedRule.ruleType === 'text'
          ? `Answer ${firedRule.textOperator?.replace(/_/g,' ')} "${firedRule.textValue}"`
          : `Rule ${idx + 1} matched`
      ),
    }
  } else {
    // if_none: terminate when no rule fires (respondent doesn't qualify)
    if (results.every(r => !r)) {
      return { terminated: true, cause: 'No qualifying condition met' }
    }
    return { terminated: false }
  }
}

// ─── Validation ────────────────────────────────────────────────────────────
function validateAnswer(question, answer) {
  if (question.required && (answer === null || answer === undefined || answer === '' ||
    (Array.isArray(answer) && answer.length === 0))) {
    return 'This question is required.'
  }
  if (question.questionType === 'open_text' && answer) {
    const v = question.openTextConfig?.validation
    if (v?.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answer))
      return 'Please enter a valid email address (e.g. name@example.com).'
    if (v?.type === 'url') {
      try { new URL(answer) } catch { return 'Please enter a valid URL (e.g. https://example.com).' }
    }
    if (v?.type === 'number') {
      const n = parseFloat(answer)
      if (isNaN(n)) return 'Please enter a number.'
      if (v.numberMin != null && n < v.numberMin) return `Value must be at least ${v.numberMin}.`
      if (v.numberMax != null && n > v.numberMax) return `Value must be at most ${v.numberMax}.`
    }
    const cfg = question.openTextConfig
    if (cfg?.minLength && answer.length < cfg.minLength) return `Minimum ${cfg.minLength} characters required.`
    if (cfg?.maxLength && answer.length > cfg.maxLength) return `Maximum ${cfg.maxLength} characters allowed.`
  }
  if (question.questionType === 'multi_select' && Array.isArray(answer)) {
    if (question.minSelections && answer.length < question.minSelections)
      return `Please select at least ${question.minSelections} option(s).`
    if (question.maxSelections && answer.length > question.maxSelections)
      return `Please select no more than ${question.maxSelections} option(s).`
  }
  if (question.questionType === 'slider') {
    if (question.required && (answer === null || answer === undefined)) {
      return 'Please move the slider to record your answer.'
    }
  }
  if (question.questionType === 'constant_sum') {
    const cfg   = question.constantSumConfig
    const items = cfg?.items || []
    const vals  = answer || {}
    const empty = items.filter(i => vals[i.id] === '' || vals[i.id] === undefined || vals[i.id] === null)
    if (empty.length) return `Please fill in all ${items.length} fields.`
    const hasNeg = items.some(i => parseFloat(vals[i.id]) < 0)
    if (hasNeg) return 'Values cannot be negative.'
    const sum  = items.reduce((a, i) => a + (parseFloat(vals[i.id]) || 0), 0)
    const diff = Math.abs(sum - cfg.targetSum)
    if (diff > 0.01) {
      const unit = cfg.unit ? ' ' + cfg.unit : ''
      return `Values must total ${cfg.targetSum}${unit}. Current total: ${sum.toFixed(cfg.allowDecimals ? 1 : 0)}${unit}.`
    }
  }
  if (question.questionType === 'nps') {
    if (question.required && (answer === null || answer === undefined))
      return 'Please select a score from 0 to 10.'
  }
  if (question.questionType === 'star_rating') {
    if (question.required && (answer === null || answer === undefined))
      return 'Please select a rating.'
  }
  if (question.questionType === 'ranking') {
    const cfg    = question.rankingConfig
    const rankAll = cfg?.rankAll !== false
    const topN   = rankAll ? (cfg?.items?.length || 0) : (cfg?.topN || 3)
    const placed  = Array.isArray(answer) ? answer.length : 0
    if (question.required && placed < topN)
      return `Please rank all ${topN} item${topN !== 1 ? 's' : ''} (${placed} of ${topN} placed).`
  }
  if (question.questionType === 'textbox_list') {
    if (question.required) {
      const cfg   = question.textboxListConfig
      const vals  = answer || {}
      const empty = (cfg?.rows || []).filter(r => !vals[r.id]?.trim())
      if (empty.length === cfg?.rows?.length) return 'Please fill in at least one field.'
    }
  }
  if (question.questionType === 'semantic_diff') {
    if (question.required) {
      const cfg      = question.semanticDiffConfig
      const vals     = answer || {}
      const unanswered = (cfg?.rows || []).filter(r => vals[r.id] == null && cfg?.defaultValue == null)
      if (unanswered.length > 0)
        return `Please respond to all ${cfg?.rows?.length} scales (${unanswered.length} remaining).`
    }
  }
  if (question.questionType === 'cascade') {
    if (question.required) {
      if (!answer?.l1) return 'Please select an option from all dropdowns.'
    }
  }
  if (question.questionType === 'image_choice_single') {
    if (question.required && !answer) return 'Please select an image.'
  }
  if (question.questionType === 'image_choice_multi') {
    if (question.required && (!Array.isArray(answer) || answer.length === 0))
      return 'Please select at least one image.'
  }
  return null
}

// ─── Question renderers ────────────────────────────────────────────────────
function SingleSelectQ({ question, value, onChange, companions = {}, onCompanionChange }) {
  if (!question.options?.length) {
    return <p className="text-sm text-ink-400 italic p-3 border border-dashed border-ink-200 rounded-xl">Options will appear here once the source question is answered.</p>
  }
  return (
    <div className="space-y-2">
      {question.options.map(opt => {
        const selected = value === opt.id
        return (
          <div key={opt.id}>
            <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${selected ? 'border-brand-500 bg-brand-50' : 'border-ink-200 hover:border-ink-300 bg-white'}`}>
              <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${selected ? 'border-brand-500 bg-brand-500' : 'border-ink-300'}`}>
                {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <span className="text-sm text-ink-800 flex-1">{opt.text}</span>
              <input type="radio" className="sr-only" checked={selected} onChange={() => onChange(opt.id)} />
            </label>
            {selected && opt.openText?.enabled && (
              <div className="mt-1.5 ml-7">
                <input
                  type="text"
                  value={companions[opt.id] || ''}
                  onChange={e => onCompanionChange?.(opt.id, e.target.value)}
                  placeholder={opt.openText.placeholder || 'Please specify...'}
                  className="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function MultiSelectQ({ question, value = [], onChange, companions = {}, onCompanionChange }) {
  const toggle = (optId, isExclusive) => {
    if (isExclusive) { onChange(value.includes(optId) ? [] : [optId]); return }
    const exclusiveIds = question.options.filter(o => o.isExclusive).map(o => o.id)
    const filtered = value.filter(id => !exclusiveIds.includes(id))
    onChange(filtered.includes(optId) ? filtered.filter(id => id !== optId) : [...filtered, optId])
  }
  return (
    <div className="space-y-2">
      {question.options.map(opt => {
        const selected = value.includes(opt.id)
        return (
          <div key={opt.id}>
            <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${selected ? 'border-brand-500 bg-brand-50' : 'border-ink-200 hover:border-ink-300 bg-white'}`}>
              <div className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-all ${selected ? 'border-brand-500 bg-brand-500' : 'border-ink-300'}`}>
                {selected && <Check size={10} className="text-white" strokeWidth={3} />}
              </div>
              <span className="text-sm text-ink-800 flex-1">{opt.text}</span>
              {opt.isExclusive && <span className="text-xs text-rose-500 shrink-0">Exclusive</span>}
              <input type="checkbox" className="sr-only" checked={selected} onChange={() => toggle(opt.id, opt.isExclusive)} />
            </label>
            {selected && opt.openText?.enabled && (
              <div className="mt-1.5 ml-7">
                <input
                  type="text"
                  value={companions[opt.id] || ''}
                  onChange={e => onCompanionChange?.(opt.id, e.target.value)}
                  placeholder={opt.openText.placeholder || 'Please specify...'}
                  className="w-full border border-ink-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
            )}
          </div>
        )
      })}
      {(question.minSelections || question.maxSelections) && (
        <p className="text-xs text-ink-400 mt-1">{question.minSelections && `Min ${question.minSelections}`}{question.minSelections && question.maxSelections ? ' · ' : ''}{question.maxSelections && `Max ${question.maxSelections}`} selection(s)</p>
      )}
    </div>
  )
}

function DropdownQ({ question, value, onChange }) {
  return (
    <select value={value || ''} onChange={e => onChange(e.target.value || null)} className="w-full border-2 border-ink-200 rounded-xl px-4 py-3 text-sm text-ink-800 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 cursor-pointer">
      <option value="">— Select an option —</option>
      {question.options.map(opt => <option key={opt.id} value={opt.id}>{opt.text}</option>)}
    </select>
  )
}

function OpenTextQ({ question, value = '', onChange }) {
  const cfg = question.openTextConfig
  const v   = cfg?.validation
  return (
    <div>
      {cfg?.multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={cfg.placeholder || 'Type your answer...'} rows={4} className="w-full border-2 border-ink-200 rounded-xl px-4 py-3 text-sm text-ink-800 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none" />
        : <input type={v?.type === 'number' ? 'number' : v?.type === 'email' ? 'email' : v?.type === 'url' ? 'url' : 'text'} value={value} onChange={e => onChange(e.target.value)} placeholder={cfg?.placeholder || 'Type your answer...'} min={v?.numberMin ?? undefined} max={v?.numberMax ?? undefined} className="w-full border-2 border-ink-200 rounded-xl px-4 py-3 text-sm text-ink-800 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400" />
      }
      {cfg?.maxLength && <p className="text-xs text-ink-400 text-right mt-1">{value.length} / {cfg.maxLength}</p>}
    </div>
  )
}

function DateQ({ question, value = '', onChange, surveyDateFormat }) {
  const cfg = question.dateConfig
  const fmt = cfg?.format === 'inherit' ? surveyDateFormat : cfg?.format
  return (
    <div>
      <input type="date" value={value} onChange={e => onChange(e.target.value)} min={cfg?.minDate || undefined} max={cfg?.maxDate || undefined} className="w-full border-2 border-ink-200 rounded-xl px-4 py-3 text-sm text-ink-800 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400" />
      <p className="text-xs text-ink-400 mt-1">Format: <span className="font-mono">{fmt || 'DD/MM/YYYY'}</span></p>
    </div>
  )
}

function MatrixQ({ question, value = {}, onChange }) {
  const cfg = question.matrixConfig
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
          {cfg.rows.map((row, ri) => (
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

function BipolarMatrixQ({ question, value = {}, onChange }) {
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

// ─── MaxDiff Question ──────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildTrials(cfg) {
  const items = [...(cfg.items || [])]
  const n     = items.length
  const k     = Math.min(cfg.itemsPerTrial || 4, n)
  if (n < 2 || k < 2) return []
  const numTrials = cfg.trialsPerRespondent || Math.max(3, Math.ceil(2 * n / k))
  // Build pool: repeat shuffled items until we have enough
  const pool = []
  while (pool.length < numTrials * k) pool.push(...shuffle(items))
  return Array.from({ length: numTrials }, (_, t) => pool.slice(t * k, t * k + k))
}

function MaxDiffQ({ question, value = {}, onChange }) {
  const cfg     = question.maxDiffConfig
  const [trial, setTrial] = React.useState(0)
  // Generate trials once (stable across renders via ref)
  const trialsRef = React.useRef(null)
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
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 mb-2 px-2">
        <div />
        <span className="text-xs font-bold text-emerald-600 text-center w-20">{cfg.bestLabel}</span>
        <span className="text-xs font-bold text-rose-600 text-center w-20">{cfg.worstLabel}</span>
      </div>

      {/* Items */}
      <div className="space-y-1.5 border-2 border-ink-100 rounded-xl overflow-hidden">
        {currentItems.map((item, i) => {
          const isBest  = trialVal.best  === item.id
          const isWorst = trialVal.worst === item.id
          return (
            <div key={item.id} className={`grid grid-cols-[1fr_auto_auto] gap-x-4 items-center px-4 py-3 transition-colors ${
              isBest ? 'bg-emerald-50' : isWorst ? 'bg-rose-50' : i % 2 === 0 ? 'bg-white' : 'bg-ink-50/40'
            }`}>
              <span className="text-sm text-ink-800 font-medium">{item.text}</span>
              <div className="w-20 flex justify-center">
                <button onClick={() => selectBest(item.id)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    isBest ? 'border-emerald-500 bg-emerald-500' : isWorst ? 'border-ink-200 opacity-30 cursor-not-allowed' : 'border-ink-300 hover:border-emerald-400'
                  }`} disabled={isWorst}>
                  {isBest && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                </button>
              </div>
              <div className="w-20 flex justify-center">
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
      <div className="flex items-center justify-between mt-3">
        <button onClick={() => setTrial(t => Math.max(0, t - 1))} disabled={trial === 0}
          className="text-xs text-ink-500 hover:text-ink-700 disabled:opacity-30 flex items-center gap-1">
          ← Previous
        </button>
        {!allDone && <span className="text-xs text-ink-400">Complete all trials before proceeding</span>}
        {allDone && <span className="text-xs text-emerald-600 font-semibold">✓ All trials complete</span>}
        <button onClick={() => setTrial(t => Math.min(total - 1, t + 1))} disabled={trial === total - 1}
          className="text-xs text-ink-500 hover:text-ink-700 disabled:opacity-30 flex items-center gap-1">
          Next →
        </button>
      </div>
    </div>
  )
}

// ─── Card Sort Question ────────────────────────────────────────────────────

function DraggableCard({ card, isDragging: external }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id })
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className={`px-3 py-2 bg-white border-2 rounded-xl text-sm text-ink-800 cursor-grab active:cursor-grabbing select-none transition-all shadow-sm ${
        isDragging ? 'opacity-40 border-brand-300' : 'border-ink-200 hover:border-brand-300 hover:shadow-md'
      }`}>
      {card.text}
    </div>
  )
}

function DroppableCategory({ id, label, color, cardIds, allCards, isUnsorted }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const cards = cardIds.map(cid => allCards.find(c => c.id === cid)).filter(Boolean)

  return (
    <div className="flex flex-col min-w-0">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2 px-1">
        {!isUnsorted && <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />}
        <span className={`text-sm font-semibold ${isUnsorted ? 'text-ink-500' : 'text-ink-700'}`}>{label}</span>
        <span className="text-xs text-ink-400 bg-ink-100 px-1.5 rounded-full ml-auto">{cards.length}</span>
      </div>

      {/* Drop zone */}
      <div ref={setNodeRef}
        className={`flex-1 min-h-[120px] rounded-xl border-2 border-dashed p-2 flex flex-col gap-2 transition-all ${
          isOver ? 'border-brand-400 bg-brand-50/40' : isUnsorted ? 'border-ink-200 bg-ink-50/40' : 'border-ink-200 bg-white'
        }`}
        style={!isUnsorted ? { borderColor: isOver ? undefined : color + '40' } : {}}>
        {cards.map(card => <DraggableCard key={card.id} card={card} />)}
        {cards.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-ink-300 italic">Drop here</p>
          </div>
        )}
      </div>
    </div>
  )
}

function CardSortQ({ question, value = {}, onChange }) {
  const cfg  = question.cardSortConfig
  const cats = cfg.categories || []
  const cards = cfg.cards || []

  // Initialize assignment: all cards start unsorted
  const getAssignment = () => {
    if (value.assignment) return value.assignment
    return {
      uncategorized: cards.map(c => c.id),
      ...Object.fromEntries(cats.map(c => [c.id, []])),
    }
  }
  const assignment = getAssignment()

  const sensors = useSortSensors(useSortSensor(SortPointerSensor, { activationConstraint: { distance: 4 } }))
  const [dragId, setDragId] = React.useState(null)
  const dragCard = dragId ? cards.find(c => c.id === dragId) : null

  const findContainer = (cardId) =>
    Object.keys(assignment).find(key => assignment[key].includes(cardId))

  const handleDragEnd = ({ active, over }) => {
    setDragId(null)
    if (!over) return
    const src  = findContainer(active.id)
    // over.id could be a container or a card in a container
    const dest = Object.keys(assignment).includes(over.id)
      ? over.id
      : findContainer(over.id)
    if (!src || !dest || src === dest) return
    const next = {
      ...assignment,
      [src]:  assignment[src].filter(id => id !== active.id),
      [dest]: [...assignment[dest], active.id],
    }
    onChange({ ...value, assignment: next })
  }

  const allContainers = [
    { id: 'uncategorized', label: 'Unsorted', color: null, isUnsorted: true },
    ...cats.map(c => ({ id: c.id, label: c.label, color: c.color, isUnsorted: false })),
  ]

  return (
    <SortDndContext sensors={sensors} onDragStart={e => setDragId(e.active.id)} onDragEnd={handleDragEnd}>
      {cfg.instruction && <p className="text-sm text-ink-500 italic mb-3">{cfg.instruction}</p>}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(allContainers.length, 4)}, minmax(0, 1fr))` }}>
        {allContainers.map(col => (
          <DroppableCategory
            key={col.id}
            id={col.id}
            label={col.label}
            color={col.color}
            cardIds={assignment[col.id] || []}
            allCards={cards}
            isUnsorted={col.isUnsorted}
          />
        ))}
      </div>
      <SortDragOverlay>
        {dragCard && (
          <div className="px-3 py-2 bg-white border-2 border-brand-400 rounded-xl text-sm text-ink-800 shadow-lg rotate-2">
            {dragCard.text}
          </div>
        )}
      </SortDragOverlay>
      <p className="text-xs text-ink-400 mt-3 text-center">Drag cards into categories</p>
    </SortDndContext>
  )
}

// ─── Constant Sum Question ─────────────────────────────────────────────────
function ConstantSumQ({ question, value = {}, onChange }) {
  const cfg     = question.constantSumConfig
  const target  = cfg.targetSum || 100
  const unit    = cfg.unit || ''

  // Compute running total
  const currentSum = cfg.items.reduce((acc, item) => {
    const v = parseFloat(value[item.id])
    return acc + (isNaN(v) ? 0 : v)
  }, 0)

  const remaining = target - currentSum
  const isExact   = Math.abs(remaining) < 0.0001
  const isOver    = remaining < -0.0001

  const setVal = (itemId, raw) => {
    const cleaned = cfg.allowDecimals ? raw : raw.replace(/[^0-9]/g, '')
    onChange({ ...value, [itemId]: cleaned })
  }

  // Distribute remaining evenly across empty fields
  const autoFill = () => {
    const empty    = cfg.items.filter(i => value[i.id] === '' || value[i.id] === undefined)
    if (!empty.length) return
    const filled   = cfg.items.filter(i => value[i.id] !== '' && value[i.id] !== undefined)
    const usedSum  = filled.reduce((a, i) => a + (parseFloat(value[i.id]) || 0), 0)
    const leftover = target - usedSum
    const share    = cfg.allowDecimals
      ? Math.round((leftover / empty.length) * 100) / 100
      : Math.floor(leftover / empty.length)
    const patch = {}
    empty.forEach(i => { patch[i.id] = String(share) })
    onChange({ ...value, ...patch })
  }

  return (
    <div>
      {cfg.instruction && <p className="text-sm text-ink-500 italic mb-3">{cfg.instruction}</p>}

      {/* Fields */}
      <div className="space-y-2 mb-4">
        {cfg.items.map((item) => {
          const rawVal    = value[item.id] ?? ''
          const numVal    = parseFloat(rawVal)
          const hasValue  = rawVal !== '' && !isNaN(numVal)

          return (
            <div key={item.id} className="flex items-center gap-3">
              {/* Label */}
              <label className="text-sm text-ink-700 font-medium flex-1 min-w-0 truncate">
                {item.label || <span className="italic text-ink-400">Unlabelled</span>}
              </label>

              {/* Input */}
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type={cfg.allowDecimals ? 'number' : 'number'}
                  inputMode="numeric"
                  step={cfg.allowDecimals ? 'any' : '1'}
                  min={0}
                  max={target}
                  value={rawVal}
                  onChange={e => setVal(item.id, e.target.value)}
                  placeholder="0"
                  className={`w-24 text-right border-2 rounded-xl px-3 py-2 text-sm font-mono font-semibold focus:outline-none focus:ring-2 transition-all ${
                    hasValue && numVal < 0
                      ? 'border-rose-300 bg-rose-50 focus:ring-rose-300'
                      : hasValue
                      ? 'border-brand-200 bg-brand-50 focus:ring-brand-300 text-brand-700'
                      : 'border-ink-200 bg-white focus:ring-brand-300'
                  }`}
                />
                {unit && (
                  <span className="text-sm text-ink-500 font-medium w-6">{unit}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Running total panel */}
      <div className={`rounded-xl border-2 p-3 transition-all ${
        isExact ? 'border-emerald-300 bg-emerald-50' :
        isOver  ? 'border-rose-300 bg-rose-50' :
                  'border-amber-200 bg-amber-50'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isExact ? (
              <span className="text-emerald-600 text-lg font-bold">✓</span>
            ) : isOver ? (
              <span className="text-rose-500 text-lg font-bold">↑</span>
            ) : (
              <span className="text-amber-500 text-lg font-bold">…</span>
            )}
            <div>
              <p className={`text-sm font-bold ${isExact ? 'text-emerald-700' : isOver ? 'text-rose-700' : 'text-amber-700'}`}>
                {isExact ? 'Total correct' : isOver ? 'Over by ' + Math.abs(remaining).toFixed(cfg.allowDecimals ? 1 : 0) + (unit ? ' ' + unit : '') : 'Total so far'}
              </p>
              {!isExact && cfg.showRemaining && (
                <p className={`text-xs ${isOver ? 'text-rose-500' : 'text-amber-500'}`}>
                  {isOver ? `Reduce by ${Math.abs(remaining).toFixed(cfg.allowDecimals ? 1 : 0)}${unit ? ' ' + unit : ''}` : `${Math.abs(remaining).toFixed(cfg.allowDecimals ? 1 : 0)}${unit ? ' ' + unit : ''} remaining`}
                </p>
              )}
            </div>
          </div>

          <div className="text-right">
            <span className={`text-2xl font-bold font-mono ${isExact ? 'text-emerald-600' : isOver ? 'text-rose-600' : 'text-amber-600'}`}>
              {currentSum.toFixed(cfg.allowDecimals ? 1 : 0)}
            </span>
            <span className={`text-sm font-semibold ml-1 ${isExact ? 'text-emerald-500' : 'text-ink-400'}`}>
              / {target}{unit ? ' ' + unit : ''}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-2.5 h-2 bg-white/60 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${isExact ? 'bg-emerald-400' : isOver ? 'bg-rose-400' : 'bg-amber-400'}`}
            style={{ width: `${Math.min(100, (currentSum / target) * 100)}%` }}
          />
        </div>

        {/* Auto-fill button — only when there are empty fields and sum < target */}
        {!isExact && !isOver && cfg.items.some(i => !value[i.id]) && (
          <button
            onClick={autoFill}
            className="mt-2 text-xs text-amber-700 hover:text-amber-900 font-medium underline underline-offset-2"
          >
            Auto-fill remaining {Math.abs(remaining).toFixed(cfg.allowDecimals ? 1 : 0)}{unit} across empty fields
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Slider Question ───────────────────────────────────────────────────────
function SliderQ({ question, value, onChange }) {
  const cfg = question.sliderConfig
  const { min, max, step, defaultValue, showNumbers, labels, instruction } = cfg

  // `value` is the current answer: a number | null
  // null means the respondent hasn't touched the slider yet
  const hasAnswer  = value !== null && value !== undefined
  const currentVal = hasAnswer ? value : defaultValue   // what the thumb shows
  const pct        = currentVal != null
    ? ((currentVal - min) / (max - min)) * 100
    : 0

  const range     = max - min
  const ticks     = showNumbers && range <= 20
    ? Array.from({ length: range + 1 }, (_, i) => min + i)
    : []

  const handleChange = (e) => onChange(parseInt(e.target.value))

  const anchors = labels.filter(l => l.label?.trim())

  return (
    <div>
      {instruction && (
        <p className="text-sm text-ink-500 mb-4 leading-relaxed italic">{instruction}</p>
      )}

      {/* Value bubble */}
      <div className="flex justify-center mb-4">
        {hasAnswer || defaultValue !== null ? (
          <div className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-full bg-brand-600 flex items-center justify-center shadow-md shadow-brand-200">
              <span className="text-white text-lg font-bold font-mono">{currentVal}</span>
            </div>
            {/* Show matching anchor label under the bubble */}
            {anchors.find(l => l.value === currentVal) && (
              <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
                {anchors.find(l => l.value === currentVal).label}
              </span>
            )}
          </div>
        ) : (
          <div className="w-12 h-12 rounded-full bg-ink-100 border-2 border-dashed border-ink-300 flex items-center justify-center">
            <span className="text-ink-400 text-lg">?</span>
          </div>
        )}
      </div>

      {/* Slider track */}
      <div className="px-1">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentVal ?? min}
          onChange={handleChange}
          onMouseDown={() => { if (!hasAnswer && defaultValue === null) onChange(min) }}
          onTouchStart={() => { if (!hasAnswer && defaultValue === null) onChange(min) }}
          className="sf-slider"
          style={{ '--pct': `${pct}%` }}
        />

        {/* Tick marks / numbers */}
        {ticks.length > 0 && (
          <div className="flex justify-between mt-2 px-0">
            {ticks.map(n => (
              <button
                key={n}
                onClick={() => onChange(n)}
                className={`text-xs font-mono transition-colors cursor-pointer leading-none ${
                  n === currentVal
                    ? 'text-brand-600 font-bold'
                    : 'text-ink-400 hover:text-ink-600'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        )}

        {/* Anchor labels */}
        {anchors.length > 0 && (
          <div className="relative mt-3" style={{ height: '28px' }}>
            {anchors.map(lbl => {
              const lPct = ((lbl.value - min) / (max - min)) * 100
              const isActive = lbl.value === currentVal
              return (
                <button
                  key={lbl.id}
                  onClick={() => onChange(lbl.value)}
                  title={`Set to ${lbl.value}`}
                  className={`absolute text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    isActive ? 'text-brand-600' : 'text-ink-500 hover:text-ink-700'
                  }`}
                  style={{
                    left: `${lPct}%`,
                    transform:
                      lPct < 8  ? 'none' :
                      lPct > 92 ? 'translateX(-100%)' :
                                  'translateX(-50%)',
                  }}
                >
                  {lbl.label}
                </button>
              )
            })}
          </div>
        )}

        {/* Endpoint range labels when no anchor labels */}
        {anchors.length === 0 && (
          <div className="flex justify-between mt-2 text-xs text-ink-400">
            <span>{min}</span>
            <span>{max}</span>
          </div>
        )}
      </div>

      {/* Nudge prompt when required and untouched */}
      {!hasAnswer && defaultValue === null && (
        <p className="text-center text-xs text-ink-400 mt-3 italic">
          Move the slider to record your answer
        </p>
      )}
    </div>
  )
}

// ─── NPS Question ──────────────────────────────────────────────────────────
function NpsQ({ question, value, onChange }) {
  const cfg = question.npsConfig
  const NPS_COLORS = (n) =>
    n <= 6  ? 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100' :
    n <= 8  ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100' :
              'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
  const selectedColor = (n) =>
    n <= 6  ? 'border-rose-500 bg-rose-500 text-white shadow-sm' :
    n <= 8  ? 'border-amber-500 bg-amber-500 text-white shadow-sm' :
              'border-emerald-500 bg-emerald-500 text-white shadow-sm'

  const segment = value == null ? null
    : value <= 6  ? { label: 'Detractor',  color: 'text-rose-600 bg-rose-50 border-rose-200' }
    : value <= 8  ? { label: 'Passive',    color: 'text-amber-600 bg-amber-50 border-amber-200' }
    :               { label: 'Promoter',   color: 'text-emerald-600 bg-emerald-50 border-emerald-200' }

  return (
    <div className="space-y-3">
      {cfg.instruction && <p className="text-sm text-ink-500 italic">{cfg.instruction}</p>}
      <div className="flex gap-1.5 flex-wrap">
        {Array.from({ length: 11 }, (_, i) => (
          <button
            key={i}
            onClick={() => onChange(i === value ? null : i)}
            className={`w-10 h-10 rounded-xl font-bold text-sm border-2 transition-all active:scale-95 ${
              value === i ? selectedColor(i) : NPS_COLORS(i)
            }`}
          >
            {i}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-ink-400">
        <span>{cfg.minLabel || 'Not at all likely'}</span>
        <span>{cfg.maxLabel || 'Extremely likely'}</span>
      </div>
      {segment && cfg.showScore && (
        <div className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border ${segment.color}`}>
          {segment.label} · Score: {value}
        </div>
      )}
    </div>
  )
}

// ─── Star Rating Question ──────────────────────────────────────────────────
function StarRatingQ({ question, value, onChange }) {
  const [hovered, setHovered] = React.useState(null)
  const cfg     = question.starRatingConfig
  const ICONS   = { star: { filled: '★', empty: '☆' }, heart: { filled: '♥', empty: '♡' }, thumb: { filled: '👍', empty: '👍' } }
  const iconSet = ICONS[cfg.icon] || ICONS.star
  const current = hovered ?? value ?? cfg.defaultValue ?? 0

  const handleClick = (val) => {
    onChange(value === val ? null : val)
  }

  return (
    <div className="space-y-2">
      {cfg.instruction && <p className="text-sm text-ink-500 italic">{cfg.instruction}</p>}
      <div className="flex gap-1 flex-wrap">
        {Array.from({ length: cfg.stars }, (_, i) => {
          const val    = i + 1
          const filled = val <= current
          return (
            <button
              key={i}
              onMouseEnter={() => setHovered(val)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => handleClick(val)}
              className={`text-4xl transition-all active:scale-90 select-none ${
                filled ? 'text-yellow-400 drop-shadow-sm' : 'text-ink-200 hover:text-yellow-300'
              }`}
            >
              {filled ? iconSet.filled : iconSet.empty}
            </button>
          )
        })}
      </div>
      {(cfg.minLabel || cfg.maxLabel) && (
        <div className="flex justify-between text-xs text-ink-400 px-1">
          <span>{cfg.minLabel}</span><span>{cfg.maxLabel}</span>
        </div>
      )}
      {value != null && (
        <p className="text-xs text-ink-500">{value} / {cfg.stars}</p>
      )}
    </div>
  )
}

// ─── Ranking Question ─────────────────────────────────────────────────────
function RankingQ({ question, value = [], onChange }) {
  const cfg     = question.rankingConfig
  const rankAll = cfg.rankAll !== false
  const topN    = rankAll ? cfg.items.length : (cfg.topN || 3)

  // value = array of item IDs in ranked order (index 0 = rank 1)
  const ranked   = (value || []).filter(id => cfg.items.find(i => i.id === id))
  const unranked = cfg.items.filter(i => !ranked.includes(i.id))

  const moveUp   = (idx) => {
    if (idx === 0) return
    const next = [...ranked]
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    onChange(next)
  }
  const moveDown = (idx) => {
    if (idx === ranked.length - 1) return
    const next = [...ranked]
    ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    onChange(next)
  }
  const addToRanked   = (id) => { if (ranked.length < topN) onChange([...ranked, id]) }
  const removeRanked  = (id) => onChange(ranked.filter(r => r !== id))

  return (
    <div className="space-y-3">
      {cfg.instruction && <p className="text-sm text-ink-500 italic">{cfg.instruction}</p>}

      {/* Ranked list */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider">
          {rankAll ? 'Ranked order' : `Top ${topN}`} — {ranked.length}/{topN} placed
        </p>
        {ranked.map((id, idx) => {
          const item = cfg.items.find(i => i.id === id)
          if (!item) return null
          return (
            <div key={id} className="flex items-center gap-2 bg-brand-50 border-2 border-brand-200 rounded-xl px-3 py-2">
              <span className="text-sm font-bold text-brand-600 w-6 shrink-0">{idx + 1}</span>
              <span className="text-sm text-ink-800 flex-1">{item.text}</span>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => moveUp(idx)} disabled={idx === 0}
                  className="p-1 text-ink-400 hover:text-ink-700 disabled:opacity-20 transition-all">▲</button>
                <button onClick={() => moveDown(idx)} disabled={idx === ranked.length - 1}
                  className="p-1 text-ink-400 hover:text-ink-700 disabled:opacity-20 transition-all">▼</button>
                <button onClick={() => removeRanked(id)}
                  className="p-1 text-rose-400 hover:text-rose-600 transition-all text-xs">✕</button>
              </div>
            </div>
          )
        })}
        {ranked.length < topN && (
          <div className="border-2 border-dashed border-ink-200 rounded-xl px-3 py-2.5 text-xs text-ink-400 text-center">
            {topN - ranked.length} more to place
          </div>
        )}
      </div>

      {/* Unranked pool */}
      {unranked.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider">
            {rankAll ? 'Remaining' : 'Available — tap to add'}
          </p>
          {unranked.map(item => (
            <button
              key={item.id}
              onClick={() => addToRanked(item.id)}
              disabled={ranked.length >= topN}
              className="w-full flex items-center gap-2 bg-white border border-ink-200 hover:border-brand-300 hover:bg-brand-50 rounded-xl px-3 py-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="text-sm text-ink-700 flex-1 text-left">{item.text}</span>
              <span className="text-xs text-brand-500 font-medium shrink-0">+ add</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Textbox List Question ─────────────────────────────────────────────────
function TextboxListQ({ question, value = {}, onChange }) {
  const cfg = question.textboxListConfig
  return (
    <div className="space-y-2">
      {cfg.instruction && <p className="text-sm text-ink-500 italic mb-3">{cfg.instruction}</p>}
      {cfg.rows.map(row => (
        <div key={row.id} className="flex items-center gap-3">
          <label className="text-sm font-medium text-ink-700 w-36 shrink-0 text-right">
            {row.label || <span className="italic text-ink-400">Unlabelled</span>}
          </label>
          <input
            type="text"
            value={value[row.id] || ''}
            onChange={e => onChange({ ...value, [row.id]: e.target.value })}
            placeholder={cfg.placeholder || 'Type your answer…'}
            className="flex-1 border-2 border-ink-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-all"
          />
        </div>
      ))}
    </div>
  )
}

// ─── Semantic Differential Question ───────────────────────────────────────
function SemanticDiffQ({ question, value = {}, onChange }) {
  const cfg    = question.semanticDiffConfig
  const points = cfg.points || 7

  const setRow = (rowId, v) => onChange({ ...value, [rowId]: v })

  return (
    <div className="space-y-4">
      {cfg.instruction && <p className="text-sm text-ink-500 italic">{cfg.instruction}</p>}

      {/* Column headers */}
      {cfg.showNumbers && (
        <div className="flex items-center gap-3">
          <div className="w-28 shrink-0" />
          <div className="flex-1 flex justify-between px-1">
            {Array.from({ length: points }, (_, i) => (
              <span key={i} className="text-xs font-mono text-ink-400 w-6 text-center">{i + 1}</span>
            ))}
          </div>
          <div className="w-28 shrink-0" />
        </div>
      )}

      {cfg.rows.map(row => {
        const current = value[row.id] ?? cfg.defaultValue ?? null
        const pct     = current != null ? ((current - 1) / (points - 1)) * 100 : 50

        return (
          <div key={row.id} className="flex items-center gap-3">
            {/* Left pole label */}
            <span className="text-sm font-medium text-ink-600 w-28 shrink-0 text-right leading-snug">
              {row.leftLabel || '…'}
            </span>

            {/* Slider */}
            <div className="flex-1 relative">
              <input
                type="range"
                min={1} max={points} step={1}
                value={current ?? Math.ceil(points / 2)}
                onChange={e => setRow(row.id, parseInt(e.target.value))}
                onMouseDown={() => { if (current === null) setRow(row.id, Math.ceil(points / 2)) }}
                onTouchStart={() => { if (current === null) setRow(row.id, Math.ceil(points / 2)) }}
                className="sf-slider"
                style={{ '--pct': `${current != null ? pct : 50}%` }}
              />
              {current == null && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-5 h-5 rounded-full border-2 border-dashed border-ink-300 bg-white" />
                </div>
              )}
            </div>

            {/* Right pole label */}
            <span className="text-sm font-medium text-ink-600 w-28 shrink-0 leading-snug">
              {row.rightLabel || '…'}
            </span>

            {/* Value badge */}
            {current != null && (
              <span className="w-7 h-7 rounded-full bg-fuchsia-100 border border-fuchsia-300 flex items-center justify-center text-xs font-bold text-fuchsia-700 shrink-0">
                {current}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Cascading Dropdown Question ──────────────────────────────────────────
function CascadeQ({ question, value = {}, onChange }) {
  const cfg = question.cascadeConfig

  const level1Items = cfg.items.filter(i => i.level === 0)
  const level2Items = cfg.items.filter(i => i.level === 1 && i.parentId === value.l1)
  const level3Items = cfg.items.filter(i => i.level === 2 && i.parentId === value.l2)

  const setL1 = (id) => onChange({ l1: id, l2: null, l3: null })
  const setL2 = (id) => onChange({ ...value, l2: id, l3: null })
  const setL3 = (id) => onChange({ ...value, l3: id })

  const selectedL1 = level1Items.find(i => i.id === value.l1)
  const selectedL2 = level2Items.find(i => i.id === value.l2)
  const selectedL3 = level3Items.find(i => i.id === value.l3)

  return (
    <div className="space-y-3">
      {cfg.instruction && <p className="text-sm text-ink-500 italic">{cfg.instruction}</p>}

      {/* Level 1 */}
      <div>
        <label className="text-xs font-semibold text-ink-500 mb-1 block">{cfg.levelLabels[0]}</label>
        <select
          value={value.l1 || ''}
          onChange={e => setL1(e.target.value || null)}
          className="w-full border-2 border-ink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 bg-white transition-all"
        >
          <option value="">— Select {cfg.levelLabels[0]} —</option>
          {level1Items.map(item => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
      </div>

      {/* Level 2 — only shown when L1 is selected */}
      {value.l1 && (
        <div>
          <label className="text-xs font-semibold text-ink-500 mb-1 block">{cfg.levelLabels[1]}</label>
          {level2Items.length === 0 ? (
            <p className="text-xs text-ink-400 italic px-1">No {cfg.levelLabels[1]} options defined for this {cfg.levelLabels[0]}.</p>
          ) : (
            <select
              value={value.l2 || ''}
              onChange={e => setL2(e.target.value || null)}
              className="w-full border-2 border-ink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 bg-white transition-all"
            >
              <option value="">— Select {cfg.levelLabels[1]} —</option>
              {level2Items.map(item => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Level 3 — only shown when L2 is selected */}
      {value.l2 && (
        <div>
          <label className="text-xs font-semibold text-ink-500 mb-1 block">{cfg.levelLabels[2]}</label>
          {level3Items.length === 0 ? (
            <p className="text-xs text-ink-400 italic px-1">No {cfg.levelLabels[2]} options defined for this {cfg.levelLabels[1]}.</p>
          ) : (
            <select
              value={value.l3 || ''}
              onChange={e => setL3(e.target.value || null)}
              className="w-full border-2 border-ink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 bg-white transition-all"
            >
              <option value="">— Select {cfg.levelLabels[2]} —</option>
              {level3Items.map(item => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Selection summary */}
      {(selectedL1 || selectedL2 || selectedL3) && (
        <div className="flex items-center gap-1.5 text-xs text-ink-500 bg-ink-50 px-3 py-2 rounded-lg flex-wrap">
          {selectedL1 && <span className="font-medium text-indigo-700">{selectedL1.label}</span>}
          {selectedL2 && <><span>›</span><span className="font-medium text-indigo-600">{selectedL2.label}</span></>}
          {selectedL3 && <><span>›</span><span className="font-medium text-indigo-500">{selectedL3.label}</span></>}
        </div>
      )}
    </div>
  )
}

// ─── Image Choice Question (single + multi) ────────────────────────────────
function ImageChoiceQ({ question, value, onChange }) {
  const cfg     = question.imageChoiceConfig
  const isMulti = question.questionType === 'image_choice_multi'
  const [companions, setCompanions] = React.useState({})

  // value = optionId (single) | optionId[] (multi)
  const isSelected = (id) => isMulti
    ? Array.isArray(value) && value.includes(id)
    : value === id

  const toggle = (opt) => {
    if (isMulti) {
      const curr = Array.isArray(value) ? value : []
      if (opt.isExclusive) {
        onChange(curr.includes(opt.id) ? [] : [opt.id])
      } else {
        const exclusiveIds = cfg.imageOptions.filter(o => o.isExclusive).map(o => o.id)
        const filtered = curr.filter(id => !exclusiveIds.includes(id))
        onChange(filtered.includes(opt.id)
          ? filtered.filter(id => id !== opt.id)
          : [...filtered, opt.id])
      }
    } else {
      onChange(value === opt.id ? null : opt.id)
    }
  }

  const colClass = cfg.columns === 2 ? 'grid-cols-2' : cfg.columns === 3 ? 'grid-cols-3' : 'grid-cols-4'

  return (
    <div>
      {cfg.instruction && <p className="text-sm text-ink-500 italic mb-3">{cfg.instruction}</p>}
      <div className={`grid ${colClass} gap-3`}>
        {cfg.imageOptions.map(opt => {
          const sel = isSelected(opt.id)
          return (
            <div key={opt.id}>
              <button
                onClick={() => toggle(opt)}
                className={`w-full rounded-xl border-2 overflow-hidden transition-all focus:outline-none relative group ${
                  sel
                    ? 'border-brand-500 shadow-md shadow-brand-100'
                    : 'border-ink-200 hover:border-ink-300'
                }`}
              >
                {opt.image ? (
                  <>
                    <img src={opt.image} alt={opt.imageAlt || opt.text || ''}
                      className="w-full aspect-square object-cover" />
                    {/* Selected overlay */}
                    {sel && (
                      <div className="absolute inset-0 bg-brand-600/20 flex items-center justify-center">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shadow ${
                          isMulti ? 'bg-brand-600' : 'bg-brand-600'
                        }`}>
                          {isMulti
                            ? <Check size={14} className="text-white" strokeWidth={3} />
                            : <div className="w-3 h-3 rounded-full bg-white" />
                          }
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* Text-only tile */
                  <div className={`aspect-square flex items-center justify-center p-3 border-2 border-dashed rounded-xl transition-all ${
                    sel ? 'border-brand-400 bg-brand-50' : 'border-ink-200 bg-ink-50 group-hover:border-ink-300'
                  }`}>
                    <span className={`text-sm font-medium text-center leading-snug ${sel ? 'text-brand-700' : 'text-ink-600'}`}>
                      {opt.text || 'Option'}
                    </span>
                  </div>
                )}
              </button>

              {/* Label below image */}
              {cfg.showLabels && opt.image && (
                <p className={`text-xs text-center mt-1.5 font-medium leading-snug ${sel ? 'text-brand-700' : 'text-ink-600'}`}>
                  {opt.text}
                </p>
              )}

              {/* Companion open text */}
              {sel && opt.openText?.enabled && (
                <div className="mt-1.5">
                  <input
                    type="text"
                    value={companions[opt.id] || ''}
                    onChange={e => setCompanions(c => ({ ...c, [opt.id]: e.target.value }))}
                    placeholder={opt.openText.placeholder || 'Please specify…'}
                    className="w-full border border-ink-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function QuestionRenderer({ question, value, onChange, surveyDateFormat, companions, onCompanionChange, responses, items }) {
  // Resolve piped options for choice questions
  const opts = (question.pipedOptionsConfig?.enabled)
    ? buildPipedOptions(question, responses, items)
    : question.options

  switch (question.questionType) {
    case 'single_select':  return <SingleSelectQ  question={{ ...question, options: opts }} value={value} onChange={onChange} companions={companions} onCompanionChange={onCompanionChange} />
    case 'multi_select':   return <MultiSelectQ   question={{ ...question, options: opts }} value={value} onChange={onChange} companions={companions} onCompanionChange={onCompanionChange} />
    case 'dropdown':       return <DropdownQ      question={{ ...question, options: opts }} value={value} onChange={onChange} />
    case 'open_text':      return <OpenTextQ      question={question} value={value} onChange={onChange} />
    case 'date':           return <DateQ          question={question} value={value} onChange={onChange} surveyDateFormat={surveyDateFormat} />
    case 'matrix':         return <MatrixQ        question={question} value={value} onChange={onChange} />
    case 'bipolar_matrix': return <BipolarMatrixQ question={question} value={value} onChange={onChange} />
    case 'maxdiff':        return <MaxDiffQ       question={question} value={value} onChange={onChange} />
    case 'card_sort':      return <CardSortQ      question={question} value={value} onChange={onChange} />
    case 'constant_sum':   return <ConstantSumQ   question={question} value={value} onChange={onChange} />
    case 'slider':         return <SliderQ        question={question} value={value} onChange={onChange} />
    case 'nps':            return <NpsQ           question={question} value={value} onChange={onChange} />
    case 'star_rating':    return <StarRatingQ    question={question} value={value} onChange={onChange} />
    case 'ranking':        return <RankingQ       question={question} value={value} onChange={onChange} />
    case 'textbox_list':   return <TextboxListQ   question={question} value={value} onChange={onChange} />
    case 'semantic_diff':  return <SemanticDiffQ  question={question} value={value} onChange={onChange} />
    case 'cascade':            return <CascadeQ       question={question} value={value} onChange={onChange} />
    case 'image_choice_single':
    case 'image_choice_multi': return <ImageChoiceQ  question={question} value={value} onChange={onChange} />
    default: return <p className="text-sm text-ink-400 italic">Unknown question type.</p>
  }
}

// ─── Build readable cause string from a fired block ───────────────────────
function buildBlockCause(block, responses, allItems) {
  const conds = block.conditions || []
  return conds.map((c, i) => {
    const q = allItems.find(item => item.id === c.questionId)
    if (!q) return null
    const qLabel = q.text ? `"${q.text.slice(0, 40)}…"` : 'a question'
    const isChoice = ['single_select', 'multi_select', 'dropdown'].includes(q.questionType)
    let condStr
    if (isChoice) {
      const labels = (c.optionIds || []).map(id => q.options?.find(o => o.id === id)?.text || '?')
      condStr = `${qLabel} ${c.conditionType?.replace(/_/g, ' ') || ''} [${labels.join(', ')}]`
    } else {
      condStr = `${qLabel} ${c.textOperator?.replace(/_/g, ' ') || ''} "${c.textValue}"`
    }
    return i === 0 ? condStr : `${c.join} ${condStr}`
  }).filter(Boolean).join(' ')
}

// ─── Termination Screen ────────────────────────────────────────────────────
function TerminationScreen({ settings, terminatedBy, onReset, onDownload, isPublic = false }) {
  const title   = settings?.terminateTitle   || 'Thank you for your time.'
  const message = settings?.terminateMessage || 'Unfortunately, you do not qualify for this survey.'
  return (
    <div className="flex-1 flex items-center justify-center py-12 px-6">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-6 shadow-sm">
          {terminatedBy?.blockTitle ? <Zap size={36} className="text-rose-500" /> : <UserX size={36} className="text-rose-500" />}
        </div>
        <h2 className="text-2xl font-bold text-ink-800 mb-3">{title}</h2>
        <p className="text-ink-500 mb-4 leading-relaxed">{message}</p>
        {terminatedBy?.blockTitle && (
          <p className="text-xs text-rose-500 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-4">
            Triggered by: <strong>{terminatedBy.blockTitle}</strong>
          </p>
        )}
        {!isPublic && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-6">
            <p className="text-xs text-amber-700 font-medium">👁 Preview mode — this is the screen-out page respondents will see</p>
          </div>
        )}
        <div className="flex items-center justify-center gap-3">
          {!isPublic && <button onClick={onReset} className="btn-ghost border border-ink-200">← Restart</button>}
          <button onClick={onDownload} className="btn-primary flex items-center gap-2">
            <Download size={14} /> Download CSV
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Completion Screen ─────────────────────────────────────────────────────
function CompletionScreen({ onReset, onDownload, isPublic = false }) {
  return (
    <div className="flex-1 flex items-center justify-center py-12 px-6">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
          <Check size={36} className="text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-ink-800 mb-3">Survey Complete</h2>
        <p className="text-ink-500 mb-4">
          {isPublic ? 'Thank you for completing this survey. Your responses have been recorded.' : 'All responses captured. Download the CSV to see exactly how this response would be exported.'}
        </p>
        {!isPublic && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-6">
            <p className="text-xs text-amber-700 font-medium">👁 Preview mode — download exports this single test response</p>
          </div>
        )}
        <div className="flex items-center justify-center gap-3">
          {!isPublic && <button onClick={onReset} className="btn-ghost border border-ink-200">← Restart</button>}
          <button onClick={onDownload} className="btn-primary flex items-center gap-2">
            <Download size={14} /> Download CSV
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main SurveyPreview ────────────────────────────────────────────────────
// ─── Cover / Welcome Page ──────────────────────────────────────────────────
// ─── Closed Survey Screen ──────────────────────────────────────────────────
function ClosedSurveyScreen({ settings }) {
  const title   = settings?.closedTitle   || 'This survey is now closed.'
  const message = settings?.closedMessage || 'Thank you for your interest. This survey is no longer accepting responses.'
  return (
    <div className="min-h-screen bg-ink-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-ink-100 flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">🔒</span>
        </div>
        <h2 className="text-2xl font-bold text-ink-800 mb-3">{title}</h2>
        <p className="text-ink-500 leading-relaxed">{message}</p>
      </div>
    </div>
  )
}

function CoverPage({ survey, onStart, isPublic = false }) {
  const logoJustify =
    survey?.logoPosition === 'right'  ? 'justify-end'   :
    survey?.logoPosition === 'center' ? 'justify-center' :
                                         'justify-start'

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-6">
      <div className="max-w-lg w-full">
        {survey?.coverImage && (
          <div className="mb-6 rounded-2xl overflow-hidden border border-ink-100 shadow-sm bg-white">
            <img
              src={survey.coverImage}
              alt=""
              className="w-full max-h-72 object-cover"
            />
          </div>
        )}

        {survey?.companyLogo && (
          <div className={`flex mb-5 ${logoJustify}`}>
            <img src={survey.companyLogo} alt="Logo" className="h-12 max-w-[180px] object-contain" />
          </div>
        )}

        <h1 className="text-2xl font-bold text-ink-800 mb-3 leading-snug text-center">
          {survey?.title || 'Untitled Survey'}
        </h1>

        {survey?.description && (
          <div
            className="rte-content text-ink-600 leading-relaxed mb-8"
            dangerouslySetInnerHTML={{ __html: survey.description }}
          />
        )}

        <div className="text-center">
          <button onClick={onStart} className="btn-primary px-8 py-3 text-base">
            {survey?.startButtonText || 'Start Survey'}
          </button>
          {!isPublic && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-6 inline-block">
              👁 Preview mode — this is the welcome page respondents see first
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export function SurveyPreview({ survey, items, onClose, isPublic = false }) {
  const [responses, setResponses]       = useState({})
  const [companions, setCompanions]     = useState({})  // { questionId: { optionId: text } }
  const [errors, setErrors]             = useState({})
  const [currentPage, setCurrentPage]   = useState(0)
  const [submitted, setSubmitted]       = useState(false)
  const [terminated, setTerminated]     = useState(false)
  const [terminatedBy, setTerminatedBy] = useState(null)
  const [showCover, setShowCover]       = useState(survey?.showCoverPage !== false)
  const [fingerprint, setFingerprint]   = useState(null)
  const [fpStatus, setFpStatus]         = useState('idle') // 'idle' | 'collecting' | 'done'

  // ── Collect device/browser fingerprint once, on mount ──────────────────
  // Runs in the background regardless of cover page state, so by the time
  // the respondent reaches the end the data is already ready to attach.
  const fpEnabled = survey?.settings?.fingerprinting?.enabled
  const fpSignals = survey?.settings?.fingerprinting?.signals
  useEffect(() => {
    if (!fpEnabled) return
    let cancelled = false
    setFpStatus('collecting')
    collectFingerprint(fpSignals).then(fp => {
      if (!cancelled) { setFingerprint(fp); setFpStatus('done') }
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fpEnabled])

  // Build pages + capture termination blocks, fully respecting conditional
  // show/hide logic on questions, page breaks, and groups. Must recompute
  // whenever `responses` changes, since visibility can depend on earlier answers.
  const { pages, blocksByPage } = useMemo(
    () => buildVisiblePages(items, responses),
    [items, responses]
  )

  const allQuestions = items.filter(i => i.itemType === 'question')
  const getQNum = (id) => allQuestions.findIndex(q => q.id === id) + 1

  const currentItems    = pages[currentPage] || []
  const currentQuestions = currentItems.filter(i => i.itemType === 'question')
  const totalPages = pages.length

  const reset = () => {
    setResponses({}); setCompanions({}); setErrors({}); setCurrentPage(0)
    setSubmitted(false); setTerminated(false); setTerminatedBy(null)
    setShowCover(survey?.showCoverPage !== false)
    if (fpEnabled) {
      setFpStatus('collecting')
      collectFingerprint(fpSignals).then(fp => { setFingerprint(fp); setFpStatus('done') })
    }
  }

  const handleCompanionChange = (questionId, optionId, text) => {
    setCompanions(c => ({
      ...c,
      [questionId]: { ...(c[questionId] || {}), [optionId]: text },
    }))
  }

  // ── Build a response entry from current state ─────────────────────────
  const buildEntry = (status, terminatedByArg = null) => ({
    id:          newResponseId(),
    timestamp:   new Date().toISOString(),
    status,
    pageReached: currentPage,
    responses,
    companions,
    terminatedBy: terminatedByArg,
    fingerprint: fpEnabled ? (fingerprint || {}) : null,
  })

  // ── Auto-save to localStorage + optionally download CSV ───────────────
  const persistAndDownload = (status, terminatedByArg = null, doDownload = false) => {
    // ── DNC check — only for completed responses ──────────────────────────
    let finalStatus = status
    if (status === 'complete' && survey?.id) {
      const emailQ = items.find(i => i.itemType === 'question' && i.isEmailField)
      if (emailQ) {
        const emailAnswer = responses[emailQ.id] || ''
        if (isOnDNCList(survey.id, emailAnswer)) {
          finalStatus = 'dnc'
        }
      }
    }
    const entry = buildEntry(finalStatus, terminatedByArg)
    if (survey?.id) saveResponse(survey.id, entry)
    if (doDownload) {
      const csv = generateCSV(items, [entry], survey)
      downloadCSV(csv, `${(survey?.title || 'survey').replace(/\s+/g, '_')}_${finalStatus}.csv`)
    }
    return finalStatus
  }

  // ── Handle answer change — just update state, no termination check here ─
  const handleChange = (question, val) => {
    setResponses(r => ({ ...r, [question.id]: val }))
    if (errors[question.id]) setErrors(e => ({ ...e, [question.id]: null }))
  }

  const validatePage = () => {
    const pageErrors = {}
    for (const q of currentQuestions) {
      const err = validateAnswer(q, responses[q.id])
      if (err) pageErrors[q.id] = err
    }
    setErrors(pageErrors)
    return Object.keys(pageErrors).length === 0
  }

  // All termination checked on Next: per-question rules + termination blocks
  const checkPageTermination = () => {
    // 1. Per-question termination rules
    for (const q of currentQuestions) {
      const result = checkTermination(q, responses[q.id])
      if (result.terminated) {
        const tb = { questionText: q.text, cause: result.cause, blockTitle: null }
        setTerminated(true)
        setTerminatedBy(tb)
        persistAndDownload('terminated', tb)
        return true
      }
    }
    // 2. Termination blocks assigned to this page
    const blocks = blocksByPage[currentPage] || []
    for (const block of blocks) {
      if (block.conditions?.length && evalBlock(block, responses, items)) {
        const cause = buildBlockCause(block, responses, items)
        const tb    = { questionText: null, cause, blockTitle: block.title || 'Termination Block' }
        setTerminated(true)
        setTerminatedBy(tb)
        persistAndDownload('terminated', tb)
        return true
      }
    }
    return false
  }

  const handleNext = () => {
    if (!validatePage()) return
    if (checkPageTermination()) return
    if (currentPage < totalPages - 1) {
      setCurrentPage(p => p + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      setSubmitted(true)
      persistAndDownload('complete')
    }
  }

  const progress = totalPages > 1 ? Math.round((currentPage / totalPages) * 100) : 0

  return (
    <div className="min-h-screen bg-ink-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-ink-200 sticky top-0 z-30">
        <div className="max-w-screen-xl mx-auto px-6 h-14 flex items-center gap-3">
          {survey?.companyLogo && (
            <img src={survey.companyLogo} alt="Logo" className="h-7 w-auto max-w-[120px] object-contain shrink-0" />
          )}
          <h1 className="text-sm font-semibold text-ink-800 flex-1 truncate">{survey?.title || 'Survey'}</h1>
          {fpEnabled && (
            <span
              title={fpStatus === 'done' ? 'Fingerprint data collected for this session' : 'Collecting fingerprint…'}
              className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1 ${
                fpStatus === 'done'
                  ? 'text-violet-600 bg-violet-50 border border-violet-200'
                  : 'text-ink-400 bg-ink-50 border border-ink-200'
              }`}
            >
              <Fingerprint size={11} /> {fpStatus === 'done' ? 'FP captured' : 'FP collecting…'}
            </span>
          )}
          {!isPublic && (
            <>
              <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full shrink-0">
                👁 Preview Mode
              </span>
              <button onClick={onClose} className="flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800 font-medium px-3 py-1.5 hover:bg-ink-50 rounded-lg transition-all shrink-0">
                <X size={15} /> Exit Preview
              </button>
            </>
          )}
        </div>
      </header>

      {/* Progress bar */}
      {totalPages > 1 && !terminated && !submitted && !showCover && (
        <div className="bg-white border-b border-ink-100 px-6 py-2">
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-between text-xs text-ink-400 mb-1.5">
              <span>Page {currentPage + 1} of {totalPages}</span>
              <span>{progress}% complete</span>
            </div>
            <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
              <div className="h-full bg-brand-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {isPublic && survey?.status === 'closed' ? (
        <ClosedSurveyScreen settings={survey?.settings} />
      ) : showCover ? (
        <CoverPage survey={survey} onStart={() => setShowCover(false)} isPublic={isPublic} />
      ) : terminated ? (
        <TerminationScreen settings={survey?.settings} terminatedBy={terminatedBy} onReset={reset} onDownload={() => persistAndDownload('terminated', terminatedBy, true)} isPublic={isPublic} />
      ) : submitted ? (
        <CompletionScreen onReset={reset} onDownload={() => persistAndDownload('complete', null, true)} isPublic={isPublic} />
      ) : (
        <>
          <div className="flex-1 py-8 px-6">
            <div className="max-w-2xl mx-auto space-y-5">
              {/* Page title if there's a page break with a title before this page */}
              {currentPage > 0 && (() => {
                const breaks = items.filter(i => i.itemType === 'page_break')
                const pb = breaks[currentPage - 1]
                return pb?.title ? (
                  <div className="text-center mb-2">
                    <h2 className="text-lg font-semibold text-ink-700">{pb.title}</h2>
                  </div>
                ) : null
              })()}

              {currentItems.map(item => {
                // ── Text / Media block ──────────────────────────────────
                if (item.itemType === 'text_block') {
                  return (
                    <div key={item.id} className="bg-white rounded-2xl border border-emerald-100 p-6">
                      {item.title && (
                        <p className="text-base font-semibold text-ink-800 mb-3">{resolvePipingTokens(item.title, responses, items)}</p>
                      )}
                      {item.image && (
                        <div className="mb-3">
                          <img src={item.image} alt={item.imageCaption || ''} className="w-full max-h-72 object-contain rounded-xl border border-ink-100 bg-ink-50" />
                          {item.imageCaption && (
                            <p className="text-xs text-ink-400 text-center mt-1.5 italic">{item.imageCaption}</p>
                          )}
                        </div>
                      )}
                      {item.content && (
                        <div className="rte-content text-ink-700 text-sm leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: resolvePipingTokens(item.content, responses, items) }} />
                      )}
                      {!item.title && !item.image && !item.content && (
                        <p className="text-ink-300 italic text-sm">Empty text block</p>
                      )}
                    </div>
                  )
                }

                // ── Question ────────────────────────────────────────────
                const q     = item
                const qNum  = getQNum(q.id)
                const error = errors[q.id]
                return (
                  <div key={q.id} className={`bg-white rounded-2xl border-2 p-6 transition-all duration-200 ${error ? 'border-rose-300 shadow-sm shadow-rose-100' : 'border-ink-100 hover:border-ink-200'}`}>
                    <div className="mb-4 flex items-start gap-3">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-brand-50 text-brand-600 text-sm font-bold shrink-0 mt-0.5">
                        {qNum}
                      </span>
                      <div className="flex-1">
                        <p className="text-base font-semibold text-ink-800 leading-snug">
                          {resolvePipingTokens(q.text, responses, items) || <span className="text-ink-300 italic">Untitled question</span>}
                          {q.required && <span className="text-rose-500 ml-1">*</span>}
                        </p>
                      </div>
                    </div>
                    <div className="ml-10">
                      <QuestionRenderer
                        question={q}
                        value={responses[q.id]}
                        onChange={val => handleChange(q, val)}
                        surveyDateFormat={survey?.defaultDateFormat || 'DD/MM/YYYY'}
                        companions={companions[q.id] || {}}
                        onCompanionChange={(optId, text) => handleCompanionChange(q.id, optId, text)}
                        responses={responses}
                        items={items}
                      />
                      {error && (
                        <p className="mt-2 text-sm text-rose-600 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0 text-xs font-bold">!</span>
                          {error}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Navigation */}
          <div className="bg-white border-t border-ink-100 px-6 py-4 sticky bottom-0">
            <div className="max-w-2xl mx-auto flex items-center justify-between">
              <button onClick={() => { setCurrentPage(p => Math.max(0, p-1)); window.scrollTo({top:0,behavior:'smooth'}) }} disabled={currentPage === 0} className="flex items-center gap-2 text-sm font-medium text-ink-500 hover:text-ink-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <ChevronLeft size={16} /> Back
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => persistAndDownload('partial')}
                  title="Save this partial response to the export store"
                  className="text-xs font-medium text-ink-400 hover:text-ink-600 px-3 py-1.5 border border-ink-200 hover:border-ink-300 rounded-lg transition-all"
                >
                  Save partial
                </button>
                <button onClick={handleNext} className="btn-primary px-8">
                  {currentPage === totalPages - 1 ? <><Check size={15} /> Submit</> : <>Next <ChevronRight size={15} /></>}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
