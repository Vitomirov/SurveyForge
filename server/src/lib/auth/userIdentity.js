/**
 * User identity validation and uniqueness checks.
 * Normalizes email/username input, validates format, asserts global email and
 * per-org username availability, and derives collision-free usernames from email.
 */
export function normalizeEmail(raw) {
  return raw?.trim().toLowerCase() || ''
}

export function normalizeUsername(raw) {
  return raw?.trim() || ''
}

export function validateEmailFormat(raw) {
  const email = normalizeEmail(raw)
  if (!email || email.length > 254) {
    return { ok: false, error: 'Invalid email address.' }
  }
  const at = email.indexOf('@')
  if (at <= 0 || at === email.length - 1) {
    return { ok: false, error: 'Invalid email address.' }
  }
  const local = email.slice(0, at)
  const domain = email.slice(at + 1)
  if (!local || !domain || !domain.includes('.')) {
    return { ok: false, error: 'Invalid email address.' }
  }
  return { ok: true, email }
}

export function usernameFromEmail(email) {
  const local = normalizeEmail(email).split('@')[0] || 'user'
  let sanitized = local
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_.]+|[-_.]+$/g, '')
  if (!sanitized) sanitized = 'user'
  if (sanitized.length > 32) sanitized = sanitized.slice(0, 32)
  return sanitized
}

export async function assertEmailAvailable(prisma, email, { excludeUserId } = {}) {
  const normalized = normalizeEmail(email)
  if (!normalized) return { ok: false, error: 'Email is required.' }

  const clash = await prisma.user.findFirst({
    where: {
      ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}),
      email: { equals: normalized, mode: 'insensitive' },
    },
  })
  if (clash) return { ok: false, error: 'That email is already registered.' }
  return { ok: true, email: normalized }
}

export async function assertUsernameAvailableInOrg(
  prisma,
  organizationId,
  username,
  { excludeUserId } = {},
) {
  const uname = normalizeUsername(username)
  if (!uname) return { ok: false, error: 'Username is required.' }

  const clash = await prisma.user.findFirst({
    where: {
      organizationId,
      ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}),
      username: { equals: uname, mode: 'insensitive' },
    },
  })
  if (clash) return { ok: false, error: 'That username is already taken.' }
  return { ok: true, username: uname }
}

export async function deriveUsernameForOrg(prisma, organizationId, email) {
  const base = usernameFromEmail(email)
  let candidate = base
  let n = 2

  while (true) {
    const clash = await prisma.user.findFirst({
      where: {
        organizationId,
        username: { equals: candidate, mode: 'insensitive' },
      },
    })
    if (!clash) return candidate
    candidate = `${base}-${n}`
    n += 1
  }
}
