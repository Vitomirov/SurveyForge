/**
 * Phase R4 — client-side permission helpers.
 * Run with: node --test scripts/phase-r4-permissions.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ROLES,
  isAdmin,
  isEditor,
  canSeeAllSurveys,
  canManagePlatform,
  canManageUsers,
  roleLabel,
  filterSurveysForSession,
} from '../src/utils/permissions.js'

const adminSession = { userId: 'a1', role: ROLES.ADMIN, name: 'CEO' }
const editorSession = { userId: 'e1', role: ROLES.EDITOR, name: 'Employee' }

test('isAdmin / isEditor', () => {
  assert.equal(isAdmin(adminSession), true)
  assert.equal(isAdmin(editorSession), false)
  assert.equal(isEditor(editorSession), true)
  assert.equal(isEditor(adminSession), false)
})

test('canSeeAllSurveys and canManagePlatform', () => {
  assert.equal(canSeeAllSurveys(adminSession), true)
  assert.equal(canSeeAllSurveys(editorSession), false)
  assert.equal(canManagePlatform(adminSession), true)
  assert.equal(canManagePlatform(editorSession), false)
  assert.equal(canManageUsers(adminSession), true)
  assert.equal(canManageUsers(editorSession), false)
})

test('roleLabel maps editor to User', () => {
  assert.equal(roleLabel('admin'), 'Admin')
  assert.equal(roleLabel('editor'), 'User')
})

test('filterSurveysForSession keeps all surveys for admin', () => {
  const entries = [
    { id: 's1', ownerId: 'e1' },
    { id: 's2', ownerId: 'a1' },
  ]
  assert.equal(filterSurveysForSession(entries, adminSession).length, 2)
})

test('filterSurveysForSession scopes editor to own surveys', () => {
  const entries = [
    { id: 's1', ownerId: 'e1' },
    { id: 's2', ownerId: 'a1' },
    { id: 's3', ownerId: null },
  ]
  const filtered = filterSurveysForSession(entries, editorSession)
  assert.deepEqual(filtered.map(e => e.id), ['s1'])
})

test('filterSurveysForSession with no session returns all', () => {
  const entries = [{ id: 's1', ownerId: 'e1' }]
  assert.equal(filterSurveysForSession(entries, null).length, 1)
})
