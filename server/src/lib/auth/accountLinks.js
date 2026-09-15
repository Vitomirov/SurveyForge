/**
 * Issue a one-time token and email its link — the only place that pairs
 * token creation with an outgoing message, so every flow behaves the same.
 */
import { AUTH_TOKEN_TTL_MS, AUTH_TOKEN_TYPES, issueAuthToken } from './authTokens.js'
import { inviteEmail, resetPasswordEmail, verifyEmail } from '../email/authEmails.js'

const HOUR_MS = 60 * 60 * 1000

function displayName(user) {
  return user.name || user.username || user.email
}

export async function sendVerificationEmail(app, user) {
  const { rawToken } = await issueAuthToken(app.prisma, {
    type: AUTH_TOKEN_TYPES.EMAIL_VERIFY,
    email: user.email,
    userId: user.id,
    organizationId: user.organizationId,
  })
  await app.mailer.send({
    to: user.email,
    ...verifyEmail({
      appUrl: app.config.appUrl,
      token: rawToken,
      name: displayName(user),
      expiresInHours: AUTH_TOKEN_TTL_MS[AUTH_TOKEN_TYPES.EMAIL_VERIFY] / HOUR_MS,
    }),
  })
}

export async function sendPasswordResetEmail(app, user) {
  const { rawToken } = await issueAuthToken(app.prisma, {
    type: AUTH_TOKEN_TYPES.PASSWORD_RESET,
    email: user.email,
    userId: user.id,
    organizationId: user.organizationId,
  })
  await app.mailer.send({
    to: user.email,
    ...resetPasswordEmail({
      appUrl: app.config.appUrl,
      token: rawToken,
      name: displayName(user),
      expiresInMinutes: AUTH_TOKEN_TTL_MS[AUTH_TOKEN_TYPES.PASSWORD_RESET] / 60_000,
    }),
  })
}

export async function sendInviteEmail(app, { email, role, organization, invitedBy }) {
  const { rawToken, row } = await issueAuthToken(app.prisma, {
    type: AUTH_TOKEN_TYPES.INVITE,
    email,
    role,
    organizationId: organization.id,
    invitedById: invitedBy.id,
  })
  await app.mailer.send({
    to: email,
    ...inviteEmail({
      appUrl: app.config.appUrl,
      token: rawToken,
      organizationName: organization.name,
      inviterName: displayName(invitedBy),
      expiresInDays: AUTH_TOKEN_TTL_MS[AUTH_TOKEN_TYPES.INVITE] / (24 * HOUR_MS),
    }),
  })
  return row
}
