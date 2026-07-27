// ─── CSV formatting constants ──────────────────────────────────────────────
const COMPANION_SEP = ';'   // separates selection from its open-text companion
const MULTI_SEP     = '|'   // separates multiple selections within one cell

import { fpColumns } from './fingerprint.js'

// ─── Escape a single cell value ───────────────────────────────────────────
function cell(value) {
  const str = value == null ? '' : String(value).trim()
  // Wrap in quotes if the value contains a comma, quote, newline, or our separators
  if (/[,";\|\r\n]/.test(str)) return '"' + str.replace(/"/g, '""') + '"'
  return str
}

// ─── Format one question's answer into a cell string ──────────────────────
function formatAnswer(question, responses, companions) {
  const qId   = question.id
  const answer = responses[qId]
  const cmp    = companions?.[qId] || {}   // { optionId: 'companion text' }

  switch (question.questionType) {

    /* ── Choice questions ─────────────────────────────────────────────── */
    case 'single_select':
    case 'dropdown': {
      if (!answer) return ''
      const opt  = question.options?.find(o => o.id === answer)
      if (!opt) return ''
      const text = cmp[answer] ? `${opt.text}${COMPANION_SEP}${cmp[answer]}` : opt.text
      return text
    }

    case 'multi_select': {
      if (!Array.isArray(answer) || !answer.length) return ''
      return answer
        .map(id => {
          const opt = question.options?.find(o => o.id === id)
          if (!opt) return null
          return cmp[id] ? `${opt.text}${COMPANION_SEP}${cmp[id]}` : opt.text
        })
        .filter(Boolean)
        .join(MULTI_SEP)
    }

    /* ── Text / date / slider ─────────────────────────────────────────── */
    case 'open_text': return answer ?? ''
    case 'date':      return answer ?? ''
    case 'slider':    return answer != null ? String(answer) : ''

    /* ── Constant sum ─────────────────────────────────────────────────── */
    case 'constant_sum': {
      const cfg  = question.constantSumConfig
      const vals = answer || {}
      if (!cfg?.items?.length) return ''
      return cfg.items
        .map(item => `${item.label}:${vals[item.id] ?? 0}`)
        .join(MULTI_SEP)
    }

    /* ── Matrix grid ──────────────────────────────────────────────────── */
    case 'matrix': {
      const cfg  = question.matrixConfig
      const vals = answer || {}
      if (!cfg?.rows?.length) return ''
      return cfg.rows
        .map(row => {
          const sel = vals[row.id]
          if (!sel) return `${row.text}:-`
          if (cfg.subType === 'single') {
            const col = cfg.columns?.find(c => c.id === sel)
            return `${row.text}:${col?.text ?? sel}`
          }
          const cols = (Array.isArray(sel) ? sel : [])
            .map(cId => cfg.columns?.find(c => c.id === cId)?.text ?? cId)
            .join(',')
          return `${row.text}:${cols || '-'}`
        })
        .join(MULTI_SEP)
    }

    /* ── Bipolar matrix ───────────────────────────────────────────────── */
    case 'bipolar_matrix': {
      const cfg  = question.bipolarConfig
      const vals = answer || {}
      if (!cfg?.rows?.length) return ''
      return cfg.rows
        .map(row => {
          const rv    = vals[row.id] || {}
          const left  = rv.left
          const right = rv.right
          const center = rv.center

          const resolveLeft = (id) => cfg.leftColumns?.find(c => c.id === id)?.text ?? id
          const resolveRight = (id) => cfg.rightColumns?.find(c => c.id === id)?.text ?? id

          const leftStr = !left ? '-'
            : Array.isArray(left) ? left.map(resolveLeft).join(',')
            : resolveLeft(left)

          const rightStr = !right ? '-'
            : Array.isArray(right) ? right.map(resolveRight).join(',')
            : resolveRight(right)

          const centerStr = cfg.showCenter && center
            ? `,C:${cfg.centerLabel || 'Neutral'}`
            : ''

          return `${row.text}:L=${leftStr},R=${rightStr}${centerStr}`
        })
        .join(MULTI_SEP)
    }

    /* ── MaxDiff ──────────────────────────────────────────────────────── */
    case 'maxdiff': {
      const cfg  = question.maxDiffConfig
      const vals = answer || {}
      const keys = Object.keys(vals).sort((a, b) => +a - +b)
      if (!keys.length) return ''
      return keys
        .map(ti => {
          const t     = vals[ti] || {}
          const best  = cfg.items?.find(i => i.id === t.best)?.text  ?? '-'
          const worst = cfg.items?.find(i => i.id === t.worst)?.text ?? '-'
          return `T${+ti + 1}:Best=${best},Worst=${worst}`
        })
        .join(MULTI_SEP)
    }

    /* ── Card sort ────────────────────────────────────────────────────── */
    case 'card_sort': {
      const cfg        = question.cardSortConfig
      const assignment = answer?.assignment || {}
      if (!cfg?.cards?.length) return ''
      return cfg.cards
        .map(card => {
          const catId = Object.keys(assignment).find(k =>
            Array.isArray(assignment[k]) && assignment[k].includes(card.id)
          )
          const catLabel = !catId || catId === 'uncategorized'
            ? 'Unsorted'
            : cfg.categories?.find(c => c.id === catId)?.label ?? catId
          return `${card.text}->${catLabel}`
        })
        .join(MULTI_SEP)
    }

    /* ── NPS ───────────────────────────────────────────────────────────── */
    case 'nps': {
      if (answer === null || answer === undefined) return ''
      const n   = parseInt(answer)
      const seg = n <= 6 ? 'Detractor' : n <= 8 ? 'Passive' : 'Promoter'
      return `${n}${COMPANION_SEP}${seg}`
    }

    /* ── Star rating ───────────────────────────────────────────────────── */
    case 'star_rating': {
      return answer != null ? String(answer) : ''
    }

    /* ── Ranking ───────────────────────────────────────────────────────── */
    case 'ranking': {
      const cfg   = question.rankingConfig
      const items = cfg?.items || []
      const order = Array.isArray(answer) ? answer : []
      if (!order.length) return ''
      return order
        .map((id, idx) => {
          const item = items.find(i => i.id === id)
          return item ? `${idx + 1}.${item.text}` : null
        })
        .filter(Boolean)
        .join(MULTI_SEP)
    }


    /* ── Image choice single ─────────────────────────────────────────── */
    case 'image_choice_single': {
      if (!answer) return ''
      const cfg = question.imageChoiceConfig
      const opt = cfg?.imageOptions?.find(o => o.id === answer)
      return opt?.text || ''
    }

    /* ── Image choice multi ──────────────────────────────────────────── */
    case 'image_choice_multi': {
      const cfg  = question.imageChoiceConfig
      const opts = cfg?.imageOptions || []
      const sel  = Array.isArray(answer) ? answer : []
      return sel.map(id => opts.find(o => o.id === id)?.text || id).filter(Boolean).join(MULTI_SEP)
    }

    /* ── Textbox List ─────────────────────────────────────────────────── */
    case 'image_choice_single': {
      const cfg = q.imageChoiceConfig
      return cfg?.imageOptions?.[0]?.text || 'Option 1'
    }
    case 'image_choice_multi': {
      const cfg = q.imageChoiceConfig
      return (cfg?.imageOptions || []).slice(0,2).map(o => o.text).join(MULTI_SEP)
    }
    case 'textbox_list': {
      const cfg  = question.textboxListConfig
      const vals = answer || {}
      if (!cfg?.rows?.length) return ''
      return cfg.rows
        .filter(r => vals[r.id]?.trim())
        .map(r => `${r.label}: ${vals[r.id]}`)
        .join(MULTI_SEP)
    }

    /* ── Semantic Differential ────────────────────────────────────────── */
    case 'semantic_diff': {
      const cfg  = question.semanticDiffConfig
      const vals = answer || {}
      if (!cfg?.rows?.length) return ''
      return cfg.rows
        .map(r => {
          const v = vals[r.id] ?? cfg.defaultValue
          return v != null ? `${r.leftLabel}↔${r.rightLabel}: ${v}` : null
        })
        .filter(Boolean)
        .join(MULTI_SEP)
    }

    /* ── Cascading Dropdown ───────────────────────────────────────────── */
    case 'cascade': {
      const cfg = question.cascadeConfig
      if (!answer?.l1) return ''
      const parts = []
      const l1 = cfg.items.find(i => i.id === answer.l1)
      if (l1) parts.push(`${cfg.levelLabels[0]}: ${l1.label}`)
      if (answer.l2) {
        const l2 = cfg.items.find(i => i.id === answer.l2)
        if (l2) parts.push(`${cfg.levelLabels[1]}: ${l2.label}`)
      }
      if (answer.l3) {
        const l3 = cfg.items.find(i => i.id === answer.l3)
        if (l3) parts.push(`${cfg.levelLabels[2]}: ${l3.label}`)
      }
      return parts.join(MULTI_SEP)
    }

    default: return ''
  }
}

// ─── Generate the full CSV string from one or more responses ──────────────
/**
 * @param {Array}  surveyItems    - flat items array from the survey store
 * @param {Array}  responsesArray - array of { id, timestamp, status, responses, companions, fingerprint }
 * @param {object} [survey]       - survey object; used to read fingerprinting settings so FP
 *                                  columns are included automatically whenever fingerprinting
 *                                  is enabled, on every export, with no extra step required.
 * @returns {string} CSV content ready to write to a .csv file
 */
export function generateCSV(surveyItems, responsesArray, survey = null) {
  const questions  = surveyItems.filter(i => i.itemType === 'question')
  const fpSettings = survey?.settings?.fingerprinting
  const fpEnabled  = fpSettings?.enabled
  const fpCols     = fpEnabled ? fpColumns(fpSettings.signals) : []

  // Header row
  const headers = [
    'Response ID',
    'Timestamp',
    'Status',
    ...questions.map((q, i) => `Q${i + 1}: ${q.text || `Question ${i + 1}`}`),
    ...fpCols.map(c => c.label),
  ]

  // Data rows
  const rows = responsesArray.map((entry, idx) => {
    const { id, timestamp, status, responses, companions, fingerprint } = entry
    return [
      id        || `R${String(idx + 1).padStart(3, '0')}`,
      timestamp || new Date().toISOString(),
      status    || 'complete',
      ...questions.map(q => formatAnswer(q, responses, companions)),
      ...fpCols.map(c => fingerprint?.[c.key] ?? ''),
    ]
  })

  const allRows = [headers, ...rows]
  return '\uFEFF' + allRows.map(row => row.map(cell).join(',')).join('\r\n')
  // ↑ BOM ensures Excel opens UTF-8 correctly
}

// ─── Generate a template CSV (header row + one annotated example row) ─────
export function generateTemplateCSV(surveyItems, survey = null) {
  const questions  = surveyItems.filter(i => i.itemType === 'question')
  const fpSettings = survey?.settings?.fingerprinting
  const fpEnabled  = fpSettings?.enabled
  const fpCols     = fpEnabled ? fpColumns(fpSettings.signals) : []

  const headers = [
    'Response ID',
    'Timestamp',
    'Status',
    ...questions.map((q, i) => `Q${i + 1}: ${q.text || `Question ${i + 1}`}`),
    ...fpCols.map(c => c.label),
  ]

  const sampleRow = [
    'R001',
    new Date().toISOString(),
    'complete',
    ...questions.map(q => sampleValue(q)),
    ...fpCols.map(c => fpSampleValue(c.key)),
  ]

  return '\uFEFF' + [headers, sampleRow].map(row => row.map(cell).join(',')).join('\r\n')
}

function fpSampleValue(key) {
  const samples = {
    ip: '203.0.113.42', city: 'London', region: 'England', country: 'United Kingdom',
    countryCode: 'GB', isp: 'Example Broadband Ltd', latitude: '51.5074', longitude: '-0.1278',
    browserName: 'Chrome', browserVersion: '126.0.0.0', os: 'Windows 10/11', deviceType: 'Desktop',
    screenW: '1920', screenH: '1080', colorDepth: '24', viewportW: '1903', viewportH: '953',
    timezone: 'Europe/London', language: 'en-GB', cpuCores: '8', deviceMemGB: '8',
    touchPoints: '0', connType: '4g', connDownlink: '10', canvasHash: 'a1b2c3d4',
    webglRenderer: 'ANGLE (Intel, Intel(R) UHD Graphics)', webglVendor: 'Google Inc.',
    cookiesEnabled: 'true', doNotTrack: 'unset', fpCollectedAt: new Date().toISOString(),
  }
  return samples[key] ?? ''
}

function sampleValue(q) {
  switch (q.questionType) {
    case 'single_select':
    case 'dropdown': {
      const opt = q.options?.[0]
      return opt
        ? (opt.openText?.enabled ? `${opt.text}${COMPANION_SEP}Additional detail here` : opt.text)
        : 'Option A'
    }
    case 'multi_select': {
      const opts = q.options?.slice(0, 2) || []
      return opts.length
        ? opts.map(o => o.openText?.enabled ? `${o.text}${COMPANION_SEP}Detail` : o.text).join(MULTI_SEP)
        : `Option A${MULTI_SEP}Option B`
    }
    case 'open_text':      return 'Sample text response'
    case 'date':           return '2025-06-25'
    case 'slider': {
      const cfg = q.sliderConfig
      return String(cfg?.defaultValue ?? cfg?.min ?? 1)
    }
    case 'constant_sum': {
      const cfg   = q.constantSumConfig
      const items = cfg?.items || []
      const share = items.length ? Math.floor((cfg.targetSum || 100) / items.length) : 0
      return items.map(i => `${i.label}:${share}`).join(MULTI_SEP)
    }
    case 'matrix': {
      const cfg = q.matrixConfig
      return (cfg?.rows || []).slice(0, 2)
        .map(r => `${r.text}:${cfg?.columns?.[0]?.text || 'Column 1'}`)
        .join(MULTI_SEP)
    }
    case 'bipolar_matrix': {
      const cfg = q.bipolarConfig
      return (cfg?.rows || []).slice(0, 2)
        .map(r => `${r.text}:L=${cfg?.leftColumns?.[0]?.text || 'Left'},R=${cfg?.rightColumns?.[0]?.text || 'Right'}`)
        .join(MULTI_SEP)
    }
    case 'maxdiff': return `T1:Best=Item 1,Worst=Item 3${MULTI_SEP}T2:Best=Item 2,Worst=Item 1`
    case 'card_sort': {
      const cfg = q.cardSortConfig
      return (cfg?.cards || []).slice(0, 3)
        .map(c => `${c.text}->${cfg?.categories?.[0]?.label || 'Category A'}`)
        .join(MULTI_SEP)
    }
    case 'nps':         return `8${COMPANION_SEP}Passive`
    case 'star_rating': return `4`
    case 'ranking': {
      const cfg = q.rankingConfig
      return (cfg?.items || []).slice(0, 3)
        .map((item, i) => `${i + 1}.${item.text}`)
        .join(MULTI_SEP)
    }

    /* ── Image choice single ─────────────────────────────────────────── */
    case 'image_choice_single': {
      if (!answer) return ''
      const cfg = question.imageChoiceConfig
      const opt = cfg?.imageOptions?.find(o => o.id === answer)
      return opt?.text || ''
    }

    /* ── Image choice multi ──────────────────────────────────────────── */
    case 'image_choice_multi': {
      const cfg  = question.imageChoiceConfig
      const opts = cfg?.imageOptions || []
      const sel  = Array.isArray(answer) ? answer : []
      return sel.map(id => opts.find(o => o.id === id)?.text || id).filter(Boolean).join(MULTI_SEP)
    }

    /* ── Textbox List ─────────────────────────────────────────────────── */
    case 'image_choice_single': {
      const cfg = q.imageChoiceConfig
      return cfg?.imageOptions?.[0]?.text || 'Option 1'
    }
    case 'image_choice_multi': {
      const cfg = q.imageChoiceConfig
      return (cfg?.imageOptions || []).slice(0,2).map(o => o.text).join(MULTI_SEP)
    }
    case 'textbox_list': {
      const cfg  = question.textboxListConfig
      const vals = answer || {}
      if (!cfg?.rows?.length) return ''
      return cfg.rows
        .filter(r => vals[r.id]?.trim())
        .map(r => `${r.label}: ${vals[r.id]}`)
        .join(MULTI_SEP)
    }

    /* ── Semantic Differential ────────────────────────────────────────── */
    case 'semantic_diff': {
      const cfg  = question.semanticDiffConfig
      const vals = answer || {}
      if (!cfg?.rows?.length) return ''
      return cfg.rows
        .map(r => {
          const v = vals[r.id] ?? cfg.defaultValue
          return v != null ? `${r.leftLabel}↔${r.rightLabel}: ${v}` : null
        })
        .filter(Boolean)
        .join(MULTI_SEP)
    }

    /* ── Cascading Dropdown ───────────────────────────────────────────── */
    case 'cascade': {
      const cfg = question.cascadeConfig
      if (!answer?.l1) return ''
      const parts = []
      const l1 = cfg.items.find(i => i.id === answer.l1)
      if (l1) parts.push(`${cfg.levelLabels[0]}: ${l1.label}`)
      if (answer.l2) {
        const l2 = cfg.items.find(i => i.id === answer.l2)
        if (l2) parts.push(`${cfg.levelLabels[1]}: ${l2.label}`)
      }
      if (answer.l3) {
        const l3 = cfg.items.find(i => i.id === answer.l3)
        if (l3) parts.push(`${cfg.levelLabels[2]}: ${l3.label}`)
      }
      return parts.join(MULTI_SEP)
    }

    case 'image_choice_single': {
      const cfg = q.imageChoiceConfig
      return cfg?.imageOptions?.[0]?.text || 'Option 1'
    }
    case 'image_choice_multi': {
      const cfg = q.imageChoiceConfig
      return (cfg?.imageOptions || []).slice(0,2).map(o => o.text).join(MULTI_SEP)
    }
    case 'textbox_list': {
      const cfg = q.textboxListConfig
      return (cfg?.rows || []).slice(0, 2).map(r => `${r.label}: Sample answer`).join(MULTI_SEP)
    }
    case 'semantic_diff': {
      const cfg = q.semanticDiffConfig
      return (cfg?.rows || []).slice(0, 2).map(r => `${r.leftLabel}↔${r.rightLabel}: ${Math.ceil((cfg?.points||7)/2)}`).join(MULTI_SEP)
    }
    case 'cascade': {
      const cfg = q.cascadeConfig
      return `${cfg?.levelLabels?.[0] || 'L1'}: Option A|${cfg?.levelLabels?.[1] || 'L2'}: Sub-option|${cfg?.levelLabels?.[2] || 'L3'}: Detail`
    }
    default: return ''
  }
}

// ─── Trigger browser download ──────────────────────────────────────────────
export function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
