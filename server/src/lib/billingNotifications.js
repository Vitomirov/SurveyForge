import { ROLES } from './roles.js'

function settingsBillingSeenAt(settings) {
  const raw = settings?.billingLastSeenAt
  return raw ? new Date(raw) : null
}

export async function countOrgBillingNotifications(prisma, organizationId) {
  const [thread, org, openInvoices] = await Promise.all([
    prisma.supportThread.findUnique({ where: { organizationId } }),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    }),
    prisma.invoice.count({
      where: { organizationId, status: 'open' },
    }),
  ])

  const billingLastSeenAt = settingsBillingSeenAt(org?.settings ?? {})

  let unreadMessages = 0
  if (thread) {
    unreadMessages = await prisma.supportMessage.count({
      where: {
        threadId: thread.id,
        author: { role: ROLES.PLATFORM_OWNER },
        ...(thread.orgLastReadAt
          ? { createdAt: { gt: thread.orgLastReadAt } }
          : {}),
      },
    })
  }

  let newInvoices = 0
  if (billingLastSeenAt) {
    newInvoices = await prisma.invoice.count({
      where: {
        organizationId,
        status: 'open',
        createdAt: { gt: billingLastSeenAt },
      },
    })
  } else if (openInvoices > 0) {
    newInvoices = openInvoices
  }

  return {
    unreadMessages,
    newInvoices,
    total: unreadMessages + newInvoices,
  }
}

export async function countVendorNotifications(prisma) {
  const threads = await prisma.supportThread.findMany({
    include: { organization: { select: { id: true, name: true } } },
  })

  if (threads.length === 0) {
    return { unreadMessages: 0, organizations: [] }
  }

  // Single grouped count across all threads: each thread's unread cutoff is its
  // own `vendorLastReadAt`, expressed as one branch of the OR (2 queries total,
  // independent of org count).
  const grouped = await prisma.supportMessage.groupBy({
    by: ['threadId'],
    where: {
      author: { role: ROLES.ADMIN },
      OR: threads.map(t => ({
        threadId: t.id,
        ...(t.vendorLastReadAt ? { createdAt: { gt: t.vendorLastReadAt } } : {}),
      })),
    },
    _count: { _all: true },
  })

  const countByThread = new Map(grouped.map(g => [g.threadId, g._count._all]))

  let unreadMessages = 0
  const organizations = []
  for (const thread of threads) {
    const count = countByThread.get(thread.id) ?? 0
    if (count > 0) {
      unreadMessages += count
      organizations.push({
        organizationId:   thread.organizationId,
        organizationName: thread.organization.name,
        unreadMessages:   count,
      })
    }
  }

  return { unreadMessages, organizations }
}

export async function markOrgBillingSeen(prisma, organizationId) {
  const now = new Date()
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { settings: true },
  })
  const settings = typeof org?.settings === 'object' && org.settings !== null
    ? { ...org.settings }
    : {}

  await Promise.all([
    prisma.supportThread.updateMany({
      where: { organizationId },
      data: { orgLastReadAt: now },
    }),
    prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: {
          ...settings,
          billingLastSeenAt: now.toISOString(),
        },
      },
    }),
  ])
}

export async function markVendorThreadSeen(prisma, organizationId) {
  await prisma.supportThread.updateMany({
    where: { organizationId },
    data: { vendorLastReadAt: new Date() },
  })
}
