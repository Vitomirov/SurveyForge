import { newId } from './id'
import {
  makeQuestion,
  makePageBreak,
  makeGroup,
  makeTerminationBlock,
  makeTextBlock,
  makeTerminationCondition,
  makeVisibilityConfig,
  makeVisibilityCondition,
  makeOption,
  makeMatrixRow,
  makeMatrixCol,
} from './factories'
import {
  updateItemById,
  patchItem,
  mapById,
  mapArray,
  patchNested,
  withItems,
  findItemIndex,
} from './reducerHelpers'

export function surveyReducer(state, action) {
  const now = new Date().toISOString()

  switch (action.type) {

    case 'SET_SURVEY_FIELD':
      return {
        ...state,
        survey: { ...state.survey, [action.field]: action.value, updatedAt: now },
        isDirty: true,
      }

    case 'ADD_QUESTION': {
      const q = makeQuestion(action.qtype)
      if (action.afterId) {
        const idx = state.items.findIndex(i => i.id === action.afterId)
        const next = [...state.items]
        next.splice(idx + 1, 0, q)
        return { ...state, items: next, activeItemId: q.id, isDirty: true }
      }
      return {
        ...state,
        items: [...state.items, q],
        activeItemId: q.id,
        isDirty: true,
      }
    }

    case 'ADD_PAGE_BREAK': {
      const pb = makePageBreak()
      if (action.afterId) {
        const idx = state.items.findIndex(i => i.id === action.afterId)
        const next = [...state.items]
        next.splice(idx + 1, 0, pb)
        return { ...state, items: next, isDirty: true }
      }
      return { ...state, items: [...state.items, pb], isDirty: true }
    }

    case 'ADD_GROUP': {
      const g = makeGroup()
      if (action.afterId) {
        const idx = state.items.findIndex(i => i.id === action.afterId)
        const next = [...state.items]
        next.splice(idx + 1, 0, g)
        return { ...state, items: next, activeItemId: g.id, isDirty: true }
      }
      return { ...state, items: [...state.items, g], activeItemId: g.id, isDirty: true }
    }

    case 'ADD_TERMINATION_BLOCK': {
      const tb = makeTerminationBlock()
      if (action.afterId) {
        const idx = state.items.findIndex(i => i.id === action.afterId)
        const next = [...state.items]
        next.splice(idx + 1, 0, tb)
        return { ...state, items: next, activeItemId: tb.id, isDirty: true }
      }
      return { ...state, items: [...state.items, tb], activeItemId: tb.id, isDirty: true }
    }

    case 'ADD_TEXT_BLOCK': {
      const blk = makeTextBlock()
      if (action.afterId) {
        const idx = state.items.findIndex(i => i.id === action.afterId)
        const next = [...state.items]
        next.splice(idx + 1, 0, blk)
        return { ...state, items: next, activeItemId: blk.id, isDirty: true }
      }
      return { ...state, items: [...state.items, blk], activeItemId: blk.id, isDirty: true }
    }

    case 'ADD_TERMINATION_CONDITION':
      return withItems(state, updateItemById(state.items, action.blockId, item => {
        const isFirst = (item.conditions || []).length === 0
        const newCond = makeTerminationCondition(isFirst)
        return { ...item, conditions: [...(item.conditions || []), newCond] }
      }))

    case 'UPDATE_TERMINATION_CONDITION':
      return withItems(state, updateItemById(state.items, action.blockId, item => {
        const conditions = mapById(item.conditions || [], action.conditionId, c =>
          patchItem(c, action.patch)
        )
        return conditions === item.conditions ? item : { ...item, conditions }
      }))

    case 'DELETE_TERMINATION_CONDITION':
      return withItems(state, updateItemById(state.items, action.blockId, item => {
        const remaining = (item.conditions || []).filter(c => c.id !== action.conditionId)
        if (remaining.length > 0) remaining[0] = { ...remaining[0], join: null }
        return { ...item, conditions: remaining }
      }))

    case 'SET_EMAIL_FIELD':
      return withItems(state, mapArray(state.items, item => {
        if (item.itemType !== 'question') return item
        const isEmailField = item.id === action.id
        return item.isEmailField === isEmailField ? item : { ...item, isEmailField }
      }))

    case 'SET_ITEM_VISIBILITY_MODE':
      return withItems(state, updateItemById(state.items, action.itemId, item => {
        const vis = item.visibility || makeVisibilityConfig()
        const nextVis = patchNested(vis, action.patch)
        return nextVis === vis ? item : { ...item, visibility: nextVis }
      }))

    case 'ADD_VISIBILITY_CONDITION':
      return withItems(state, updateItemById(state.items, action.itemId, item => {
        const vis = item.visibility || makeVisibilityConfig()
        const isFirst = (vis.conditions || []).length === 0
        const newCond = makeVisibilityCondition(isFirst)
        return {
          ...item,
          visibility: { ...vis, conditions: [...(vis.conditions || []), newCond] },
        }
      }))

    case 'UPDATE_VISIBILITY_CONDITION':
      return withItems(state, updateItemById(state.items, action.itemId, item => {
        const vis = item.visibility || makeVisibilityConfig()
        const conditions = mapById(vis.conditions || [], action.conditionId, c =>
          patchItem(c, action.patch)
        )
        if (conditions === vis.conditions) return item
        return { ...item, visibility: { ...vis, conditions } }
      }))

    case 'DELETE_VISIBILITY_CONDITION':
      return withItems(state, updateItemById(state.items, action.itemId, item => {
        const vis = item.visibility || makeVisibilityConfig()
        const remaining = (vis.conditions || []).filter(c => c.id !== action.conditionId)
        if (remaining.length > 0) remaining[0] = { ...remaining[0], join: null }
        return { ...item, visibility: { ...vis, conditions: remaining } }
      }))

    case 'DELETE_ITEM': {
      const remaining = state.items.filter(i => i.id !== action.id)
      return {
        ...state,
        items: remaining,
        activeItemId: state.activeItemId === action.id ? null : state.activeItemId,
        isDirty: true,
      }
    }

    case 'DUPLICATE_ITEM': {
      const idx = findItemIndex(state.items, action.id)
      if (idx === -1) return state
      const orig = state.items[idx]
      const copy = {
        ...JSON.parse(JSON.stringify(orig)),
        id: newId(),
        options: orig.options ? orig.options.map(o => ({ ...o, id: newId() })) : undefined,
      }
      const next = state.items.slice()
      next.splice(idx + 1, 0, copy)
      return { ...state, items: next, activeItemId: copy.id, isDirty: true }
    }

    case 'SET_ACTIVE_ITEM':
      return { ...state, activeItemId: action.id }

    case 'TOGGLE_ACTIVE_ITEM':
      return {
        ...state,
        activeItemId: state.activeItemId === action.id ? null : action.id,
      }

    case 'UPDATE_ITEM':
      return withItems(state, updateItemById(state.items, action.id, item =>
        patchItem(item, action.patch)
      ))

    case 'REORDER_ITEMS':
      return action.items === state.items ? state : { ...state, items: action.items, isDirty: true }

    case 'ADD_OPTION':
      return withItems(state, updateItemById(state.items, action.questionId, item => ({
        ...item,
        options: [...item.options, makeOption()],
      })))

    case 'ADD_OPTION_AFTER': {
      const newOpt = makeOption()
      const items = updateItemById(state.items, action.questionId, item => {
        const idx = item.options.findIndex(o => o.id === action.afterOptionId)
        const opts = item.options.slice()
        opts.splice(idx + 1, 0, newOpt)
        return { ...item, options: opts }
      })
      return withItems(state, items, { focusOptionId: newOpt.id })
    }

    case 'PASTE_OPTIONS':
      return withItems(state, updateItemById(state.items, action.questionId, item => {
        const idx = item.options.findIndex(o => o.id === action.currentOptionId)
        const opts = item.options.slice()
        opts[idx] = { ...opts[idx], text: action.lines[0] }
        const newOpts = action.lines.slice(1).map(text => makeOption(text))
        opts.splice(idx + 1, 0, ...newOpts)
        return { ...item, options: opts }
      }))

    case 'UPDATE_OPTION':
      return withItems(state, updateItemById(state.items, action.questionId, item => {
        const options = mapById(item.options, action.optionId, o => patchItem(o, action.patch))
        return options === item.options ? item : { ...item, options }
      }))

    case 'UPDATE_OPTION_OPEN_TEXT':
      return withItems(state, updateItemById(state.items, action.questionId, item => {
        const options = mapById(item.options, action.optionId, o => {
          const openText = patchNested(o.openText, action.patch)
          return openText === o.openText ? o : { ...o, openText }
        })
        return options === item.options ? item : { ...item, options }
      }))

    case 'DELETE_OPTION':
      return withItems(state, updateItemById(state.items, action.questionId, item => ({
        ...item,
        options: item.options.filter(o => o.id !== action.optionId),
      })))

    case 'REORDER_OPTIONS':
      return withItems(state, updateItemById(state.items, action.questionId, item =>
        item.options === action.options ? item : { ...item, options: action.options }
      ))

    case 'ADD_MATRIX_ROW':
      return withItems(state, updateItemById(state.items, action.questionId, item => {
        const cfg = action.configKey
        return { ...item, [cfg]: { ...item[cfg], rows: [...item[cfg].rows, makeMatrixRow()] } }
      }))

    case 'ADD_MATRIX_COL':
      return withItems(state, updateItemById(state.items, action.questionId, item => {
        const cfg = action.configKey
        const colKey = action.colKey || 'columns'
        return { ...item, [cfg]: { ...item[cfg], [colKey]: [...item[cfg][colKey], makeMatrixCol()] } }
      }))

    case 'UPDATE_MATRIX_ROW':
      return withItems(state, updateItemById(state.items, action.questionId, item => {
        const cfg = action.configKey
        const rows = mapById(item[cfg].rows, action.rowId, r =>
          r.text === action.text ? r : { ...r, text: action.text }
        )
        if (rows === item[cfg].rows) return item
        return { ...item, [cfg]: { ...item[cfg], rows } }
      }))

    case 'UPDATE_MATRIX_COL':
      return withItems(state, updateItemById(state.items, action.questionId, item => {
        const cfg = action.configKey
        const colKey = action.colKey || 'columns'
        const cols = mapById(item[cfg][colKey], action.colId, c =>
          c.text === action.text ? c : { ...c, text: action.text }
        )
        if (cols === item[cfg][colKey]) return item
        return { ...item, [cfg]: { ...item[cfg], [colKey]: cols } }
      }))

    case 'DELETE_MATRIX_ROW':
      return withItems(state, updateItemById(state.items, action.questionId, item => {
        const cfg = action.configKey
        return { ...item, [cfg]: { ...item[cfg], rows: item[cfg].rows.filter(r => r.id !== action.rowId) } }
      }))

    case 'DELETE_MATRIX_COL':
      return withItems(state, updateItemById(state.items, action.questionId, item => {
        const cfg = action.configKey
        const colKey = action.colKey || 'columns'
        return {
          ...item,
          [cfg]: { ...item[cfg], [colKey]: item[cfg][colKey].filter(c => c.id !== action.colId) },
        }
      }))

    case 'UPDATE_MATRIX_CONFIG':
      return withItems(state, updateItemById(state.items, action.questionId, item => {
        const cfg = action.configKey
        const nextCfg = patchNested(item[cfg], action.patch)
        return nextCfg === item[cfg] ? item : { ...item, [cfg]: nextCfg }
      }))

    case 'CLEAR_FOCUS':
      return { ...state, focusOptionId: null }

    case 'ADD_TERMINATION_RULE':
      return withItems(state, updateItemById(state.items, action.questionId, item => {
        const newRule = {
          id: newId(),
          ruleType: action.ruleType || 'choice',
          matchMode: 'any',
          optionIds: [],
          textOperator: 'contains',
          textValue: '',
          note: '',
        }
        return { ...item, terminationRules: [...(item.terminationRules || []), newRule] }
      }))

    case 'UPDATE_TERMINATION_RULE':
      return withItems(state, updateItemById(state.items, action.questionId, item => {
        const terminationRules = mapById(item.terminationRules || [], action.ruleId, r =>
          patchItem(r, action.patch)
        )
        return terminationRules === item.terminationRules
          ? item
          : { ...item, terminationRules }
      }))

    case 'DELETE_TERMINATION_RULE':
      return withItems(state, updateItemById(state.items, action.questionId, item => ({
        ...item,
        terminationRules: (item.terminationRules || []).filter(r => r.id !== action.ruleId),
      })))

    case 'SET_SURVEY_SETTING': {
      return {
        ...state,
        survey: {
          ...state.survey,
          settings: { ...state.survey.settings, [action.key]: action.value },
        },
        isDirty: true,
      }
    }

    case 'SET_PREVIEW':
      return { ...state, showPreview: action.show }

    case 'MARK_SAVED':
      return { ...state, isDirty: false }

    default:
      return state
  }
}
