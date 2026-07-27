// Backward-compatible barrel — existing imports from '@/store/surveyStore' keep working.
export { newId } from './id'
export {
  makeOption,
  makeMatrixRow,
  makeMatrixCol,
  makeMaxDiffItem,
  makeCardSortCard,
  makeCardSortCategory,
  makeConstantSumItem,
  makeSliderLabel,
  makeRankingItem,
  makeTextboxRow,
  makeImageOption,
  makeSemanticRow,
  makeCascadeItem,
  makeQuestion,
  makePageBreak,
  makeGroup,
  makeTerminationCondition,
  makeTerminationBlock,
  makeTextBlock,
  makeVisibilityCondition,
  makeVisibilityConfig,
} from './factories'
export { INITIAL_STATE } from './initialState'
export { surveyReducer } from './surveyReducer'
