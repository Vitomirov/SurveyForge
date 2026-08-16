import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { durationToMs, loadConfig } from '../../config.js'

export class RefreshTokenError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'RefreshTokenError'
    this.code = code
  }
}

export function hashToken(raw) {
  return createHash('sha256').update(String(raw), 'utf8').digest('hex')
}

function refreshTtlMs() {
  const { refreshTokenExpiresIn } = loadConfig()
  return durationToMs(refreshTokenExpiresIn, 30 * 24 * 60 * 60 * 1000)
}

export async function createRefreshToken(prisma, userId, { familyId } = {}) {
  const rawToken = randomBytes(32).toString('base64url')
  const resolvedFamilyId = familyId || randomUUID()
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(rawToken),
      familyId: resolvedFamilyId,
      expiresAt: new Date(Date.now() + refreshTtlMs()),
    },
  })
  return { rawToken, familyId: resolvedFamilyId }
}

export async function revokeFamily(prisma, familyId) {
  await prisma.refreshToken.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

export async function revokeRefreshToken(prisma, rawToken) {
  if (!rawToken) return
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(rawToken), revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

export async function revokeAllForUser(prisma, userId) {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

export async function rotateRefreshToken(prisma, rawToken) {
  const tokenHash = hashToken(rawToken)
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } })
  if (!existing) {
    throw new RefreshTokenError('INVALID_REFRESH', 'Invalid refresh token')
  }
  if (existing.revokedAt) {
    await revokeFamily(prisma, existing.familyId)
    throw new RefreshTokenError('REUSE_DETECTED', 'Refresh token reuse detected')
  }
  if (existing.expiresAt <= new Date()) {
    throw new RefreshTokenError('INVALID_REFRESH', 'Refresh token expired')
  }

  return prisma.$transaction(async (tx) => {
    const claimed = await tx.refreshToken.updateMany({
      where: { id: existing.id, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    if (claimed.count !== 1) {
      await revokeFamily(tx, existing.familyId)
      throw new RefreshTokenError('REUSE_DETECTED', 'Refresh token reuse detected')
    }
    const next = await createRefreshToken(tx, existing.userId, { familyId: existing.familyId })
    return { ...next, userId: existing.userId }
  })
}
