// ─── ID Generator ─────────────────────────────────────────────────────────
export const newId = () => crypto.randomUUID()

// ─── Factory helpers ───────────────────────────────────────────────────────
export const makeOption = (text = '') => ({
  id: newId(),
  text,
  anchorPosition: null,   // null | 'top' | 'bottom'
  isExclusive: false,
  terminates: false,      // immediately screen-out respondent if selected
  openText: { enabled: false, required: false, placeholder: 'Please specify...' },
})

export const makeMatrixRow = (text = '') => ({ id: newId(), text })
export const makeMatrixCol = (text = '') => ({ id: newId(), text })
export const makeMaxDiffItem      = (text = '') => ({ id: newId(), text })
export const makeCardSortCard     = (text = '', description = '') => ({ id: newId(), text, description })
export const makeCardSortCategory = (label = 'Category', color = '#6366f1') => ({ id: newId(), label, color })
export const makeConstantSumItem  = (label = '') => ({ id: newId(), label })
export const makeSliderLabel      = (value, label = '') => ({ id: newId(), value, label })
export const makeRankingItem      = (text = '') => ({ id: newId(), text })
export const makeTextboxRow       = (label = '') => ({ id: newId(), label })
export const makeImageOption      = (text = '') => ({
  id:          newId(),
  text,
  image:       null,   // base64 data URL
  imageAlt:    '',
  terminates:  false,
  isExclusive: false,
  openText:    { enabled: false, placeholder: 'Please specify…' },
})
export const makeSemanticRow      = (leftLabel = '', rightLabel = '') => ({ id: newId(), leftLabel, rightLabel })
export const makeCascadeItem      = (label = '', level = 0, parentId = null) => ({ id: newId(), label, level, parentId })

const CATEGORY_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16']

