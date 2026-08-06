// ─── External Redirect Engine ───────────────────────────────────────────────
// Instant redirect when a question rule matches. Reuses evaluateQuestionRule.

import { evaluateQuestionRule } from '@/utils/terminationEngine'

export function isSafeExternalUrl(url) {
  if (!url || typeof url !== 'string') return false
  try {
    const parsed = new URL(url.trim())
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/** First matching rule on this question, or null. */
export function resolveExternalRedirectUrl(question, answer, responses, allItems) {
  for (const rule of question.externalRedirectRules || []) {
    if (!isSafeExternalUrl(rule.externalUrl)) continue
    if (!evaluateQuestionRule(rule, question, answer, responses, allItems)) continue
    return rule.externalUrl.trim()
  }
  return null
}

/** First matching rule across page questions (for Next-click text rules). */
export function resolvePageExternalRedirect(pageQuestions, responses, allItems) {
  for (const q of pageQuestions) {
    const url = resolveExternalRedirectUrl(q, responses[q.id], responses, allItems)
    if (url) return url
  }
  return null
}

/** Choice/matrix redirect on answer change; text rules wait for Next. */
export function redirectsOnAnswerChange(question) {
  if (question.questionType === 'open_text') return false
  return (question.externalRedirectRules || []).some(r =>
    (r.ruleType || 'choice') !== 'text' && isSafeExternalUrl(r.externalUrl)
  )
}
