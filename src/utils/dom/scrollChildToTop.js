const STICKY_HEADER_OFFSET = 72

/** Scroll a child element to the top of a scroll container, or the page when the container does not scroll. */
export function scrollChildToTop(container, child, offset = 8) {
  if (!child) return

  const canScrollContainer = container && container.scrollHeight > container.clientHeight + 1

  if (canScrollContainer) {
    const top = child.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - offset
    container.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
    return
  }

  const top = child.getBoundingClientRect().top + window.scrollY - offset - STICKY_HEADER_OFFSET
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
}
