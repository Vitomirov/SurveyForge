/**
 * DNS TXT verification helpers
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  flattenTxtRecords,
  txtRecordMatches,
  checkDomainVerificationDns,
} from '../../../server/src/lib/platform/checkDomainVerificationDns.js'
import { isAllowedCaddySurveyHost, surveysHostnameForDomain } from '../../../server/src/lib/platform/caddyAsk.js'

test('flattenTxtRecords joins chunked TXT values', () => {
  assert.deepEqual(flattenTxtRecords([['hello', ' world']]), ['hello world'])
  assert.deepEqual(flattenTxtRecords([['token-a'], ['token-b']]), ['token-a', 'token-b'])
})

test('txtRecordMatches compares trimmed values', () => {
  assert.equal(txtRecordMatches(['rescope-verify-abc'], 'rescope-verify-abc'), true)
  assert.equal(txtRecordMatches([' other '], 'rescope-verify-abc'), false)
})

test('checkDomainVerificationDns matches expected TXT token', async () => {
  const result = await checkDomainVerificationDns(
    {
      domain: 'client.com',
      txtRecord: '_rescope-verify.client.com',
      txtValue: 'rescope-verify-abc',
    },
    {
      resolveTxt: async () => [['rescope-verify-abc']],
    },
  )

  assert.equal(result.matched, true)
  assert.equal(result.failureReason, null)
})

test('checkDomainVerificationDns reports missing TXT record', async () => {
  const result = await checkDomainVerificationDns(
    {
      domain: 'client.com',
      txtRecord: '_rescope-verify.client.com',
      txtValue: 'rescope-verify-abc',
    },
    {
      resolveTxt: async () => {
        const err = new Error('not found')
        err.code = 'ENOTFOUND'
        throw err
      },
    },
  )

  assert.equal(result.matched, false)
  assert.match(result.failureReason, /not found/i)
})

test('checkDomainVerificationDns reports mismatched TXT value', async () => {
  const result = await checkDomainVerificationDns(
    {
      domain: 'client.com',
      txtRecord: '_rescope-verify.client.com',
      txtValue: 'rescope-verify-abc',
    },
    {
      resolveTxt: async () => [['wrong-token']],
    },
  )

  assert.equal(result.matched, false)
  assert.match(result.failureReason, /does not match/i)
})

test('caddy ask allows only verified enterprise survey hosts', () => {
  assert.equal(
    isAllowedCaddySurveyHost('surveys.imperatorconsulting.com', ['imperatorconsulting.com']),
    true,
  )
  assert.equal(
    isAllowedCaddySurveyHost('surveys.evil.com', ['imperatorconsulting.com']),
    false,
  )
  assert.equal(surveysHostnameForDomain('imperatorconsulting.com'), 'surveys.imperatorconsulting.com')
})
