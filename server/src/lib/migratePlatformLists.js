import {
  CANONICAL_CLIENTS,
  CANONICAL_TOPICS,
  normalizeSurveyPlatformIds,
} from './platformIds.js'

const newId = (prefix) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

async function ensureNamedRecords(prisma, organizationId, type, canonicalList) {
  const model = type === 'client' ? prisma.client : prisma.topic

  for (const { name } of canonicalList) {
    const existing = await model.findFirst({
      where: { organizationId, name },
    })
    if (existing) continue

    await model.create({
      data: {
        id: newId(type === 'client' ? 'c' : 't'),
        name,
        organizationId,
      },
    })
  }
}

async function normalizeOrgSurveys(prisma, organizationId) {
  const [clients, topics, rows] = await Promise.all([
    prisma.client.findMany({ where: { organizationId }, select: { id: true, name: true } }),
    prisma.topic.findMany({ where: { organizationId }, select: { id: true, name: true } }),
    prisma.survey.findMany({ where: { organizationId }, select: { id: true, survey: true } }),
  ])

  for (const row of rows) {
    const normalized = normalizeSurveyPlatformIds(row.survey, clients, topics)
    if (JSON.stringify(normalized) === JSON.stringify(row.survey)) continue
    await prisma.survey.update({
      where: { id: row.id },
      data: { survey: normalized },
    })
  }
}

/** Ensure default client/topic names exist and normalize stored survey metadata. */
export async function migratePlatformLists(prisma) {
  const orgs = await prisma.organization.findMany({ select: { id: true } })

  for (const org of orgs) {
    await ensureNamedRecords(prisma, org.id, 'client', CANONICAL_CLIENTS)
    await ensureNamedRecords(prisma, org.id, 'topic', CANONICAL_TOPICS)
    await normalizeOrgSurveys(prisma, org.id)
  }
}
