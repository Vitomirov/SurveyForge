/**
 * HTML sanitization for survey content.
 * Strips unsafe markup from survey descriptions and text-block items using
 * DOMPurify with a restricted tag/attribute allowlist.
 */
import DOMPurify from 'isomorphic-dompurify'

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

export function sanitizeSurveyHtml(survey) {
  if (!survey || typeof survey !== 'object') return survey
  if (typeof survey.description !== 'string') return survey
  return { ...survey, description: sanitizeHtml(survey.description) }
}

export function sanitizeSurveyItems(items) {
  if (!Array.isArray(items)) return items
  return items.map((item) => {
    if (item?.itemType === 'text_block' && typeof item.content === 'string') {
      return { ...item, content: sanitizeHtml(item.content) }
    }
    return item
  })
}
