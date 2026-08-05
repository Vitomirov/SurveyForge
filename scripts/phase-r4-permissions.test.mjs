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
  isPlatformOwner,
  canSeeAllSurveys,
  canManagePlatform,
  canManageUsers,
  canViewBilling,
  canManageBilling,
  roleLabel,
  filterSurveysForSession,
} from '../src/utils/permissions.js'

const adminSession = { userId: 'a1', role: ROLES.ADMIN, name: 'CEO' }
const editorSession = { userId: 'e1', role: ROLES.EDITOR, name: 'Employee' }
const vendorSession = { userId: 'v1', role: ROLES.PLATFORM_OWNER, name: 'Vendor' }

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
  assert.equal(canManagePlatform(vendorSession), false)
  assert.equal(canManageUsers(adminSession), true)
  assert.equal(canManageUsers(editorSession), false)
})

test('billing permissions — admin read-only, vendor manages', () => {
  assert.equal(canViewBilling(adminSession), true)
  assert.equal(canViewBilling(editorSession), false)
  assert.equal(canViewBilling(vendorSession), false)
  assert.equal(canManageBilling(adminSession), false)
  assert.equal(canManageBilling(vendorSession), true)
})

test('roleLabel maps editor to User and platform_owner', () => {
  assert.equal(roleLabel('admin'), 'Admin')
  assert.equal(roleLabel('editor'), 'User')
  assert.equal(roleLabel('platform_owner'), 'Platform owner')
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
