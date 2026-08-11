// ─── Embed iframe postMessage contract (versioned) ─────────────────────────

export const EMBED_PROTOCOL_VERSION = 1
export const EMBED_MESSAGE_PREFIX = 'rescope-survey'

export const EMBED_EVENTS = {
  READY: `${EMBED_MESSAGE_PREFIX}:ready`,
  RESIZE: `${EMBED_MESSAGE_PREFIX}:resize`,
  COMPLETED: `${EMBED_MESSAGE_PREFIX}:completed`,
  TERMINATED: `${EMBED_MESSAGE_PREFIX}:terminated`,
  ERROR: `${EMBED_MESSAGE_PREFIX}:error`,
}

/** Build iframe embed URL from public survey URL. */
export function buildEmbedUrl(publicUrl, { protocol = EMBED_PROTOCOL_VERSION } = {}) {
  if (!publicUrl) return null
  try {
    const url = new URL(publicUrl)
    const parts = url.pathname.split('/').filter(Boolean)
    if (!parts.length) return null
    const publicPath = parts[parts.length - 1]
    url.pathname = `/embed/${publicPath}`
    url.searchParams.set('v', String(protocol))
    return url.toString()
  } catch {
    return null
  }
}

/** Build iframe HTML snippet for copy/paste. */
export function buildEmbedSnippet(embedUrl, { title = 'Survey', height = 600 } = {}) {
  if (!embedUrl) return null
  const sandbox = [
    'allow-scripts',
    'allow-same-origin',
    'allow-forms',
    'allow-popups',
  ].join(' ')
  return `<iframe
  src="${embedUrl}"
  title="${title.replace(/"/g, '&quot;')}"
  width="100%"
  height="${height}"
  style="border:0;max-width:100%;"
  loading="lazy"
  sandbox="${sandbox}"
></iframe>`
}

/** Outbound message from iframe to parent. Never include answers or PII. */
export function buildEmbedMessage(type, payload = {}) {
  return {
    source: EMBED_MESSAGE_PREFIX,
    version: EMBED_PROTOCOL_VERSION,
    type,
    ...payload,
  }
}

/** Validate inbound message from parent (e.g. ping). */
export function isEmbedMessage(data) {
  return data && typeof data === 'object' && data.source === EMBED_MESSAGE_PREFIX
}

/** Normalize origin for allowlist comparison. */
export function normalizeEmbedOrigin(origin) {
  if (!origin || typeof origin !== 'string') return null
  try {
    const url = new URL(origin)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return `${url.protocol}//${url.host}`
  } catch {
    return null
  }
}

/** Build CSP frame-ancestors directive from allowlist. */
export function buildFrameAncestorsDirective(origins = []) {
  const normalized = origins
    .map(normalizeEmbedOrigin)
    .filter(Boolean)
  if (!normalized.length) return "'none'"
  return normalized.join(' ')
}
