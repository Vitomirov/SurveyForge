import { useMemo } from 'react'
import { orderChoiceOptions } from '@/utils/survey/questions/orderChoiceOptions'

/** Stable display order for choice questions; option labels stay in sync with edits. */
export function useOrderedChoiceOptions(question) {
  const options = question.options || []
  const optionKey = options.map(o => `${o.id}:${o.anchorPosition ?? ''}`).join(',')

  const orderedIds = useMemo(
    () => orderChoiceOptions(options, question.randomizeOptions).map(o => o.id),
    [question.id, question.randomizeOptions, optionKey],
  )

  return orderedIds
    .map(id => options.find(o => o.id === id))
    .filter(Boolean)
}
