// ═══════════════════════════════════════════════════════════════════════════
// SIMULATION ENGINE
// Walks page-by-page, logging every decision and checking termination.
// ═══════════════════════════════════════════════════════════════════════════

import { buildVisiblePages } from '@/utils/visibilityEngine'
import { evalBlock, checkTermination } from '@/utils/terminationEngine'
import { resolveBranchTargetPage } from '@/utils/branchEngine'
import { resolvePageExternalRedirect } from '@/utils/externalRedirectEngine'
import { clip } from './branchAnalysis'
import { buildResponses } from './answerGeneration'

function formatAnswer(q, answer) {
  if (answer === null || answer === undefined) return '(no answer)'
  switch (q.questionType) {
    case 'single_select':
    case 'dropdown': {
      const opt = q.options?.find(o => o.id === answer)
      return opt?.text ? `"${clip(opt.text, 30)}"` : String(answer)
    }
    case 'multi_select': {
      const labels = (Array.isArray(answer) ? answer : []).map(id =>
        `"${clip(q.options?.find(o => o.id === id)?.text || id, 20)}"`
      )
      return labels.join(', ') || '(none)'
    }
    case 'open_text': return `"${clip(String(answer), 40)}"`
    case 'slider':    return String(answer)
    case 'date':      return answer
    case 'constant_sum': {
      const cfg = q.constantSumConfig
      const parts = (cfg?.items || []).map(i => `${clip(i.label, 15)}: ${answer[i.id] || 0}`)
      return parts.join(' · ')
    }
    case 'maxdiff': {
      const keys = Object.keys(answer || {})
      return `${keys.length} trial${keys.length !== 1 ? 's' : ''} answered`
    }
    case 'card_sort': return 'Cards assigned'
    case 'matrix':    return `${Object.keys(answer || {}).length} rows answered`
    case 'bipolar_matrix': return `${Object.keys(answer || {}).length} rows answered`
    default: return String(answer)
  }
}

export function runSimulation(items, survey, branch) {
  const responses = buildResponses(items, branch)
  const log       = []

  const { pages, blocksByPage: blockMap } = buildVisiblePages(items, responses)

  const allQuestions = items.filter(i => i.itemType === 'question')
  const getQNum      = id => allQuestions.findIndex(q => q.id === id) + 1

  const visibleQIds = new Set(pages.flatMap(p => p.filter(i => i.itemType === 'question').map(i => i.id)))
  const hiddenQCount = allQuestions.filter(q => !visibleQIds.has(q.id)).length
  if (hiddenQCount > 0) {
    log.push({ type: 'nav', label: `${hiddenQCount} question${hiddenQCount !== 1 ? 's' : ''} hidden by conditional visibility rules` })
  }

  let outcome = null

  for (let p = 0; p < pages.length; p++) {
    const pageQ     = pages[p].filter(i => i.itemType === 'question')
    const pageBlocks = blockMap[p] || []
    const pageLabel  = pages.length > 1 ? `Page ${p + 1}` : 'Survey'

    if (pageQ.length > 0) {
      log.push({
        type:  'page',
        label: pageLabel,
        items: pageQ.map(q => ({
          qNum:    getQNum(q.id),
          text:    clip(q.text) || '(untitled)',
          answer:  formatAnswer(q, responses[q.id]),
          qType:   q.questionType,
        })),
      })
    }

    for (const q of pageQ) {
      const result = checkTermination(q, responses[q.id], responses, items)
      if (result.terminated) {
        log.push({ type: 'terminate', source: `Q${getQNum(q.id)}: "${clip(q.text)}"`, reason: result.cause })
        outcome = { type: 'terminated', source: `Q${getQNum(q.id)}`, reason: result.cause }
        return { outcome, log, responses }
      }
    }

    for (const block of pageBlocks) {
      if (block.conditions?.length && evalBlock(block, responses, items)) {
        const reason = `Conditions satisfied in "${block.title || 'Termination Block'}"`
        log.push({ type: 'terminate', source: `Block: ${block.title || 'Termination Block'}`, reason })
        outcome = { type: 'terminated', source: `Block`, reason }
        return { outcome, log, responses }
      } else if (block.conditions?.length) {
        log.push({ type: 'block-pass', label: block.title || 'Termination Block' })
      }
    }

    if (p < pages.length - 1) {
      const redirectUrl = resolvePageExternalRedirect(pageQ, responses, items)
      if (redirectUrl) {
        log.push({ type: 'nav', label: `External redirect to ${clip(redirectUrl, 50)}` })
        outcome = { type: 'redirected', url: redirectUrl }
        return { outcome, log, responses }
      }

      const branchTarget = resolveBranchTargetPage(pageQ, responses, items, pages, p)
      if (branchTarget !== null) {
        log.push({ type: 'nav', label: `Branch skip to page ${branchTarget + 1}` })
        p = branchTarget - 1
        continue
      }
      log.push({ type: 'nav', label: `Advanced to page ${p + 2}` })
    }
  }

  outcome = { type: 'complete' }
  log.push({ type: 'complete', label: 'Survey completed successfully' })
  return { outcome, log, responses }
}