export const makeQuestion = (questionType = 'single_select') => {
  const isChoice = ['single_select', 'multi_select', 'dropdown'].includes(questionType)
  return {
    id: newId(),
    itemType: 'question',
    questionType,
    text: '',
    required: true,
    groupId: null,
    isEmailField: false,   // marks this as the email capture field for DNC matching

    // ── Option piping — dynamically pull options from a prior question's answers
    pipedOptionsConfig: {
      enabled:          false,
      sourceQuestionId: null,   // ID of the source question
    },
    visibility: makeVisibilityConfig(),

    // ── choice fields
    options: isChoice
      ? [makeOption('Option 1'), makeOption('Option 2'), makeOption('Option 3')]
      : [],
    minSelections: null,
    maxSelections: null,
    randomizeOptions: false,
    // Combination screen-out rules: evaluated with terminationLogic
    terminationRules: [],
    terminationLogic: 'if_any', // 'if_any' | 'if_none'

    // ── open text fields
    openTextConfig: {
      multiline: true,
      placeholder: 'Type your answer here...',
      minLength: null,
      maxLength: null,
      validation: {
        type: 'none',      // 'none' | 'email' | 'number' | 'url'
        numberMin: null,
        numberMax: null,
      },
    },

    // ── date fields
    dateConfig: {
      format: 'MM/DD/YYYY',   // 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD'
      minDate: '',
      maxDate: '',
    },

    // ── matrix fields
    matrixConfig: {
      subType: 'single',  // 'single' | 'multi'
      rows: [makeMatrixRow('Row 1'), makeMatrixRow('Row 2'), makeMatrixRow('Row 3')],
      columns: [makeMatrixCol('Column 1'), makeMatrixCol('Column 2'), makeMatrixCol('Column 3')],
      randomizeRows: false,
    },

    // ── bipolar matrix fields
    bipolarConfig: {
      rows: [makeMatrixRow('Item 1'), makeMatrixRow('Item 2'), makeMatrixRow('Item 3')],
      leftColumns: [makeMatrixCol('Strongly Disagree'), makeMatrixCol('Disagree')],
      rightColumns: [makeMatrixCol('Agree'), makeMatrixCol('Strongly Agree')],
      showCenter: true,
      centerLabel: 'Neutral',
      leftLabel: 'Negative',
      rightLabel: 'Positive',
      leftSelectType: 'single',   // 'single' | 'multi'
      rightSelectType: 'single',
    },

    // ── maxdiff fields
    maxDiffConfig: {
      items: [
        makeMaxDiffItem('Item 1'), makeMaxDiffItem('Item 2'), makeMaxDiffItem('Item 3'),
        makeMaxDiffItem('Item 4'), makeMaxDiffItem('Item 5'),
      ],
      itemsPerTrial: 4,
      trialsPerRespondent: null,   // null = auto (ceil(2*N/k))
      bestLabel:  'Most Important',
      worstLabel: 'Least Important',
      instruction: '',
      randomizeTrials: true,
    },

    // ── card sort fields
    cardSortConfig: {
      mode: 'closed',  // 'closed' | 'open'
      cards: [
        makeCardSortCard('Card 1'), makeCardSortCard('Card 2'),
        makeCardSortCard('Card 3'), makeCardSortCard('Card 4'),
        makeCardSortCard('Card 5'),
      ],
      categories: [
        makeCardSortCategory('Category A', CATEGORY_COLORS[0]),
        makeCardSortCategory('Category B', CATEGORY_COLORS[1]),
        makeCardSortCategory('Category C', CATEGORY_COLORS[2]),
      ],
      allowUncategorized: true,
      randomizeCards: true,
      instruction: '',
    },

    // ── constant sum fields
    constantSumConfig: {
      targetSum: 100,
      items: [
        makeConstantSumItem('Item 1'),
        makeConstantSumItem('Item 2'),
        makeConstantSumItem('Item 3'),
      ],
      allowDecimals: false,
      showRemaining: true,
      unit: '%',
      instruction: '',
    },

    // ── slider fields
    sliderConfig: {
      min: 1,
      max: 7,
      step: 1,
      defaultValue: null,
      showNumbers: true,
      labels: [
        makeSliderLabel(1, ''),
        makeSliderLabel(7, ''),
      ],
      instruction: '',
    },

    // ── NPS fields
    npsConfig: {
      minLabel:    'Not at all likely',
      maxLabel:    'Extremely likely',
      instruction: 'How likely are you to recommend us to a friend or colleague?',
      showScore:   true,   // show "Promoter / Passive / Detractor" classification
    },

    // ── Ranking fields
    rankingConfig: {
      items: [
        makeRankingItem('Item 1'),
        makeRankingItem('Item 2'),
        makeRankingItem('Item 3'),
        makeRankingItem('Item 4'),
      ],
      instruction: '',
      rankAll:   true,    // false = respondent only ranks top-N
      topN:      3,
    },

    // ── Star Rating fields
    starRatingConfig: {
      stars:         5,
      allowHalf:     false,
      defaultValue:  null,
      icon:          'star',
      minLabel:      '',
      maxLabel:      '',
      instruction:   '',
    },

    // ── Textbox List fields
    textboxListConfig: {
      rows: [
        makeTextboxRow('Brand 1'),
        makeTextboxRow('Brand 2'),
        makeTextboxRow('Brand 3'),
      ],
      placeholder:  'Type your answer…',
      instruction:  '',
    },

    // ── Semantic Differential fields
    semanticDiffConfig: {
      rows: [
        makeSemanticRow('Bad', 'Good'),
        makeSemanticRow('Weak', 'Strong'),
        makeSemanticRow('Slow', 'Fast'),
      ],
      points:       7,          // 3 | 5 | 7
      defaultValue: null,       // null = no pre-selection; number 1–points
      showNumbers:  true,
      instruction:  '',
    },

    // ── Cascading Dropdown fields (3 levels fixed)
    cascadeConfig: {
      levelLabels: ['Level 1', 'Level 2', 'Level 3'],
      items: [
        // Each item: { id, label, level (0|1|2), parentId (null for level 0) }
        makeCascadeItem('Option A', 0, null),
        makeCascadeItem('Option B', 0, null),
      ],
      instruction: '',
    },

    // ── Image choice fields
    imageChoiceConfig: {
      columns:      3,
      showLabels:   true,
      imageOptions: [
        makeImageOption('Option 1'),
        makeImageOption('Option 2'),
        makeImageOption('Option 3'),
      ],
      instruction: '',
    },
  }
}

export const makePageBreak = () => ({
  id: newId(),
  itemType: 'page_break',
  visibility: makeVisibilityConfig(),
})

export const makeGroup = (title = 'New Group') => ({
  id: newId(),
  itemType: 'group',
  title,
  collapsed: false,
  color: null,
  visibility: makeVisibilityConfig(),
})

export const makeTerminationCondition = (isFirst = false) => ({
  id: newId(),
  join: isFirst ? null : 'AND', // null for first, 'AND'|'OR' for rest
  questionId: '',
  // choice-based
  conditionType: 'any_of',  // 'any_of' | 'none_of' | 'all_of'
  optionIds: [],
  // text-based
  textOperator: 'contains', // 'contains'|'not_contains'|'equals'|'not_equals'|'greater_than'|'less_than'
  textValue: '',
})

export const makeTerminationBlock = () => ({
  id: newId(),
  itemType: 'termination_block',
  title: '',
  conditions: [],
})

export const makeTextBlock = () => ({
  id: newId(),
  itemType: 'text_block',
  title: '',
  content: '',       // HTML from RichTextEditor
  image: null,       // base64 or null
  imageCaption: '',
  visibility: makeVisibilityConfig(),
})

// ─── Visibility (show/hide) logic ──────────────────────────────────────────
// Reuses the exact same condition shape as termination rules so the same
// editor UI and evaluator logic can power both features.
export const makeVisibilityCondition = (isFirst = false) => ({
  id: newId(),
  join: isFirst ? null : 'AND', // null for first, 'AND'|'OR' for rest
  questionId: '',
  // choice-based
  conditionType: 'any_of',  // 'any_of' | 'none_of' | 'all_of'
  optionIds: [],
  // text-based
  textOperator: 'contains', // 'contains'|'not_contains'|'equals'|'not_equals'|'greater_than'|'less_than'
  textValue: '',
})

