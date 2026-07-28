import { useRef } from 'react'

/**
 * Dev-only helper — counts how many times a component re-rendered.
 * Temporarily call inside a memoized component to verify React.memo works.
 *
 * @example
 * function QuestionCard(props) {
 *   const renders = useRenderCount('QuestionCard')
 *   if (import.meta.env.DEV) console.debug(`QuestionCard ${props.question.id}: render #${renders}`)
 *   ...
 * }
 */
export function useRenderCount(_label = 'Component') {
  const countRef = useRef(0)
  countRef.current += 1
  return countRef.current
}
