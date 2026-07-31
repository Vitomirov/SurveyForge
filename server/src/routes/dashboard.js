function surveyMeta(row) {
  const survey = row.survey
  const items = Array.isArray(row.items) ? row.items : []
  return {
    id:           row.id,
    title:        survey?.title ?? 'Untitled Survey',
    status:       survey?.status ?? 'draft',
    updatedAt:    row.updatedAt.toISOString(),
    internalName: survey?.internalName ?? '',
    surveyCode:   survey?.surveyCode ?? '',
    clientId:     survey?.clientId ?? '',
    topicId:      survey?.topicId ?? '',
    surveyType:   survey?.surveyType ?? '',
    questionCount: items.filter(i => i?.itemType === 'question').length,
  }
}

function emptyStats() {
  return { total: 0, complete: 0, terminated: 0, partial: 0 }
}

function buildStatsMap(groups) {
  const bySurvey = {}
  for (const row of groups) {
    if (!bySurvey[row.surveyId]) bySurvey[row.surveyId] = emptyStats()
    const s = bySurvey[row.surveyId]
    s[row.status] = (s[row.status] ?? 0) + row._count
    s.total += row._count
  }
  return bySurvey
}

export async function registerDashboardRoutes(app) {
  app.get('/api/dashboard', async (request) => {
    const orgId = request.organizationId

    const rows = await app.prisma.survey.findMany({
      where: { organizationId: orgId },
      orderBy: { updatedAt: 'desc' },
    })

    const groups = await app.prisma.response.groupBy({
      by: ['surveyId', 'status'],
      where: { organizationId: orgId },
      _count: { _all: true },
    })

    const statsMap = buildStatsMap(groups.map(g => ({
      surveyId: g.surveyId,
      status: g.status,
      _count: g._count._all,
    })))

    return {
      surveys: rows.map(row => ({
        ...surveyMeta(row),
        stats: statsMap[row.id] || emptyStats(),
      })),
    }
  })
}
