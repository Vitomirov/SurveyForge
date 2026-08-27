import { shuffleArray } from '@/utils/format/shuffleArray'

/** Top/bottom anchored options stay fixed; the middle block is shuffled. */
export function orderChoiceOptions(options, randomize) {
  if (!options?.length) return []
  if (!randomize) return options

  const top = []
  const middle = []
  const bottom = []
  for (const option of options) {
    if (option.anchorPosition === 'top') top.push(option)
    else if (option.anchorPosition === 'bottom') bottom.push(option)
    else middle.push(option)
  }
  return [...top, ...shuffleArray(middle), ...bottom]
}
