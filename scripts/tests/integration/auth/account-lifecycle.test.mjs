/**
 * Phase 12 — account lifecycle: email verification, team invites, password reset.
 * Run with: npm run test:auth-lifecycle
 * Requires API on PORT from .env with EMAIL_TRANSPORT=log (dev default) and Postgres.
 */
import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCookieClient, makeApi } from '../../lib/apiClient.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootEnv = readFileSync(resolve(__dirname, '../../../../.env'), 'utf8')
const PORT = rootEnv.match(/^PORT=(\d+)/m)?.[1] || '3003'
const BASE = `http://127.0.0.1:${PORT}`

const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
const adminEmail = `lc_adm_${unique}@test.com`
const inviteeEmail = `lc_inv_${unique}@test.com`
const password = 'testpass123'
const api = makeApi(BASE, { injectTokenFromCookie: false })

/** Newest token emailed to `to` for a given link view (accept-invite | verify-email | reset-password). */
async function latestToken(to, view) {
  const res = await fetch(`${BASE}/api/internal/dev/mailbox?to=${encodeURIComponent(to)}`)
  assert.equal(res.status, 200, 'dev mailbox requires EMAIL_TRANSPORT=log in development')
  const { messages } = await res.json()
  const match = messages.map(m => m.text.match(new RegExp(`#/${view}\\?token=([A-Za-z0-9_-]+)`))).find(Boolean)
  return match ? match[1] : null
}

let admin

before(async () => {
  const health = await fetch(`${BASE}/health`).then(r => r.json())
  assert.ok(health?.ok, `API not reachable at ${BASE} — start postgres + API first`)

  admin = createCookieClient(BASE)
  const signup = await admin.request('/api/auth/signup', {
    method: 'POST',
    body: { organizationName: `Lifecycle Org ${unique}`, name: 'Lifecycle Admin', email: adminEmail, password },
  })
  assert.equal(signup.status, 201)
  assert.equal(signup.data.session.emailVerified, false)

  // Free trial has one seat; invites need room (vendor upgrade, as in rbacFixtures).
  const vendor = createCookieClient(BASE)
  const vendorLogin = await vendor.request('/api/auth/login', {
    method: 'POST',
    body: { email: 'vendor@rescopesurveys.local', password: 'vendor123' },
  })
  assert.equal(vendorLogin.status, 200, 'vendor login should succeed (run seed)')
  const upgrade = await vendor.request(
    `/api/vendor/organizations/${signup.data.session.organizationId}/subscription`,
    { method: 'PATCH', body: { planId: 'starter', status: 'active' } },
  )
  assert.equal(upgrade.status, 200)
})

// ─── Email verification ───────────────────────────────────────────────────────

test('signup emails a verification link; inviting is blocked until verified', async () => {
  const blocked = await admin.request('/api/platform/invites', {
    method: 'POST',
    body: { email: inviteeEmail, role: 'editor' },
  })
  assert.equal(blocked.status, 403)
  assert.equal(blocked.data.code, 'EMAIL_UNVERIFIED')

  const token = await latestToken(adminEmail, 'verify-email')
  assert.ok(token, 'verification email should contain a token')

  const verify = await api('/api/auth/email/verify', { method: 'POST', body: { token } })
  assert.equal(verify.status, 200)

  const me = await admin.request('/api/auth/me')
  assert.equal(me.data.session.emailVerified, true)

  const reuse = await api('/api/auth/email/verify', { method: 'POST', body: { token } })
  assert.equal(reuse.status, 400, 'verification link is single-use')
  assert.equal(reuse.data.code, 'INVALID_TOKEN')
})

test('resend verification is a no-op once verified', async () => {
  const res = await admin.request('/api/auth/email/resend', { method: 'POST' })
  assert.equal(res.status, 200)
  assert.equal(res.data.alreadyVerified, true)
})

// ─── Invites ─────────────────────────────────────────────────────────────────

test('admin invites; invitee previews, accepts with a password, and is signed in as editor', async () => {
  const create = await admin.request('/api/platform/invites', {
    method: 'POST',
    body: { email: inviteeEmail, role: 'editor' },
  })
  assert.equal(create.status, 201, JSON.stringify(create.data))
  assert.equal(create.data.invite.email, inviteeEmail)

  const pending = await admin.request('/api/platform/invites')
  assert.equal(pending.status, 200)
  assert.ok(pending.data.invites.some(i => i.email === inviteeEmail))

  const token = await latestToken(inviteeEmail, 'accept-invite')
  assert.ok(token, 'invite email should contain a token')

  const preview = await api('/api/auth/invites/preview', { method: 'POST', body: { token } })
  assert.equal(preview.status, 200)
  assert.equal(preview.data.invite.email, inviteeEmail)
  assert.equal(preview.data.invite.organizationName, `Lifecycle Org ${unique}`)

  const weak = await api('/api/auth/invites/accept', { method: 'POST', body: { token, name: 'Invitee', password: 'short' } })
  assert.equal(weak.status, 400)

  const invitee = createCookieClient(BASE)
  const accept = await invitee.request('/api/auth/invites/accept', {
    method: 'POST',
    body: { token, name: 'Lifecycle Invitee', password },
  })
  assert.equal(accept.status, 201, JSON.stringify(accept.data))
  assert.equal(accept.data.session.role, 'editor')
  assert.equal(accept.data.session.emailVerified, true)
  assert.ok(invitee.getCookies().rs_access, 'accepting an invite signs the user in')

  const me = await invitee.request('/api/auth/me')
  assert.equal(me.status, 200)
  assert.equal(me.data.session.organizationId, accept.data.session.organizationId)

  const again = await api('/api/auth/invites/accept', { method: 'POST', body: { token, name: 'X', password } })
  assert.equal(again.status, 400, 'invite link is single-use')

  const gone = await admin.request('/api/platform/invites')
  assert.ok(!gone.data.invites.some(i => i.email === inviteeEmail), 'accepted invite leaves the pending list')

  const login = await api('/api/auth/login', { method: 'POST', body: { email: inviteeEmail, password } })
  assert.equal(login.status, 200, 'invitee can sign in with email + chosen password')
})

