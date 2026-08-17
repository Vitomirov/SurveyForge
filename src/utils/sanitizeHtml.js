import DOMPurify from 'dompurify'

const ALLOWED_TAGS = ['b', 'i', 'u', 'strong', 'em', 'a', 'p', 'br', 'ul', 'ol', 'li', 'div', 'span']
const ALLOWED_ATTR = ['href', 'target', 'rel', 'style']
const TEXT_ALIGN_STYLE = /^text-align:\s*(left|center|right|justify)\s*;?$/i

let hooksRegistered = false

function registerHooks() {
  if (hooksRegistered) return
  hooksRegistered = true
  DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
    if (data.attrName === 'style') {
      if (!TEXT_ALIGN_STYLE.test(String(data.attrValue || '').trim())) {
        data.keepAttr = false
      }
    }
  })
}

export function sanitizeHtml(html) {
  if (typeof html !== 'string') return html
  registerHooks()
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  })
}
