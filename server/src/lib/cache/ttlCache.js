/**
 * Small in-process TTL cache with LRU eviction.
 * Used for hot survey-taker / dashboard reads. Not a distributed cache —
 * invalidation is per Node process, which matches our single-API Docker deploy.
 */
export function createTtlCache({ max = 500, ttlMs = 2000 } = {}) {
  const store = new Map()

  function get(key) {
    const entry = store.get(key)
    if (!entry) return undefined
    if (entry.expiresAt <= Date.now()) {
      store.delete(key)
      return undefined
    }
    store.delete(key)
    store.set(key, entry)
    return entry.value
  }

  function set(key, value, ttl = ttlMs) {
    if (store.size >= max && !store.has(key)) {
      const oldest = store.keys().next().value
      if (oldest !== undefined) store.delete(oldest)
    }
    store.delete(key)
    store.set(key, { value, expiresAt: Date.now() + ttl })
  }

  function del(key) {
    store.delete(key)
  }

  function delByPrefix(prefix) {
    for (const key of store.keys()) {
      if (key.startsWith(prefix)) store.delete(key)
    }
  }

  return { get, set, del, delByPrefix }
}