test('invite validation: bad role, taken email, revoke, resend voids the old link', async () => {
  const badRole = await admin.request('/api/platform/invites', {
    method: 'POST',
    body: { email: `lc_x_${unique}@test.com`, role: 'platform_owner' },
  })
  assert.equal(badRole.status, 400)

  const taken = await admin.request('/api/platform/invites', {
    method: 'POST',
    body: { email: inviteeEmail, role: 'editor' },
  })
  assert.equal(taken.status, 409)

  const other = `lc_other_${unique}@test.com`
  const first = await admin.request('/api/platform/invites', { method: 'POST', body: { email: other, role: 'admin' } })
  assert.equal(first.status, 201)
  const firstToken = await latestToken(other, 'accept-invite')

  const resend = await admin.request(`/api/platform/invites/${first.data.invite.id}/resend`, { method: 'POST' })
  assert.equal(resend.status, 200)
  const secondToken = await latestToken(other, 'accept-invite')
  assert.notEqual(secondToken, firstToken)

  const stale = await api('/api/auth/invites/preview', { method: 'POST', body: { token: firstToken } })
  assert.equal(stale.status, 400, 'resend voids the previous link')

  const revoke = await admin.request(`/api/platform/invites/${resend.data.invite.id}`, { method: 'DELETE' })
  assert.equal(revoke.status, 200)
  const revoked = await api('/api/auth/invites/preview', { method: 'POST', body: { token: secondToken } })
  assert.equal(revoked.status, 400)
})

test('editors cannot manage invites', async () => {
  const editor = createCookieClient(BASE)
  await editor.request('/api/auth/login', { method: 'POST', body: { email: inviteeEmail, password } })
  const res = await editor.request('/api/platform/invites', {
    method: 'POST',
    body: { email: `lc_ed_${unique}@test.com`, role: 'editor' },
  })
  assert.equal(res.status, 403)
  assert.equal(res.data.code, 'FORBIDDEN')
})

// ─── Password reset ──────────────────────────────────────────────────────────

test('forgot password never reveals whether the account exists', async () => {
  const known = await api('/api/auth/password/forgot', { method: 'POST', body: { email: inviteeEmail } })
  const unknown = await api('/api/auth/password/forgot', { method: 'POST', body: { email: `nobody_${unique}@test.com` } })
  assert.equal(known.status, 200)
  assert.equal(unknown.status, 200)
  assert.deepEqual(known.data, unknown.data)
})

test('reset link sets a new password, signs in here, and signs out other sessions', async () => {
  const other = createCookieClient(BASE)
  const otherLogin = await other.request('/api/auth/login', { method: 'POST', body: { email: inviteeEmail, password } })
  assert.equal(otherLogin.status, 200)

  const token = await latestToken(inviteeEmail, 'reset-password')
  assert.ok(token, 'reset email should contain a token')

  const newPassword = 'newpass456'
  const device = createCookieClient(BASE)
  const reset = await device.request('/api/auth/password/reset', { method: 'POST', body: { token, password: newPassword } })
  assert.equal(reset.status, 200, JSON.stringify(reset.data))
  assert.ok(device.getCookies().rs_access)

  const me = await device.request('/api/auth/me')
  assert.equal(me.status, 200)

  const staleMe = await other.request('/api/auth/me')
  assert.equal(staleMe.status, 401, 'old access token is rejected after reset')
  const staleRefresh = await other.request('/api/auth/refresh', { method: 'POST' })
  assert.equal(staleRefresh.status, 401, 'old refresh token is revoked after reset')

  const reuse = await api('/api/auth/password/reset', { method: 'POST', body: { token, password: newPassword } })
  assert.equal(reuse.status, 400, 'reset link is single-use')

  const oldLogin = await api('/api/auth/login', { method: 'POST', body: { email: inviteeEmail, password } })
  assert.equal(oldLogin.status, 401)
  const newLogin = await api('/api/auth/login', { method: 'POST', body: { email: inviteeEmail, password: newPassword } })
  assert.equal(newLogin.status, 200)
})

test('token endpoints reject garbage without a session', async () => {
  for (const path of ['/api/auth/email/verify', '/api/auth/password/reset', '/api/auth/invites/preview']) {
    const res = await api(path, { method: 'POST', body: { token: 'not-a-token', password: 'whatever123' } })
    assert.equal(res.status, 400, path)
    assert.equal(res.data.code, 'INVALID_TOKEN', path)
  }
})
