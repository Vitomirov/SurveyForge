// ─── Per-question rule variants (builder UI) ────────────────────────────────
// Resolves choice | text | date | slider for non-matrix rules.
// Runtime evaluation stays in terminationEngine.resolveQuestionRuleType.

import { isChoiceType } from '../questions/questionHelpers.js'
import { getBuilderConditionOptions } from '../questions/questionOptions.js'
import { TEXT_OPERATORS } from './conditionConstants.js'
import {
  dateOperatorNeedsEndValue,
  dateOperatorNeedsValue,
  formatDateConditionPhrase,
} from './dateOperators.js'
import {
  formatSliderConditionPhrase,
  sliderOperatorNeedsEndValue,
  sliderOperatorNeedsValue,
} from './sliderOperators.js'

export const RULE_VARIANT = {
  CHOICE: 'choice',
  TEXT: 'text',
  DATE: 'date',
  SLIDER: 'slider',
}

function questionType(question) {
  return question?.questionType
}

/** Default ruleType when adding a rule (matches surveyReducer). */
export function defaultRuleTypeForQuestion(question, requestedType) {
  if (requestedType) return requestedType
  const qt = questionType(question)
  if (qt === 'matrix') return 'matrix'
  if (qt === 'open_text') return 'text'
  if (qt === 'date') return 'date'
  if (qt === 'slider') return 'slider'
  return 'choice'
}

/** Rule type for the Date / Slider / Text add-rule button. */
export function defaultTextOrValueRuleType(question) {
  const qt = questionType(question)
  if (qt === 'date') return 'date'
  if (qt === 'slider') return 'slider'
  return 'text'
}

export function textOrValueRuleButtonLabel(question) {
  const t = defaultTextOrValueRuleType(question)
  if (t === 'date') return 'Date rule'
  if (t === 'slider') return 'Slider rule'
  return 'Text rule'
}

export function questionSupportsChoiceRules(question) {
  return isChoiceType(questionType(question)) || Boolean(question?.pipedOptionsConfig?.enabled)
}

/**
 * Builder variant for a non-matrix rule. Returns null for matrix
 * (matrix cards stay in Branch / Redirect editors).
 */
export function resolveRuleVariant(rule, question) {
  if (rule?.ruleType === 'matrix' || questionType(question) === 'matrix') return null

  const qt = questionType(question)
  if (qt === 'date') return RULE_VARIANT.DATE
  if (qt === 'slider') return RULE_VARIANT.SLIDER
  if (qt === 'open_text') return RULE_VARIANT.TEXT
  if (rule?.ruleType === 'date') return RULE_VARIANT.DATE
  if (rule?.ruleType === 'slider') return RULE_VARIANT.SLIDER
  if (rule?.ruleType === 'text') return RULE_VARIANT.TEXT
  return RULE_VARIANT.CHOICE
}

export function isValueVariant(variant) {
  return variant === RULE_VARIANT.DATE || variant === RULE_VARIANT.SLIDER
}

export function isValueRule(rule, question) {
  return isValueVariant(resolveRuleVariant(rule, question))
}

function valueRuleIsConfigured(rule, needsValue, needsEndValue) {
  if (!needsValue(rule.textOperator)) return true
  if (!String(rule.textValue ?? '').trim()) return false
  if (needsEndValue(rule.textOperator) && !String(rule.textValue2 ?? '').trim()) return false
  return true
}

export function ruleIsConfigured(rule, question) {
  const variant = resolveRuleVariant(rule, question)
  if (variant === RULE_VARIANT.CHOICE) return Boolean(rule.optionIds?.length)
  if (variant === RULE_VARIANT.DATE) {
    return valueRuleIsConfigured(rule, dateOperatorNeedsValue, dateOperatorNeedsEndValue)
  }
  if (variant === RULE_VARIANT.SLIDER) {
    return valueRuleIsConfigured(rule, sliderOperatorNeedsValue, sliderOperatorNeedsEndValue)
  }
  return Boolean(rule.textValue)
}

export function ruleSummaryPhrase(rule, question, contextItems = []) {
  const variant = resolveRuleVariant(rule, question)
  if (!variant) return ''

  if (variant === RULE_VARIANT.DATE) {
    return `Date ${formatDateConditionPhrase(rule.textOperator, rule.textValue, rule.textValue2)}`
  }
  if (variant === RULE_VARIANT.SLIDER) {
    return `Slider ${formatSliderConditionPhrase(rule.textOperator, rule.textValue, rule.textValue2)}`
  }
  if (variant === RULE_VARIANT.TEXT) {
    const op = TEXT_OPERATORS.find(o => o.value === rule.textOperator)?.label || rule.textOperator
    return `Answer ${op} "${rule.textValue || '…'}"`
  }

  const opts = getBuilderConditionOptions(question, contextItems)
  const labels = (rule.optionIds || []).map(id => opts.find(o => o.id === id)?.text || '?')
  if (!labels.length) return 'No options selected'
  if (rule.matchMode === 'all') return `ALL of: ${labels.join(' + ')}`
  return `ANY of: ${labels.join(', ')}`
}
