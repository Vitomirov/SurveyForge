/** Scroll a child element to the top of a scroll container. */
export function scrollChildToTop(container, child, offset = 8) {
  if (!container || !child) return
  const top = child.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - offset
  container.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
}
