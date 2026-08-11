function emptyResponseStats() {
  return { total: 0, complete: 0, terminated: 0, partial: 0 }
}

function emptySurveyCounts() {
  return { total: 0, draft: 0, live: 0, paused: 0, closed: 0 }
}

export function buildStatsMap(groups) {
  const bySurvey = {}
  for (const row of groups) {
    if (!bySurvey[row.surveyId]) bySurvey[row.surveyId] = emptyResponseStats()
    const s = bySurvey[row.surveyId]
    s[row.status] = (s[row.status] ?? 0) + row._count
    s.total += row._count
  }
  return bySurvey
}

export function sumResponseStats(statsMap, surveyIds) {
  const out = emptyResponseStats()
  for (const id of surveyIds) {
    const s = statsMap[id]
    if (!s) continue
    out.total += s.total
    out.complete += s.complete
    out.terminated += s.terminated
    out.partial += s.partial
  }
  return out
}

export function completionRate(responses) {
  if (!responses?.total) return null
  return Math.round((responses.complete / responses.total) * 1000) / 10
}

export function surveyStatusCounts(surveys) {
  const counts = emptySurveyCounts()
  counts.total = surveys.length
  for (const row of surveys) {
    const status = row.survey?.status ?? 'draft'
    if (counts[status] !== undefined) counts[status]++
  }
  return counts
}

export function lastActivityAt(surveys) {
  if (!surveys.length) return null
  const latest = surveys.reduce((max, row) => {
    const t = row.updatedAt?.getTime?.() ?? new Date(row.updatedAt).getTime()
    return t > max ? t : max
  }, 0)
  return latest ? new Date(latest).toISOString() : null
}

export function employeeSummary(user, ownedSurveys, statsMap) {
  const surveyIds = ownedSurveys.map(s => s.id)
  const responses = sumResponseStats(statsMap, surveyIds)
  return {
    id:               user.id,
    username:         user.username || user.email,
    name:             user.name || user.username || user.email,
    role:             user.role,
    surveys:          surveyStatusCounts(ownedSurveys),
    responses,
    completionRate:   completionRate(responses),
    lastActivityAt:   lastActivityAt(ownedSurveys),
  }
}

export function surveyRowMeta(row, statsMap) {
  const survey = row.survey
  return {
    id:        row.id,
    title:     survey?.title ?? 'Untitled Survey',
    status:    survey?.status ?? 'draft',
    updatedAt: row.updatedAt.toISOString(),
    surveyCode: survey?.surveyCode ?? '',
    stats:     statsMap[row.id] || emptyResponseStats(),
  }
}
