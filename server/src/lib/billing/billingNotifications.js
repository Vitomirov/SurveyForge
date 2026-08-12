function settingsBillingSeenAt(settings) {
  const raw = settings?.billingLastSeenAt
  return raw ? new Date(raw) : null
}

export async function countOrgBillingNotifications(prisma, organizationId) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { settings: true },
  })

  const billingLastSeenAt = settingsBillingSeenAt(org?.settings ?? {})

  let newInvoices = 0
  if (billingLastSeenAt) {
    newInvoices = await prisma.invoice.count({
      where: {
        organizationId,
        status: 'open',
        createdAt: { gt: billingLastSeenAt },
      },
    })
  } else {
    newInvoices = await prisma.invoice.count({
      where: { organizationId, status: 'open' },
    })
  }

  return {
    newInvoices,
    total: newInvoices,
  }
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

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      settings: {
        ...settings,
        billingLastSeenAt: now.toISOString(),
      },
    },
  })
}
