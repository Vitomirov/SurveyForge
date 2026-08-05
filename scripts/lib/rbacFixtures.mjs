/**
 * Shared fixtures for RBAC integration tests.
 */
import assert from 'node:assert/strict'

export function surveyId(prefix = 's_rbac') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

export function makeApi(base) {
  return async function api(path, { method = 'GET', body, token } = {}) {
    const headers = {}
    if (body) headers['Content-Type'] = 'application/json'
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
    const text = await res.text()
    let data
    try { data = text ? JSON.parse(text) : null } catch { data = text }
    return { status: res.status, data }
  }
}

/** Provision a fresh org with one admin and one editor; returns both tokens. */
export async function provisionOrg(api, unique) {
  const adminUsername = `rbac_adm_${unique}`
  const editorUsername = `rbac_ed_${unique}`

  const signup = await api('/api/auth/signup', {
    method: 'POST',
    body: {
      organizationName: `RBAC Org ${unique}`,
      name: 'RBAC Admin',
      username: adminUsername,
      password: 'testpass123',
    },
  })
  assert.equal(signup.status, 201)
  const adminToken = signup.data.token
  const adminSession = signup.data.session

  const created = await api('/api/platform/users', {
    method: 'POST',
    token: adminToken,
    body: {
      username: editorUsername,
      password: 'testpass123',
      name: 'RBAC Editor',
      role: 'editor',
    },
  })
  assert.equal(created.status, 200)

  const editorLogin = await api('/api/auth/login', {
    method: 'POST',
    body: { username: editorUsername, password: 'testpass123' },
  })
  assert.equal(editorLogin.status, 200)

  return {
    adminToken,
    adminSession,
    editorToken: editorLogin.data.token,
    editorSession: editorLogin.data.session,
    editorUserId: created.data.user.id,
    adminUsername,
    editorUsername,
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
