import { requireRole } from '../lib/authz.js'
import { ROLES } from '../lib/roles.js'
import {
  buildStatsMap,
  employeeSummary,
  surveyRowMeta,
} from '../lib/employeeStats.js'

const adminOnly = requireRole(ROLES.ADMIN)

async function loadOrgPerformance(prisma, organizationId) {
  const [users, surveys, groups] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
      },
    }),
    prisma.survey.findMany({
      where: { organizationId },
      select: {
        id: true,
        survey: true,
        updatedAt: true,
        createdById: true,
      },
    }),
    prisma.response.groupBy({
      by: ['surveyId', 'status'],
      where: { organizationId },
      _count: { _all: true },
    }),
  ])

  const statsMap = buildStatsMap(groups.map(g => ({
    surveyId: g.surveyId,
    status: g.status,
    _count: g._count._all,
  })))

  const surveysByOwner = new Map()
  for (const row of surveys) {
    const ownerId = row.createdById
    if (!ownerId) continue
    if (!surveysByOwner.has(ownerId)) surveysByOwner.set(ownerId, [])
    surveysByOwner.get(ownerId).push(row)
  }

  return { users, surveysByOwner, statsMap }
}

export async function registerAdminRoutes(app) {
  app.get('/api/admin/employees', { preHandler: adminOnly }, async (request) => {
    const { users, surveysByOwner, statsMap } = await loadOrgPerformance(
      app.prisma, request.organizationId
    )

    return {
      employees: users.map(user => employeeSummary(
        user,
        surveysByOwner.get(user.id) ?? [],
        statsMap,
      )),
    }
  })

  app.get('/api/admin/employees/:id', { preHandler: adminOnly }, async (request, reply) => {
    const { users, surveysByOwner, statsMap } = await loadOrgPerformance(
      app.prisma, request.organizationId
    )

    const user = users.find(u => u.id === request.params.id)
    if (!user) return reply.code(404).send({ error: 'Employee not found' })

    const owned = surveysByOwner.get(user.id) ?? []
    owned.sort((a, b) => b.updatedAt - a.updatedAt)

    return {
      employee: employeeSummary(user, owned, statsMap),
      surveys: owned.map(row => surveyRowMeta(row, statsMap)),
    }
  })
}
