/**
 * Authenticated response-notification feed.
 * Scoped the same way as the dashboard: editors see their surveys, admins see the org.
 */
import { surveyScope } from '../lib/auth/authz.js'
import { buildNotificationsForSurveys } from '../lib/notifications/responseNotifications.js'

export async function registerNotificationRoutes(app) {
  app.get('/api/notifications/responses', async (request) => {
    const rows = await app.prisma.survey.findMany({
      where: surveyScope(request),
      select: { id: true, survey: true },
      orderBy: { updatedAt: 'desc' },
    })

    const surveys = rows.map(row => ({
      id: row.id,
      title: row.survey?.title || 'Untitled Survey',
    }))

    return buildNotificationsForSurveys(app.prisma, {
      organizationId: request.organizationId,
      surveys,
    })
  })
}
