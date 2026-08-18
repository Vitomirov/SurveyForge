/**
 * Server-side DNC (Do Not Contact) checks for response submission.
 */

export function normalizeEmail(email) {
  return String(email || '').toLowerCase().trim()
}

export function findEmailQuestion(surveyItems) {
  return (surveyItems || []).find(
    item => item?.itemType === 'question' && item.isEmailField
  ) || null
}

export function extractResponseEmail(entry, surveyItems) {
  const emailQ = findEmailQuestion(surveyItems)
  if (!emailQ) return null
  const raw = entry?.responses?.[emailQ.id]
  if (raw == null || raw === '') return null
  const normalized = normalizeEmail(raw)
  if (!normalized || !normalized.includes('@')) return null
  return normalized
}

export async function isEmailOnDncList(prisma, surveyId, email) {
  const normalized = normalizeEmail(email)
  if (!normalized || !normalized.includes('@')) return false

  const row = await prisma.dncEntry.findUnique({
    where: { surveyId_email: { surveyId, email: normalized } },
    select: { id: true },
  })
  return !!row
}

/**
 * Resolve final response status with server-side DNC enforcement.
 * DNC applies only when status is `complete` or client-claimed `dnc`.
 */
export async function resolveDncStatus(prisma, { surveyId, entry, surveyItems, status }) {
  if (status !== 'complete' && status !== 'dnc') return status

  const email = extractResponseEmail(entry, surveyItems)
  const onList = email ? await isEmailOnDncList(prisma, surveyId, email) : false

  if (onList) return 'dnc'
  if (status === 'dnc') return 'complete'
  return status
}
