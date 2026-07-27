import { fpColumns } from '@/utils/fingerprint'
import { rowsToCSV } from './csvFormatting'
import { formatAnswer } from './formatAnswer'
import { sampleValue, fpSampleValue } from './sampleValue'

function buildHeaders(surveyItems, survey) {
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

  return { questions, fpCols, headers }
}

/**
 * @param {Array}  surveyItems     - flat items array from the survey store
 * @param {Array}  responsesArray  - array of { id, timestamp, status, responses, companions, fingerprint }
 * @param {object} [survey]        - survey object for fingerprint column settings
 */
export function generateCSV(surveyItems, responsesArray, survey = null) {
  const { questions, fpCols, headers } = buildHeaders(surveyItems, survey)

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

  return rowsToCSV([headers, ...rows])
}

/** Generate a template CSV (header row + one annotated example row). */
export function generateTemplateCSV(surveyItems, survey = null) {
  const { questions, fpCols, headers } = buildHeaders(surveyItems, survey)

  const sampleRow = [
    'R001',
    new Date().toISOString(),
    'complete',
    ...questions.map(q => sampleValue(q)),
    ...fpCols.map(c => fpSampleValue(c.key)),
  ]

  return rowsToCSV([headers, sampleRow])
}
