/** Simple in-memory rate limiter for public endpoints. */

const buckets = new Map()

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

export function clientIp(request) {
  const forwarded = request.headers['x-forwarded-for']
  if (forwarded) return String(forwarded).split(',')[0].trim()
  return request.ip || 'unknown'
}
