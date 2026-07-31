// ─── Piping utilities ───────────────────────────────────────────────────────
// Two features share this module:
//   1. Text piping   — {{qid:ID}} tokens in question/block text replaced at render time
//   2. Option piping — dynamic option list built from a source question's selections

// ─── Format a single answer for display in piped text ─────────────────────
function formatPipedAnswer(question, answer) {
  if (answer == null || answer === '') return '[not yet answered]'

  switch (question?.questionType) {
    case 'single_select':
    case 'dropdown': {
      const opt = question.options?.find(o => o.id === answer)
      return opt?.text || String(answer)
    }
    case 'multi_select': {
      const sel    = Array.isArray(answer) ? answer : [answer]
      const labels = sel
        .map(id => question.options?.find(o => o.id === id)?.text)
        .filter(Boolean)
      return labels.length ? labels.join(', ') : String(answer)
    }
    case 'open_text':
    case 'nps':
    case 'slider':
    case 'star_rating':  return String(answer)
    case 'ranking': {
      const cfg   = question.rankingConfig
      const order = Array.isArray(answer) ? answer : []
      return order
        .map((id, i) => {
          const item = cfg?.items?.find(it => it.id === id)
          return item?.text ? `${i + 1}. ${item.text}` : null
        })
        .filter(Boolean)
        .join(', ')
    }
    case 'constant_sum': {
      const cfg  = question.constantSumConfig
      const vals = answer || {}
      return (cfg?.items || [])
        .map(item => `${item.label}: ${vals[item.id] || 0}`)
        .join(', ')
    }
    default:
      if (typeof answer === 'object') return JSON.stringify(answer)
      return String(answer)
  }
}

// ─── Resolve all piping tokens in a text string ───────────────────────────
// Tokens: {{qid:QUESTION_ID}}
// Returns the string with every token replaced by the formatted answer.
// If the source question hasn't been answered yet, renders [not yet answered].
export function resolvePipingTokens(text, responses, items) {
  if (!text || !text.includes('{{qid:')) return text
  return text.replace(/\{\{qid:([^}]+)\}\}/g, (match, questionId) => {
    const question = items.find(i => i.id === questionId && i.itemType === 'question')
    if (!question) return match   // unknown ID — leave token as-is
    const answer = responses[questionId]
    return formatPipedAnswer(question, answer)
  })
}

// ─── Build token string to insert into text ───────────────────────────────
export function makeToken(questionId) {
  return `{{qid:${questionId}}}`
}

// ─── Option piping: build dynamic options from source question's answers ──
// For a question with pipedOptionsConfig.enabled = true, returns an array of
// option objects built from whatever the respondent selected in the source Q.
// Falls back to the question's own manually-entered options if piping isn't
// configured or the source hasn't been answered yet.
export function buildPipedOptions(question, responses, items) {
  const cfg = question.pipedOptionsConfig
  if (!cfg?.enabled || !cfg.sourceQuestionId) return question.options || []

  const sourceQ = items.find(i => i.id === cfg.sourceQuestionId && i.itemType === 'question')
  if (!sourceQ) return []

  const answer = responses[cfg.sourceQuestionId]
  if (!answer) return []

  const selectedIds = Array.isArray(answer) ? answer : [answer]

  // Return option objects with the SAME IDs as in the source question so that
  // any termination rules referencing those IDs still work transparently.
  return selectedIds
    .map(id => sourceQ.options?.find(o => o.id === id))
    .filter(Boolean)
}

// ─── Which question types can be SOURCE for option piping ─────────────────
// Only types that store a list of selected option IDs are valid sources.
const PIPEABLE_SOURCE_TYPES = [
  'single_select',
  'multi_select',
  'dropdown',
  'image_choice_single',
  'image_choice_multi',
]

export function isPipeableSource(questionType) {
  return PIPEABLE_SOURCE_TYPES.includes(questionType)
}
