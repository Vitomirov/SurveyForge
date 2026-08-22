/**
 * Server-side gates for finalizing a response as complete (or client-claimed dnc).
 * Closes empty-complete forgery and DNC bypass by omitting the email answer.
 * Does not re-run the full client visibility/termination engines.
 */
import { extractResponseEmail, findEmailQuestion } from './dncCheck.js'

export function isAnswerEmpty(answer) {
  if (answer === null || answer === undefined || answer === '') return true
  if (Array.isArray(answer) && answer.length === 0) return true
  if (typeof answer === 'object' && !Array.isArray(answer)) {
    const values = Object.values(answer)
    if (values.length === 0) return true
    return values.every(isAnswerEmpty)
  }
  return false
}

/**
 * Validate that a complete/dnc submission has enough answers to finalize.
 * @returns {{ ok: true } | { ok: false, code: 'EMAIL_REQUIRED' | 'INCOMPLETE_ANSWERS' }}
 */
export function validateCompleteAnswers(entry, surveyItems = []) {
  const questions = (surveyItems || []).filter(item => item?.itemType === 'question')
  if (questions.length === 0) return { ok: true }

  const responses = entry?.responses && typeof entry.responses === 'object' && !Array.isArray(entry.responses)
    ? entry.responses
    : {}

  if (findEmailQuestion(surveyItems) && !extractResponseEmail(entry, surveyItems)) {
    return { ok: false, code: 'EMAIL_REQUIRED' }
  }

  for (const question of questions) {
    if (!question.required) continue
    if (isAnswerEmpty(responses[question.id])) {
      return { ok: false, code: 'INCOMPLETE_ANSWERS' }
    }
  }

  const anyAnswer = questions.some(q => !isAnswerEmpty(responses[q.id]))
  if (!anyAnswer) {
    return { ok: false, code: 'INCOMPLETE_ANSWERS' }
  }

  return { ok: true }
}
