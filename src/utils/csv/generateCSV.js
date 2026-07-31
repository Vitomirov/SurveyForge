import { fpColumns } from '@/utils/deviceSignals'
import { rowsToCSV, rowsToCSVLines } from './csvFormatting'
import { formatAnswer } from './formatAnswer'
import { sampleValue, fpSampleValue } from './sampleValue'
import { applyFilters } from '@/utils/responseStore'

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

function responseToRow(entry, idx, questions, fpCols) {
  const { id, timestamp, status, responses, companions, fingerprint } = entry
  return [
    id        || `R${String(idx + 1).padStart(3, '0')}`,
    timestamp || new Date().toISOString(),
    status    || 'complete',
    ...questions.map(q => formatAnswer(q, responses, companions)),
    ...fpCols.map(c => fingerprint?.[c.key] ?? ''),
  ]
}

function responsesToRows(responsesArray, questions, fpCols) {
  return responsesArray.map((entry, idx) => responseToRow(entry, idx, questions, fpCols))
}

/**
 * @param {Array}  surveyItems     - flat items array from the survey store
 * @param {Array}  responsesArray  - array of { id, timestamp, status, responses, companions, fingerprint }
 * @param {object} [survey]        - survey object for fingerprint column settings
 */
export function generateCSV(surveyItems, responsesArray, survey = null) {
  const { questions, fpCols, headers } = buildHeaders(surveyItems, survey)
  const rows = responsesToRows(responsesArray, questions, fpCols)
  return rowsToCSV([headers, ...rows])
}

/**
 * Paginate API responses, apply filters per page, and build CSV without
 * holding the full response set in memory.
 */
export async function generateCSVFromApiPages(surveyItems, survey, filters, fetchPage) {
  const { questions, fpCols, headers } = buildHeaders(surveyItems, survey)
  let csv = rowsToCSV([headers])
  let page = 1
  let total = Infinity
  let fetched = 0
  let rowIndex = 0

  while (fetched < total) {
    const data = await fetchPage(page)
    total = data.total
    const batch = applyFilters(data.responses, filters)
    if (batch.length) {
      const lines = rowsToCSVLines(
        batch.map(entry => responseToRow(entry, rowIndex++, questions, fpCols))
      )
      csv += '\r\n' + lines
    }
    fetched += data.responses.length
    if (data.responses.length === 0) break
    page++
  }

  return csv
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
