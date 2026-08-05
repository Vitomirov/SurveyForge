import { requireRole, requirePlatformOwner } from '../lib/authz.js'
import { ROLES } from '../lib/roles.js'
import {
  serializeSubscription,
  serializeInvoice,
  planById,
} from '../lib/billingPlans.js'
import { ensureOrgBilling, ensureSupportThread } from '../lib/billingDefaults.js'
import {
  countOrgBillingNotifications,
  countVendorNotifications,
  markOrgBillingSeen,
  markVendorThreadSeen,
} from '../lib/billingNotifications.js'

const adminOnly = requireRole(ROLES.ADMIN)

function messageRow(row) {
  return {
    id:        row.id,
    body:      row.body,
    createdAt: row.createdAt.toISOString(),
    author: {
      id:       row.author.id,
      name:     row.author.name || row.author.username || row.author.email,
      username: row.author.username || row.author.email,
      role:     row.author.role,
    },
  }
}

async function loadSupportThread(prisma, organizationId) {
  const thread = await ensureSupportThread(prisma, organizationId)
  const messages = await prisma.supportMessage.findMany({
    where: { threadId: thread.id },
    orderBy: { createdAt: 'asc' },
    include: {
      author: {
        select: { id: true, name: true, username: true, email: true, role: true },
      },
    },
  })
  return { thread, messages }
}

export async function registerBillingRoutes(app) {
  app.get('/api/billing/notifications', { preHandler: adminOnly }, async (request) => {
    return countOrgBillingNotifications(app.prisma, request.organizationId)
  })

  app.post('/api/billing/notifications/seen', { preHandler: adminOnly }, async (request) => {
    await markOrgBillingSeen(app.prisma, request.organizationId)
    return { ok: true }
  })

  app.get('/api/billing/overview', { preHandler: adminOnly }, async (request) => {
    const orgId = request.organizationId
    const subscription = await ensureOrgBilling(app.prisma, orgId)
    const invoices = await app.prisma.invoice.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 12,
    })

    return {
      subscription: serializeSubscription(subscription),
      invoices:     invoices.map(serializeInvoice),
    }
  })

  app.get('/api/billing/invoices', { preHandler: adminOnly }, async (request) => {
    const rows = await app.prisma.invoice.findMany({
      where: { organizationId: request.organizationId },
      orderBy: { createdAt: 'desc' },
    })
    return { invoices: rows.map(serializeInvoice) }
  })

  app.get('/api/billing/support', { preHandler: adminOnly }, async (request) => {
    const { thread, messages } = await loadSupportThread(app.prisma, request.organizationId)
    return {
      thread: {
        id:     thread.id,
        status: thread.status,
      },
      messages: messages.map(messageRow),
    }
  })

  app.post('/api/billing/support/messages', { preHandler: adminOnly }, async (request, reply) => {
    const body = request.body?.body?.trim()
    if (!body) {
      return reply.code(400).send({ error: 'Message body is required.' })
    }

    const thread = await ensureSupportThread(app.prisma, request.organizationId)
    const row = await app.prisma.supportMessage.create({
      data: {
        threadId: thread.id,
        authorId: request.auth.userId,
        body,
      },
      include: {
        author: {
          select: { id: true, name: true, username: true, email: true, role: true },
        },
      },
    })

    await app.prisma.supportThread.update({
      where: { id: thread.id },
      data: { status: 'open', orgLastReadAt: new Date() },
    })

    return { message: messageRow(row) }
  })
}