export const makeVisibilityConfig = () => ({
  enabled: false,
  mode: 'show_if',   // 'show_if' = visible only when conditions match · 'hide_if' = hidden when conditions match
  conditions: [],
})

// ─── Initial state ─────────────────────────────────────────────────────────
export const INITIAL_STATE = {
  survey: {
    id: newId(),
    title: 'Untitled Survey',
    description: '',
    // ── Internal metadata (admin/creator only) ──────────────────────────
    internalName: '',          // admin-facing label, never shown to respondents
    surveyCode:   '',          // alphanumeric code, e.g. DMR2026172
    status:       'draft',     // 'draft' | 'live' | 'paused' | 'closed'
    clientId:     '',          // reference to platform clients list
    topicId:      '',          // reference to platform topics list
    surveyType:   '',          // 'consumer' | 'b2b' | 'hcp' | 'patient' | 'caregiver'
    // ────────────────────────────────────────────────────────────────────
    coverImage: null,
    showCoverPage: true,
    startButtonText: 'Start Survey',
    companyLogo: null,
    logoPosition: 'left',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    settings: {
      onePerPage: true,
      terminateTitle:   'Thank you for your time.',
      terminateMessage: 'Unfortunately, you do not qualify for this survey.',
      closedTitle:   'This survey is now closed.',
      closedMessage: 'Thank you for your interest. This survey is no longer accepting responses.',
      fingerprinting: {
        enabled: false,
        signals: {
          ip:          true,
          browser:     true,
          os:          true,
          deviceType:  true,
          screen:      true,
          timezone:    true,
          language:    true,
          hardware:    false,
          connection:  false,
          canvas:      true,
          webgl:       false,
          cookies:     false,
          doNotTrack:  false,
          userAgent:   false,
        },
      },
    },
  },
  // Flat ordered list: questions, page_breaks, groups interleaved
  items: [],
  activeItemId: null,
  focusOptionId: null,   // triggers auto-focus in ChoiceOptionRow
  isDirty: false,
  showPreview: false,
}

// ─── Helpers ───────────────────────────────────────────────────────────────
const updateItem = (items, id, patch) =>
  items.map(item => item.id === id ? { ...item, ...patch } : item)

const getQuestion = (items, id) =>
  items.find(item => item.id === id && item.itemType === 'question')

// ─── Reducer ───────────────────────────────────────────────────────────────
export function surveyReducer(state, action) {
  const now = new Date().toISOString()

  switch (action.type) {

    // ── Survey metadata
    case 'SET_SURVEY_FIELD':
      return {
        ...state,
        survey: { ...state.survey, [action.field]: action.value, updatedAt: now },
        isDirty: true,
      }

    // ── Items (questions, page breaks, groups)
    case 'ADD_QUESTION': {
      const q = makeQuestion(action.qtype)
      // If inserting after a specific item
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
          // First condition should never have a join operator
          if (remaining.length > 0) remaining[0] = { ...remaining[0], join: null }
          return { ...item, conditions: remaining }
        }),
        isDirty: true,
      }
    }

    // ── Visibility (show/hide) logic ─────────────────────────────────────
    case 'SET_EMAIL_FIELD': {
      // Only one question can be the email capture field at a time.
      // action.id = the question to mark (or null to clear all).
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

    case 'UPDATE_ITEM':
      return {
        ...state,
        items: updateItem(state.items, action.id, action.patch),
        isDirty: true,
      }

    case 'REORDER_ITEMS':
      return { ...state, items: action.items, isDirty: true }

    // ── Options
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
      // action.lines: string[], action.currentOptionId: option to replace text of
      return {
        ...state,
        items: state.items.map(item => {
          if (item.id !== action.questionId) return item
          const idx = item.options.findIndex(o => o.id === action.currentOptionId)
          const opts = [...item.options]
          // Replace current option text with first line
          opts[idx] = { ...opts[idx], text: action.lines[0] }
          // Insert remaining lines as new options after
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

    // ── Matrix rows/cols
    case 'ADD_MATRIX_ROW': {
      return {
        ...state,
        items: state.items.map(item => {
          if (item.id !== action.questionId) return item
          const cfg = action.configKey  // 'matrixConfig' | 'bipolarConfig'
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
          const colKey = action.colKey || 'columns'  // 'columns' | 'leftColumns' | 'rightColumns'
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

    // ── Termination rules ────────────────────────────────────────────────
    case 'ADD_TERMINATION_RULE': {
      return {
        ...state,
        items: state.items.map(item => {
          if (item.id !== action.questionId) return item
          const newRule = {
            id: newId(),
            ruleType: action.ruleType || 'choice', // 'choice' | 'text'
            // choice fields
            matchMode: 'any',   // 'any' = fire if any optionId selected, 'all' = fire if all selected
            optionIds: [],
            // text fields
            textOperator: 'contains', // contains | not_contains | equals | not_equals | greater_than | less_than
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
