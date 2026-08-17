/**
 * Legacy platform list ID migration.
 * One-time startup job that rewrites stored survey metadata from legacy
 * hardcoded IDs to current org client/topic/survey-type records.
 */
import { normalizeSurveyPlatformIds } from './platformIds.js'

async function normalizeOrgSurveys(prisma, organizationId) {
  const [clients, topics, surveyTypes, rows] = await Promise.all([
    prisma.client.findMany({ where: { organizationId }, select: { id: true, name: true } }),
    prisma.topic.findMany({ where: { organizationId }, select: { id: true, name: true } }),
    prisma.surveyType.findMany({ where: { organizationId }, select: { id: true, name: true } }),
    prisma.survey.findMany({ where: { organizationId }, select: { id: true, survey: true } }),
  ])

  for (const row of rows) {
    const normalized = normalizeSurveyPlatformIds(row.survey, clients, topics, surveyTypes)
    if (JSON.stringify(normalized) === JSON.stringify(row.survey)) continue
    await prisma.survey.update({
      where: { id: row.id },
      data: { survey: normalized },
    })
  }
}

/** Normalize stored survey metadata (legacy IDs → current org records). */
export async function migratePlatformLists(prisma) {
  const orgs = await prisma.organization.findMany({ select: { id: true } })

  for (const org of orgs) {
    await normalizeOrgSurveys(prisma, org.id)
  }
}
