/**
 * k6 load test for Rescope Surveys.
 *
 * Mixes public respondents (take + submit a live survey) with authenticated
 * authors (dashboard / builder reads). Concurrent users ramp until latency,
 * errors, CPU, or RAM cross SLO thresholds — that point is capacity on a
 * 2 CPU / 4 GB Docker deployment.
 *
 * Env:
 *   BASE_URL     default http://web
 *   STATS_URL    default http://load-stats:9123  (empty to skip CPU/RAM)
 *   MAX_VUS      peak respondent VUs (default 200; authors = ~20% of this)
 *   QUICK        "1" for a short smoke ramp
 */
import http from 'k6/http'
import { check, fail, sleep } from 'k6'
import { Gauge, Rate, Trend } from 'k6/metrics'

const BASE = (__ENV.BASE_URL || 'http://web').replace(/\/$/, '')
const STATS_URL = (__ENV.STATS_URL || 'http://load-stats:9123').replace(/\/$/, '')
const MAX_VUS = Number(__ENV.MAX_VUS || 200)
const QUICK = __ENV.QUICK === '1' || __ENV.QUICK === 'true'

const appCpuPct = new Gauge('app_cpu_pct')
const appCpuBudgetPct = new Gauge('app_cpu_budget_pct')
const appMemMb = new Gauge('app_mem_mb')
const appMemBudgetPct = new Gauge('app_mem_budget_pct')
const sloErrorRate = new Rate('slo_error_rate')
const submitDuration = new Trend('survey_submit_duration', true)

const sloTags = { kind: 'slo' }

function respondentStages(maxVUs) {
  if (QUICK) {
    return [
      { duration: '15s', target: Math.max(2, Math.round(maxVUs * 0.25)) },
      { duration: '20s', target: maxVUs },
      { duration: '20s', target: maxVUs },
      { duration: '10s', target: 0 },
    ]
  }
  return [
    { duration: '30s', target: Math.max(2, Math.round(maxVUs * 0.05)) },
    { duration: '1m', target: Math.round(maxVUs * 0.15) },
    { duration: '1m', target: Math.round(maxVUs * 0.30) },
    { duration: '1m', target: Math.round(maxVUs * 0.50) },
    { duration: '1m', target: Math.round(maxVUs * 0.75) },
    { duration: '1m', target: maxVUs },
    { duration: '2m', target: maxVUs },
    { duration: '30s', target: 0 },
  ]
}

function authorStages(maxVUs) {
  const peak = Math.max(1, Math.round(maxVUs * 0.2))
  if (QUICK) {
    return [
      { duration: '15s', target: 1 },
      { duration: '20s', target: peak },
      { duration: '20s', target: peak },
      { duration: '10s', target: 0 },
    ]
  }
  return [
    { duration: '30s', target: 1 },
    { duration: '1m', target: Math.max(1, Math.round(peak * 0.3)) },
    { duration: '1m', target: Math.max(1, Math.round(peak * 0.5)) },
    { duration: '1m', target: Math.max(1, Math.round(peak * 0.7)) },
    { duration: '1m', target: peak },
    { duration: '1m', target: peak },
    { duration: '2m', target: peak },
    { duration: '30s', target: 0 },
  ]
}

function totalDuration(stages) {
  return stages.reduce((sum, stage) => {
    const match = String(stage.duration).match(/^(\d+)(s|m)$/)
    if (!match) return sum
    const n = Number(match[1])
    return sum + (match[2] === 'm' ? n * 60 : n)
  }, 0)
}

const rStages = respondentStages(MAX_VUS)
const aStages = authorStages(MAX_VUS)
const testSeconds = totalDuration(rStages)

