/**
 * Phase 4 — server-side rich-text sanitization.
 * Run with: node --test scripts/phase-security-xss.test.mjs
 * Requires API on PORT from .env (default 3003) and Postgres.
 */
import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { makeApi, provisionOrg, surveyId } from './lib/rbacFixtures.mjs'
import { sanitizeHtml, sanitizeSurveyHtml, sanitizeSurveyItems } from '../server/src/lib/survey/sanitizeHtml.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootEnv = readFileSync(resolve(__dirname, '../.env'), 'utf8')
const PORT = rootEnv.match(/^PORT=(\d+)/m)?.[1] || '3003'
const BASE = `http://127.0.0.1:${PORT}`
const api = makeApi(BASE)

const unique = `xss_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

before(async () => {
  const res = await api('/health')
  assert.ok(res.data?.ok, `API not reachable at ${BASE}`)
})

test('sanitizeHtml strips script tags and keeps formatting', () => {
  const cleaned = sanitizeHtml('<script>alert(1)</script><b>ok</b> <a href="https://example.com">link</a>')
  assert.equal(cleaned.includes('<script>'), false)
  assert.equal(cleaned.includes('alert(1)'), false)
  assert.match(cleaned, /<b>ok<\/b>/)
  assert.match(cleaned, /href="https:\/\/example.com"/)
})

test('sanitizeHtml strips event handlers and javascript URLs', () => {
  const cleaned = sanitizeHtml('<a href="javascript:alert(1)" onclick="alert(1)">x</a><img src=x onerror=alert(1)>')
  assert.equal(cleaned.toLowerCase().includes('javascript:'), false)
  assert.equal(cleaned.toLowerCase().includes('onclick'), false)
  assert.equal(cleaned.toLowerCase().includes('onerror'), false)
})

test('sanitizeSurveyHtml only sanitizes description', () => {
  const out = sanitizeSurveyHtml({
    title: '<script>t</script>',
    description: '<script>d</script><b>desc</b>',
  })
  assert.equal(out.title, '<script>t</script>')
  assert.equal(out.description.includes('<script>'), false)
  assert.match(out.description, /<b>desc<\/b>/)
})

test('sanitizeSurveyItems only sanitizes text_block content', () => {
  const out = sanitizeSurveyItems([
    { id: 'q1', itemType: 'single_choice', title: '<script>t</script>' },
    { id: 'tb1', itemType: 'text_block', content: '<script>c</script><i>hi</i>' },
  ])
  assert.equal(out[0].title, '<script>t</script>')
  assert.equal(out[1].content.includes('<script>'), false)
  assert.match(out[1].content, /<i>hi<\/i>/)
})

test('survey PATCH sanitizes description and text_block content', async () => {
  const { adminToken } = await provisionOrg(api, unique)
  const id = surveyId('xss')

  const created = await api(`/api/surveys/${id}`, {
    method: 'PATCH',
    token: adminToken,
    body: {
      survey: {
        id,
        title: 'XSS Survey',
        description: '<script>alert(1)</script><b>safe</b>',
        status: 'live',
      },
      items: [
        {
          id: 'tb1',
          itemType: 'text_block',
          content: '<img src=x onerror=alert(1)><i>hello</i>',
        },
      ],
    },
  })
  assert.equal(created.status, 201, JSON.stringify(created.data))

  const row = await api(`/api/surveys/${id}`, { token: adminToken })
  assert.equal(row.status, 200)
  assert.equal(row.data.survey.description.includes('<script>'), false)
  assert.match(row.data.survey.description, /<b>safe<\/b>/)
  const block = row.data.items.find(item => item.id === 'tb1')
  assert.ok(block)
  assert.equal((block.content || '').toLowerCase().includes('onerror'), false)
  assert.match(block.content, /<i>hello<\/i>/)

  const pub = await api(`/api/public/surveys/${id}`)
  assert.equal(pub.status, 200)
  assert.equal(pub.data.survey.description.includes('<script>'), false)
  assert.match(pub.data.survey.description, /<b>safe<\/b>/)
  const pubBlock = pub.data.items.find(item => item.id === 'tb1')
  assert.ok(pubBlock)
  assert.equal((pubBlock.content || '').toLowerCase().includes('onerror'), false)
  assert.match(pubBlock.content, /<i>hello<\/i>/)
})
