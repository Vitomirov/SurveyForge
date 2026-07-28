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

const updateItem = (items, id, patch) =>
  items.map(item => item.id === id ? { ...item, ...patch } : item)

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

    case 'ADD_TERMINATION_CONDITION': {
      return {
        ...state,
        items: state.items.map(item => {
          if (item.id !== action.blockId) return item
          const isFirst  = (item.conditions || []).length === 0
          const newCond  = makeTerminationCondition(isFirst)
          return { ...item, conditions: [...(item.conditions || []), newCond] }
        }),
        isDirty: true,
      }
    }

    case 'UPDATE_TERMINATION_CONDITION': {
      return {
        ...state,
        items: state.items.map(item => {
          if (item.id !== action.blockId) return item
          return {
            ...item,
            conditions: (item.conditions || []).map(c =>
              c.id === action.conditionId ? { ...c, ...action.patch } : c
            ),
          }
        }),
        isDirty: true,
      }
    }

    case 'DELETE_TERMINATION_CONDITION': {
      return {
        ...state,
        items: state.items.map(item => {
          if (item.id !== action.blockId) return item
          const remaining = (item.conditions || []).filter(c => c.id !== action.conditionId)
          if (remaining.length > 0) remaining[0] = { ...remaining[0], join: null }
          return { ...item, conditions: remaining }
        }),
        isDirty: true,
      }
    }

    case 'SET_EMAIL_FIELD': {
      return {
        ...state,
        items: state.items.map(item => {
          if (item.itemType !== 'question') return item
          return { ...item, isEmailField: item.id === action.id }
        }),
        isDirty: true,
      }
    }

    case 'SET_ITEM_VISIBILITY_MODE': {
      return {
        ...state,
        items: state.items.map(item => {
          if (item.id !== action.itemId) return item
          const vis = item.visibility || makeVisibilityConfig()
          return { ...item, visibility: { ...vis, ...action.patch } }
        }),
        isDirty: true,
      }
    }

    case 'ADD_VISIBILITY_CONDITION': {
      return {
        ...state,
        items: state.items.map(item => {
          if (item.id !== action.itemId) return item
          const vis      = item.visibility || makeVisibilityConfig()
          const isFirst  = (vis.conditions || []).length === 0
          const newCond  = makeVisibilityCondition(isFirst)
          return { ...item, visibility: { ...vis, conditions: [...(vis.conditions || []), newCond] } }
        }),
        isDirty: true,
      }
    }

    case 'UPDATE_VISIBILITY_CONDITION': {
      return {
        ...state,
        items: state.items.map(item => {
          if (item.id !== action.itemId) return item
          const vis = item.visibility || makeVisibilityConfig()
          return {
            ...item,
            visibility: {
              ...vis,
              conditions: (vis.conditions || []).map(c =>
                c.id === action.conditionId ? { ...c, ...action.patch } : c
              ),
            },
          }
        }),
        isDirty: true,
      }
    }

    case 'DELETE_VISIBILITY_CONDITION': {
      return {
        ...state,
        items: state.items.map(item => {
          if (item.id !== action.itemId) return item
          const vis = item.visibility || makeVisibilityConfig()
          const remaining = (vis.conditions || []).filter(c => c.id !== action.conditionId)
          if (remaining.length > 0) remaining[0] = { ...remaining[0], join: null }
          return { ...item, visibility: { ...vis, conditions: remaining } }
        }),
        isDirty: true,
      }
    }

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
      const idx = state.items.findIndex(i => i.id === action.id)
      if (idx === -1) return state
      const orig = state.items[idx]
      const copy = {
        ...JSON.parse(JSON.stringify(orig)),
        id: newId(),
        options: orig.options ? orig.options.map(o => ({ ...o, id: newId() })) : undefined,
      }
      const next = [...state.items]
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
      return {
        ...state,
        items: updateItem(state.items, action.id, action.patch),
        isDirty: true,
      }

    case 'REORDER_ITEMS':
      return { ...state, items: action.items, isDirty: true }

    case 'ADD_OPTION': {
      return {
        ...state,
        items: state.items.map(item => {
          if (item.id !== action.questionId) return item
          return { ...item, options: [...item.options, makeOption()] }
        }),
        isDirty: true,
      }
    }

    case 'ADD_OPTION_AFTER': {
      const newOpt = makeOption()
      return {
        ...state,
        items: state.items.map(item => {
          if (item.id !== action.questionId) return item
          const idx = item.options.findIndex(o => o.id === action.afterOptionId)
          const opts = [...item.options]
          opts.splice(idx + 1, 0, newOpt)
          return { ...item, options: opts }
        }),
        focusOptionId: newOpt.id,
        isDirty: true,
      }
    }

    case 'PASTE_OPTIONS': {
      return {
        ...state,
        items: state.items.map(item => {
          if (item.id !== action.questionId) return item
          const idx = item.options.findIndex(o => o.id === action.currentOptionId)
          const opts = [...item.options]
          opts[idx] = { ...opts[idx], text: action.lines[0] }
          const newOpts = action.lines.slice(1).map(text => makeOption(text))
          opts.splice(idx + 1, 0, ...newOpts)
          return { ...item, options: opts }
        }),
        isDirty: true,
      }
    }

    case 'UPDATE_OPTION': {
      return {
        ...state,
        items: state.items.map(item => {
          if (item.id !== action.questionId) return item
          return {
            ...item,
            options: item.options.map(o =>
              o.id === action.optionId ? { ...o, ...action.patch } : o
            ),
          }
        }),
        isDirty: true,
      }
    }

    case 'UPDATE_OPTION_OPEN_TEXT': {
      return {
        ...state,
        items: state.items.map(item => {
          if (item.id !== action.questionId) return item
          return {
            ...item,
            options: item.options.map(o =>
              o.id === action.optionId
                ? { ...o, openText: { ...o.openText, ...action.patch } }
                : o
            ),
          }
        }),
        isDirty: true,
      }
    }

    case 'DELETE_OPTION': {
      return {
        ...state,
        items: state.items.map(item => {
          if (item.id !== action.questionId) return item
          return { ...item, options: item.options.filter(o => o.id !== action.optionId) }
        }),
        isDirty: true,
      }
    }

    case 'REORDER_OPTIONS': {
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.questionId ? { ...item, options: action.options } : item
        ),
        isDirty: true,
      }
    }

    case 'ADD_MATRIX_ROW': {
      return {
        ...state,
        items: state.items.map(item => {
          if (item.id !== action.questionId) return item
          const cfg = action.configKey
          return { ...item, [cfg]: { ...item[cfg], rows: [...item[cfg].rows, makeMatrixRow()] } }
        }),
        isDirty: true,
      }
    }

    case 'ADD_MATRIX_COL': {
      return {
        ...state,
        items: state.items.map(item => {
          if (item.id !== action.questionId) return item
          const cfg = action.configKey
          const colKey = action.colKey || 'columns'
          return { ...item, [cfg]: { ...item[cfg], [colKey]: [...item[cfg][colKey], makeMatrixCol()] } }
        }),
        isDirty: true,
      }
    }

    case 'UPDATE_MATRIX_ROW': {
      return {
        ...state,
        items: state.items.map(item => {
          if (item.id !== action.questionId) return item
          const cfg = action.configKey
          return {
            ...item,
            [cfg]: {
              ...item[cfg],
              rows: item[cfg].rows.map(r => r.id === action.rowId ? { ...r, text: action.text } : r),
            },
          }
        }),
        isDirty: true,
      }
    }

    case 'UPDATE_MATRIX_COL': {
      return {
        ...state,
        items: state.items.map(item => {
          if (item.id !== action.questionId) return item
          const cfg = action.configKey
          const colKey = action.colKey || 'columns'
          return {
            ...item,
            [cfg]: {
              ...item[cfg],
              [colKey]: item[cfg][colKey].map(c => c.id === action.colId ? { ...c, text: action.text } : c),
            },
          }
        }),
        isDirty: true,
      }
    }

    case 'DELETE_MATRIX_ROW': {
      return {
        ...state,
        items: state.items.map(item => {
          if (item.id !== action.questionId) return item
          const cfg = action.configKey
          return { ...item, [cfg]: { ...item[cfg], rows: item[cfg].rows.filter(r => r.id !== action.rowId) } }
        }),
        isDirty: true,
      }
    }

    case 'DELETE_MATRIX_COL': {
      return {
        ...state,
        items: state.items.map(item => {
          if (item.id !== action.questionId) return item
          const cfg = action.configKey
          const colKey = action.colKey || 'columns'
          return {
            ...item,
            [cfg]: { ...item[cfg], [colKey]: item[cfg][colKey].filter(c => c.id !== action.colId) },
          }
        }),
        isDirty: true,
      }
    }

    case 'UPDATE_MATRIX_CONFIG': {
      return {
        ...state,
        items: state.items.map(item => {
          if (item.id !== action.questionId) return item
          const cfg = action.configKey
          return { ...item, [cfg]: { ...item[cfg], ...action.patch } }
        }),
        isDirty: true,
      }
    }

    case 'CLEAR_FOCUS':
      return { ...state, focusOptionId: null }

    case 'ADD_TERMINATION_RULE': {
      return {
        ...state,
        items: state.items.map(item => {
          if (item.id !== action.questionId) return item
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
        }),
        isDirty: true,
      }
    }

    case 'UPDATE_TERMINATION_RULE': {
      return {
        ...state,
        items: state.items.map(item => {
          if (item.id !== action.questionId) return item
          return {
            ...item,
            terminationRules: (item.terminationRules || []).map(r =>
              r.id === action.ruleId ? { ...r, ...action.patch } : r
            ),
          }
        }),
        isDirty: true,
      }
    }

    case 'DELETE_TERMINATION_RULE': {
      return {
        ...state,
        items: state.items.map(item => {
          if (item.id !== action.questionId) return item
          return { ...item, terminationRules: (item.terminationRules || []).filter(r => r.id !== action.ruleId) }
        }),
        isDirty: true,
      }
    }

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
