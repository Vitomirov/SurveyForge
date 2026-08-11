// ─── External Redirect Engine ───────────────────────────────────────────────
// Redirect on Next when a question rule matches. Reuses shared rule evaluation.

import { resolveQuestionRuleTarget } from './resolveQuestionRuleTarget.js'

export function isSafeExternalUrl(url) {
  if (!url || typeof url !== 'string') return false
  try {
    const parsed = new URL(url.trim())
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function validUrl(url) {
  return isSafeExternalUrl(url) ? url.trim() : null
}

/** Matching rule on this question, or null. */
export function resolveExternalRedirectUrl(question, answer, responses, allItems) {
  const rules = question.externalRedirectRules || []
  if (!rules.length) return null

  return resolveQuestionRuleTarget({
    rules,
    logic: question.externalRedirectLogic,
    question,
    answer,
    responses,
    allItems,
    getRuleTarget: (rule) => validUrl(rule.externalUrl),
    getFallbackTarget: () => validUrl(question.externalRedirectNoneUrl),
  })
}

/** First matching rule across page questions (checked when respondent clicks Next). */
export function resolvePageExternalRedirect(pageQuestions, responses, allItems) {
  for (const q of pageQuestions) {
    const url = resolveExternalRedirectUrl(q, responses[q.id], responses, allItems)
    if (url) return url
  }
  return null
}

/** Open a validated external URL in a new tab; survey tab stays open. */
export function openExternalRedirect(url) {
  if (!isSafeExternalUrl(url)) return false
  const opened = window.open(url.trim(), '_blank', 'noopener,noreferrer')
  return Boolean(opened)
}