export const options = {
  scenarios: {
    respondents: {
      exec: 'respondent',
      executor: 'ramping-vus',
      startVUs: 0,
      stages: rStages,
      gracefulRampDown: '20s',
      tags: { role: 'respondent' },
    },
    authors: {
      exec: 'author',
      executor: 'ramping-vus',
      startVUs: 0,
      stages: aStages,
      gracefulRampDown: '20s',
      tags: { role: 'author' },
    },
    resources: {
      exec: 'collectResources',
      executor: 'constant-vus',
      vus: 1,
      duration: `${testSeconds}s`,
      gracefulStop: '5s',
    },
  },
  thresholds: {
    'http_req_failed{kind:slo}': [
      { threshold: 'rate<0.01', abortOnFail: true, delayAbortEval: '30s' },
    ],
    'http_req_duration{kind:slo}': [
      { threshold: 'p(95)<800', abortOnFail: true, delayAbortEval: '30s' },
      { threshold: 'p(99)<2000', abortOnFail: true, delayAbortEval: '30s' },
    ],
    'http_reqs{kind:slo}': ['count>0'],
    slo_error_rate: [
      { threshold: 'rate<0.01', abortOnFail: true, delayAbortEval: '30s' },
    ],
    survey_submit_duration: ['p(95)<1200', 'p(99)<2500'],
    app_cpu_budget_pct: [
      { threshold: 'value<95', abortOnFail: true, delayAbortEval: '45s' },
    ],
    app_mem_budget_pct: [
      { threshold: 'value<90', abortOnFail: true, delayAbortEval: '45s' },
    ],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(95)', 'p(99)', 'max'],
  discardResponseBodies: true,
  setupTimeout: '60s',
}

function jsonHeaders(token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

function accessTokenFrom(res) {
  const cookies = res.cookies?.rs_access
  if (Array.isArray(cookies) && cookies[0]?.value) return cookies[0].value
  if (res.json('token')) return res.json('token')
  return ''
}

function recordSlo(res, ok) {
  sloErrorRate.add(!ok)
  return ok
}

function think(minS, maxS) {
  sleep(minS + Math.random() * (maxS - minS))
}

const LOAD_ITEMS = [
  {
    id: 'q_load_nps',
    itemType: 'question',
    questionType: 'nps',
    text: 'How likely are you to recommend us?',
    required: true,
    options: [],
  },
  {
    id: 'q_load_choice',
    itemType: 'question',
    questionType: 'single_select',
    text: 'How did you hear about us?',
    required: true,
    options: [
      { id: 'o1', text: 'Search' },
      { id: 'o2', text: 'Referral' },
      { id: 'o3', text: 'Social' },
    ],
  },
  {
    id: 'q_load_open',
    itemType: 'question',
    questionType: 'open_text',
    text: 'Any other comments?',
    required: false,
    options: [],
  },
]

export function setup() {
  const unique = `${Date.now()}`
  let signup
  const deadline = Date.now() + 45_000
  while (Date.now() < deadline) {
    signup = http.post(
      `${BASE}/api/auth/signup`,
      JSON.stringify({
        organizationName: `Load Test ${unique}`,
        name: 'Load Admin',
        email: `load-${unique}@example.com`,
        password: 'loadtest-pass-123',
      }),
      { headers: jsonHeaders(), tags: { name: 'setup_signup' }, responseType: 'text' },
    )
    if (signup.status === 201 || signup.status === 200) break
    sleep(2)
  }
  if (!signup || (signup.status !== 201 && signup.status !== 200)) {
    fail(`setup signup failed (${signup && signup.status}): ${signup && signup.body}`)
  }

  const token = accessTokenFrom(signup)
  if (!token) fail('setup signup did not return an access cookie')

  const surveyId = `s_load_${Date.now()}`
  const created = http.patch(
    `${BASE}/api/surveys/${surveyId}`,
    JSON.stringify({
      survey: {
        id: surveyId,
        title: 'Load Test Survey',
        internalName: 'Load Test Survey',
        status: 'live',
      },
      items: LOAD_ITEMS,
    }),
    { headers: jsonHeaders(token), tags: { name: 'setup_create_survey' }, responseType: 'text' },
  )
  if (created.status !== 201 && created.status !== 200) {
    fail(`setup create survey failed (${created.status}): ${created.body}`)
  }

  const live = http.get(`${BASE}/api/public/surveys/${surveyId}`, {
    tags: { name: 'setup_public_survey' },
    responseType: 'text',
  })
  if (live.status !== 200) {
    fail(`setup public survey fetch failed (${live.status}): ${live.body}`)
  }

  return { token, surveyId }
}

export function respondent(data) {
  const spa = http.get(`${BASE}/`, {
    tags: { ...sloTags, name: 'spa_shell' },
  })
  recordSlo(spa, check(spa, { 'spa 200': (r) => r.status === 200 }))

  const survey = http.get(`${BASE}/api/public/surveys/${data.surveyId}`, {
    tags: { ...sloTags, name: 'public_get_survey' },
  })
  recordSlo(survey, check(survey, { 'public survey 200': (r) => r.status === 200 }))
  think(0.4, 1.2)

  if (Math.random() < 0.2) {
    const dnc = http.post(
      `${BASE}/api/public/surveys/${data.surveyId}/dnc/check`,
      JSON.stringify({ email: `load-${__VU}-${__ITER}@example.com` }),
      { headers: jsonHeaders(), tags: { ...sloTags, name: 'public_dnc_check' } },
    )
    recordSlo(dnc, check(dnc, { 'dnc 200': (r) => r.status === 200 }))
  }

  const roll = Math.random()
  const status = roll < 0.8 ? 'complete' : roll < 0.9 ? 'partial' : 'terminated'
  const submit = http.post(
    `${BASE}/api/public/surveys/${data.surveyId}/responses`,
    JSON.stringify({
      id: `r_${__VU}_${__ITER}_${Date.now()}`,
      status,
      timestamp: new Date().toISOString(),
      pageReached: status === 'partial' ? 1 : 2,
      responses: {
        q_load_nps: 8,
        q_load_choice: 'o1',
        q_load_open: 'k6 load test',
      },
    }),
    { headers: jsonHeaders(), tags: { ...sloTags, name: 'public_submit_response' } },
  )
  submitDuration.add(submit.timings.duration)
  recordSlo(submit, check(submit, { 'submit 200': (r) => r.status === 200 }))
  think(0.6, 1.8)
}

export function author(data) {
  const auth = { headers: jsonHeaders(data.token) }

  const me = http.get(`${BASE}/api/auth/me`, {
    ...auth,
    tags: { ...sloTags, name: 'auth_me' },
  })
  recordSlo(me, check(me, { 'me 200': (r) => r.status === 200 }))

  const dashboard = http.get(`${BASE}/api/dashboard`, {
    ...auth,
    tags: { ...sloTags, name: 'dashboard' },
  })
  recordSlo(dashboard, check(dashboard, { 'dashboard 200': (r) => r.status === 200 }))
  think(0.3, 0.9)

  const survey = http.get(`${BASE}/api/surveys/${data.surveyId}`, {
    ...auth,
    tags: { ...sloTags, name: 'builder_get_survey' },
  })
  recordSlo(survey, check(survey, { 'builder survey 200': (r) => r.status === 200 }))

  const stats = http.get(`${BASE}/api/surveys/${data.surveyId}/responses/stats`, {
    ...auth,
    tags: { ...sloTags, name: 'response_stats' },
  })
  recordSlo(stats, check(stats, { 'response stats 200': (r) => r.status === 200 }))
  think(0.5, 1.5)
}

export function collectResources() {
  if (!STATS_URL) {
    sleep(2)
    return
  }
  const res = http.get(`${STATS_URL}/stats`, {
    tags: { name: 'container_stats' },
    responseType: 'text',
  })
  if (res.status !== 200) {
    sleep(2)
    return
  }
  let body
  try {
    body = res.json()
  } catch {
    sleep(2)
    return
  }
  const totals = body.totals || {}
  appCpuPct.add(Number(totals.cpuPct) || 0)
  appCpuBudgetPct.add(Number(totals.cpuBudgetPct) || 0)
  appMemMb.add(Number(totals.memMb) || 0)
  appMemBudgetPct.add(Number(totals.memBudgetPct) || 0)
  sleep(2)
}

function metric(data, name, key) {
  return data.metrics[name]?.values?.[key]
}

export function handleSummary(data) {
  const p95 = metric(data, 'http_req_duration{kind:slo}', 'p(95)')
    ?? metric(data, 'http_req_duration', 'p(95)')
  const p99 = metric(data, 'http_req_duration{kind:slo}', 'p(99)')
    ?? metric(data, 'http_req_duration', 'p(99)')
  const rps = metric(data, 'http_reqs{kind:slo}', 'rate')
    ?? metric(data, 'http_reqs', 'rate')
  const errRate = metric(data, 'http_req_failed{kind:slo}', 'rate')
    ?? metric(data, 'http_req_failed', 'rate')
  const cpu = metric(data, 'app_cpu_pct', 'value')
  const cpuBudget = metric(data, 'app_cpu_budget_pct', 'value')
  const memMb = metric(data, 'app_mem_mb', 'value')
  const memBudget = metric(data, 'app_mem_budget_pct', 'value')
  const failed = Object.values(data.metrics).some((m) => m.thresholds && Object.values(m.thresholds).some((t) => !t.ok))

  const lines = [
    '',
    '=== Rescope Surveys load test ===',
    `Peak respondent VUs: ${MAX_VUS}  (authors ~${Math.max(1, Math.round(MAX_VUS * 0.2))})`,
    `Request rate:        ${rps != null ? rps.toFixed(1) : 'n/a'} req/s`,
    `Latency:             p95=${p95 != null ? p95.toFixed(0) : 'n/a'} ms  p99=${p99 != null ? p99.toFixed(0) : 'n/a'} ms`,
    `Error rate:          ${errRate != null ? (errRate * 100).toFixed(2) : 'n/a'}%`,
    `CPU (app stack):     ${cpu != null ? cpu.toFixed(1) : 'n/a'}%  (${cpuBudget != null ? cpuBudget.toFixed(1) : 'n/a'}% of 2 CPU budget)`,
    `RAM (app stack):     ${memMb != null ? memMb.toFixed(0) : 'n/a'} MB  (${memBudget != null ? memBudget.toFixed(1) : 'n/a'}% of 4 GB budget)`,
    failed
      ? 'Result: FAILED — the stack left the SLO. The abort VU level is the capacity ceiling on 2 CPU / 4 GB.'
      : 'Result: PASSED — the stack held the SLO through the full ramp on 2 CPU / 4 GB.',
    '',
  ].join('\n')

  return {
    stdout: lines,
    '/scripts/results/summary.json': JSON.stringify({
      passed: !failed,
      maxVUs: MAX_VUS,
      requestRate: rps,
      p95,
      p99,
      errorRate: errRate,
      cpuPct: cpu,
      cpuBudgetPct: cpuBudget,
      memMb,
      memBudgetPct: memBudget,
      thresholds: data.metrics,
    }, null, 2),
  }
}