export async function registerVendorRoutes(app) {
  app.get('/api/vendor/notifications', { preHandler: requirePlatformOwner }, async () => {
    return countVendorNotifications(app.prisma)
  })

  app.post('/api/vendor/notifications/seen/:orgId', { preHandler: requirePlatformOwner }, async (request, reply) => {
    const org = await app.prisma.organization.findUnique({
      where: { id: request.params.orgId },
      select: { id: true },
    })
    if (!org) return reply.code(404).send({ error: 'Organization not found' })
    await markVendorThreadSeen(app.prisma, org.id)
    return { ok: true }
  })

  app.get('/api/vendor/organizations', { preHandler: requirePlatformOwner }, async () => {
    const orgs = await app.prisma.organization.findMany({
      orderBy: { name: 'asc' },
      include: {
        subscription: true,
        supportThread: true,
        _count: { select: { users: true, surveys: true } },
      },
    })

    const notifications = await countVendorNotifications(app.prisma)
    const unreadByOrg = new Map(
      notifications.organizations.map(o => [o.organizationId, o.unreadMessages])
    )

    return {
      organizations: orgs.map(org => ({
        id:           org.id,
        name:         org.name,
        createdAt:    org.createdAt.toISOString(),
        userCount:    org._count.users,
        surveyCount:  org._count.surveys,
        unreadMessages: unreadByOrg.get(org.id) ?? 0,
        subscription: org.subscription
          ? serializeSubscription(org.subscription)
          : null,
      })),
    }
  })

  app.get('/api/vendor/organizations/:orgId', { preHandler: requirePlatformOwner }, async (request, reply) => {
    const org = await app.prisma.organization.findUnique({
      where: { id: request.params.orgId },
      include: {
        subscription: true,
        invoices: { orderBy: { createdAt: 'desc' }, take: 24 },
        _count: { select: { users: true, surveys: true } },
      },
    })
    if (!org) return reply.code(404).send({ error: 'Organization not found' })

    const subscription = org.subscription
      ?? await ensureOrgBilling(app.prisma, org.id)

    return {
      organization: {
        id:          org.id,
        name:        org.name,
        createdAt:   org.createdAt.toISOString(),
        userCount:   org._count.users,
        surveyCount: org._count.surveys,
      },
      subscription: serializeSubscription(subscription),
      invoices:     org.invoices.map(serializeInvoice),
    }
  })

  app.patch('/api/vendor/organizations/:orgId/subscription', { preHandler: requirePlatformOwner }, async (request, reply) => {
    const { planId, status, seats, priceCents, currentPeriodEnd } = request.body ?? {}
    const org = await app.prisma.organization.findUnique({
      where: { id: request.params.orgId },
    })
    if (!org) return reply.code(404).send({ error: 'Organization not found' })

    await ensureOrgBilling(app.prisma, org.id)

    const data = {}
    if (planId != null) {
      data.planId = planId
      const plan = planById(planId)
      if (plan) {
        data.seats = plan.seats
        data.priceCents = plan.priceCents
      }
    }
    if (status != null) data.status = status
    if (seats != null && planId == null) data.seats = Number(seats)
    if (priceCents != null && planId == null) data.priceCents = Number(priceCents)
    if (currentPeriodEnd != null) data.currentPeriodEnd = new Date(currentPeriodEnd)

    const updated = await app.prisma.subscription.update({
      where: { organizationId: org.id },
      data,
    })

    return { subscription: serializeSubscription(updated) }
  })

  app.post('/api/vendor/organizations/:orgId/invoices', { preHandler: requirePlatformOwner }, async (request, reply) => {
    const org = await app.prisma.organization.findUnique({
      where: { id: request.params.orgId },
    })
    if (!org) return reply.code(404).send({ error: 'Organization not found' })

    const {
      amountCents, currency, status, description,
      periodStart, periodEnd, dueDate,
    } = request.body ?? {}

    if (amountCents == null || Number.isNaN(Number(amountCents))) {
      return reply.code(400).send({ error: 'amountCents is required.' })
    }

    const row = await app.prisma.invoice.create({
      data: {
        organizationId: org.id,
        amountCents:    Number(amountCents),
        currency:       currency || 'USD',
        status:         status || 'open',
        description:    description?.trim() || null,
        periodStart:    periodStart ? new Date(periodStart) : null,
        periodEnd:      periodEnd ? new Date(periodEnd) : null,
        dueDate:        dueDate ? new Date(dueDate) : null,
      },
    })

    return { invoice: serializeInvoice(row) }
  })

  app.patch('/api/vendor/invoices/:id', { preHandler: requirePlatformOwner }, async (request, reply) => {
    const existing = await app.prisma.invoice.findUnique({
      where: { id: request.params.id },
    })
    if (!existing) return reply.code(404).send({ error: 'Invoice not found' })

    const { status, description, dueDate, paidAt } = request.body ?? {}
    const data = {}
    if (status != null) data.status = status
    if (description !== undefined) data.description = description?.trim() || null
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null
    if (paidAt !== undefined) data.paidAt = paidAt ? new Date(paidAt) : null

    const updated = await app.prisma.invoice.update({
      where: { id: existing.id },
      data,
    })

    return { invoice: serializeInvoice(updated) }
  })

  app.get('/api/vendor/support/threads', { preHandler: requirePlatformOwner }, async () => {
    const threads = await app.prisma.supportThread.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        organization: { select: { id: true, name: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            author: {
              select: { id: true, name: true, username: true, email: true, role: true },
            },
          },
        },
      },
    })

    return {
      threads: threads.map(t => ({
        id:               t.id,
        status:           t.status,
        updatedAt:        t.updatedAt.toISOString(),
        organizationId:   t.organizationId,
        organizationName: t.organization.name,
        lastMessage:      t.messages[0] ? messageRow(t.messages[0]) : null,
      })),
    }
  })

  app.get('/api/vendor/support/threads/:orgId', { preHandler: requirePlatformOwner }, async (request, reply) => {
    const org = await app.prisma.organization.findUnique({
      where: { id: request.params.orgId },
      select: { id: true, name: true },
    })
    if (!org) return reply.code(404).send({ error: 'Organization not found' })

    const { thread, messages } = await loadSupportThread(app.prisma, org.id)
    return {
      organization: org,
      thread: { id: thread.id, status: thread.status },
      messages: messages.map(messageRow),
    }
  })

  app.post('/api/vendor/support/threads/:orgId/messages', { preHandler: requirePlatformOwner }, async (request, reply) => {
    const body = request.body?.body?.trim()
    if (!body) {
      return reply.code(400).send({ error: 'Message body is required.' })
    }

    const org = await app.prisma.organization.findUnique({
      where: { id: request.params.orgId },
    })
    if (!org) return reply.code(404).send({ error: 'Organization not found' })

    const thread = await ensureSupportThread(app.prisma, org.id)
    const row = await app.prisma.supportMessage.create({
      data: {
        threadId: thread.id,
        authorId: request.auth.userId,
        body,
      },
      include: {
        author: {
          select: { id: true, name: true, username: true, email: true, role: true },
        },
      },
    })

    await app.prisma.supportThread.update({
      where: { id: thread.id },
      data: { updatedAt: new Date(), vendorLastReadAt: new Date() },
    })

    return { message: messageRow(row) }
  })
}
