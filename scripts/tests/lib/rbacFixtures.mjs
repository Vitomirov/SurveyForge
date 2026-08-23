/**
 * Shared fixtures for RBAC integration tests.
 */
import assert from 'node:assert/strict'

export { makeApi } from './apiClient.mjs'

export function surveyId(prefix = 's_rbac') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

/** Provision a fresh org with one admin and one editor; returns both tokens. */
export async function provisionOrg(api, unique, { planId = 'starter' } = {}) {
  const adminEmail = `rbac_adm_${unique}@test.com`
  const editorEmail = `rbac_ed_${unique}@test.com`

  const signup = await api('/api/auth/signup', {
    method: 'POST',
    body: {
      organizationName: `RBAC Org ${unique}`,
      name: 'RBAC Admin',
      email: adminEmail,
      password: 'testpass123',
    },
  })
  assert.equal(signup.status, 201)
  const adminToken = signup.data.token
  const adminSession = signup.data.session

  if (planId !== 'free_trial') {
    const vendorLogin = await api('/api/auth/login', {
      method: 'POST',
      body: { email: 'vendor@rescopesurveys.local', password: 'vendor123' },
    })
    assert.equal(vendorLogin.status, 200, 'vendor login should succeed (run seed)')

    const upgrade = await api(
      `/api/vendor/organizations/${adminSession.organizationId}/subscription`,
      {
        method: 'PATCH',
        token: vendorLogin.data.token,
        body: { planId, status: 'active' },
      },
    )
    assert.equal(upgrade.status, 200, `upgrade to ${planId}`)
  }

  if (planId === 'free_trial') {
    return {
      adminToken,
      adminSession,
      editorToken: null,
      editorSession: null,
      editorUserId: null,
      adminEmail,
      editorEmail: null,
    }
  }

  const created = await api('/api/platform/users', {
    method: 'POST',
    token: adminToken,
    body: {
      email: editorEmail,
      password: 'testpass123',
      name: 'RBAC Editor',
      role: 'editor',
    },
  })
  assert.equal(created.status, 200)

  const editorLogin = await api('/api/auth/login', {
    method: 'POST',
    body: { email: editorEmail, password: 'testpass123' },
  })
  assert.equal(editorLogin.status, 200)

  return {
    adminToken,
    adminSession,
    editorToken: editorLogin.data.token,
    editorSession: editorLogin.data.session,
    editorUserId: created.data.user.id,
    adminEmail,
    editorEmail,
  }
}

export async function createSurvey(api, token, id, title) {
  const res = await api(`/api/surveys/${id}`, {
    method: 'PATCH',
    token,
    body: {
      survey: { id, title, status: 'draft' },
      items: [],
    },
  })
  assert.equal(res.status, 201, `create ${id}: ${JSON.stringify(res.data)}`)
  return res.data
}
