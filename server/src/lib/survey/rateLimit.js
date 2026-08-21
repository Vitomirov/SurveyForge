/**
 * In-memory rate limiting for sensitive endpoints.
 * Sliding-window counters keyed by route + client IP. Limits are relaxed in
 * development via config. Used by auth and public survey routes.
 */
const buckets = new Map()
const RELAXED_FACTOR = 100

export function createRateLimiter({ windowMs = 60_000, max = 60 } = {}) {
  return function rateLimit(key) {
    const now = Date.now()
    const entry = buckets.get(key)
    if (!entry || now - entry.start >= windowMs) {
      buckets.set(key, { start: now, count: 1 })
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
    publicFetch: createRateLimiter({ windowMs: 60_000, max: 60 * factor }),
    dnc: createRateLimiter({ windowMs: 60_000, max: 20 * factor }),
    responses: createRateLimiter({ windowMs: 60_000, max: 30 * factor }),
  }
}

export function sendIfRateLimited(limiter, request, reply, key) {
  const limit = limiter(`${key}:${clientIp(request)}`)
  if (!limit.allowed) {
    return reply.code(429).send({ error: 'Too many requests. Please try again later.' })
  }
  return null
}
