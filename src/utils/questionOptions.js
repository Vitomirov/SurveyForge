// ─── Effective question options ───────────────────────────────────────────────
// Resolves manually-entered vs dynamically piped options for conditions,
// termination rules, and the taker UI.

import { buildPipedOptions, getPipedOptionCatalog } from '@/utils/piping'

export { getPipedOptionCatalog } from '@/utils/piping'

/** Resolve one option label for summaries / cause strings. */
export function resolveOptionLabel(question, optionId, contextItems = []) {
  if (!question || !optionId) return '?'
  const opts = getBuilderConditionOptions(question, contextItems)
  return opts.find(o => o.id === optionId)?.text || '?'
}

/**
 * Options visible to a respondent at runtime (piped or manual).
 */
export function getEffectiveOptions(question, responses, allItems) {
  if (question.pipedOptionsConfig?.enabled) {
    const piped = buildPipedOptions(question, responses, allItems)
    if (piped.length) return piped
    const source = allItems.find(i => i.id === question.pipedOptionsConfig.sourceQuestionId)
    const catalog = getPipedOptionCatalog(source, question.pipedOptionsConfig)
    if (catalog.length) return catalog
  }
  return question.options || []
}

/**
 * Options shown in builder UIs for conditions/termination on a question.
 */
export function getBuilderConditionOptions(question, contextItems = []) {
  const pipeCfg = question.pipedOptionsConfig
  if (pipeCfg?.enabled && pipeCfg.sourceQuestionId) {
    const source = contextItems.find(i => i.id === pipeCfg.sourceQuestionId)
    const catalog = getPipedOptionCatalog(source, pipeCfg)
    if (catalog.length) return catalog
  }
  return question.options || []
}
