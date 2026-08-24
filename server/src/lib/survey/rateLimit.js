/**
 * In-memory rate limiting for sensitive endpoints.
 * Sliding-window counters keyed by route + client IP. Limits are relaxed in
 * development via config. Used by auth and public survey routes.
 *
 * Expired keys are swept on a timer; the map is also capped so a unique-IP
 * flood cannot grow process memory without bound.
 */
import { loadConfig } from '../../config.js'

const buckets = new Map()
const RELAXED_FACTOR = 100
const MAX_BUCKETS = 20_000
const SWEEP_MS = 30_000

let sweepTimer = null

function ensureSweep() {
  if (sweepTimer) return
  sweepTimer = setInterval(() => pruneExpiredRateLimitBuckets(), SWEEP_MS)
  if (typeof sweepTimer.unref === 'function') sweepTimer.unref()
}

export function pruneExpiredRateLimitBuckets(now = Date.now()) {
  for (const [key, entry] of buckets) {
    if (now - entry.start >= entry.windowMs) buckets.delete(key)
  }
}

export function rateLimitBucketCount() {
  return buckets.size
}

function setBucket(key, entry) {
  if (buckets.size >= MAX_BUCKETS && !buckets.has(key)) {
    pruneExpiredRateLimitBuckets(entry.start)
    if (buckets.size >= MAX_BUCKETS) {
      const oldest = buckets.keys().next().value
      if (oldest !== undefined) buckets.delete(oldest)
    }
  }
  buckets.set(key, entry)
}

export function createRateLimiter({ windowMs = 60_000, max = 60 } = {}) {
  ensureSweep()
  return function rateLimit(key) {
    const now = Date.now()
    const entry = buckets.get(key)
    if (!entry || now - entry.start >= windowMs) {
      setBucket(key, { start: now, count: 1, windowMs })
      return { allowed: true, remaining: max - 1 }
    }
    entry.count += 1
    if (entry.count > max) {
      return { allowed: false, remaining: 0 }
    }
    return { allowed: true, remaining: max - entry.count }
  }
}

/** Client IP from the socket / trusted proxy. Never read X-Forwarded-For here. */
export function clientIp(request) {
  return request.ip || 'unknown'
}

export function createRouteLimiters({ relaxed = false } = {}) {
  const factor = relaxed ? RELAXED_FACTOR : 1
  return {
    login: createRateLimiter({ windowMs: 60_000, max: 10 * factor }),
    signup: createRateLimiter({ windowMs: 60_000, max: 10 * factor }),
    refresh: createRateLimiter({ windowMs: 60_000, max: 30 * factor }),
    publicFetch: createRateLimiter({ windowMs: 60_000, max: 60 * factor }),
    dnc: createRateLimiter({ windowMs: 60_000, max: 20 * factor }),
    responses: createRateLimiter({ windowMs: 60_000, max: 30 * factor }),
  }
}

export function sendIfRateLimited(limiter, request, reply, key) {
  if (loadConfig().rateLimitDisabled) return null
  const limit = limiter(`${key}:${clientIp(request)}`)
  if (!limit.allowed) {
    return reply.code(429).send({ error: 'Too many requests. Please try again later.' })
  }
  return null
}
