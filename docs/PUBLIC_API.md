# SurveyForge — Public API Reference

This document describes the module layout and stable import paths after the phased refactor (Phases 0–10). Use it when extending question types, wiring new features, or onboarding contributors.

---

## Top-level components

Import from `@/components`:

| Export | Module | Purpose |
|--------|--------|---------|
| `LoginPage` | `auth/LoginPage` | Admin login |
| `Dashboard` | `dashboard/Dashboard` | Survey library home |
| `PlatformSettings` | `dashboard/PlatformSettings` | Clients/topics admin |
| `SurveyBuilder` | `builder/SurveyBuilder` | Main builder UI |
| `SurveyMetadata` | `builder/SurveyMetadata` | Internal survey fields |
| `ExportManager` | `builder/ExportManager` | Response CSV export modal |
| `SurveyTestRunner` | `builder/test-runner` | Branch simulation modal |
| `SurveyPreview` | `taker/SurveyPreview` | Respondent-facing survey |

### Builder sub-modules

```
builder/
├── panels/          AddPanel, StatsPanel, EmptyState
├── test-runner/     analyzeBranches, runSimulation, SurveyTestRunner
├── editors/         QuestionTypeEditor + 18 type editors (registry)
├── items/           QuestionCard, PageBreakItem, GroupItem, …
└── SurveyBuilder.jsx
```

### Taker sub-modules

```
taker/
├── questions/       QuestionRenderer + 18 renderers (registry)
├── screens/         CoverPage, CompletionScreen, TerminationScreen, ClosedSurveyScreen
└── SurveyPreview.jsx
```

### Shared UI

Import from `@/components/shared`:

| Export | Purpose |
|--------|---------|
| `RichTextEditor` | HTML content editor |
| `VisibilityEditor` | Conditional show/hide panel |
| `ConditionBuilder` | Shared condition list (visibility + termination blocks) |
| `EditableListRow` | Ranking/constant-sum/textbox/maxdiff/card-sort rows |
| `DeletableTextInput` | Matrix row/column label inputs |
| `ErrorBoundary` | Render error recovery wrapper |

---

## Store

Import from `@/store/surveyStore` (backward-compatible barrel):

| Export | Module | Purpose |
|--------|--------|---------|
| `newId` | `store/id.js` | UUID generator |
| `makeQuestion`, `makeOption`, … | `store/factories.js` | Item/question factories |
| `INITIAL_STATE` | `store/initialState.js` | Default builder state |
| `surveyReducer` | `store/surveyReducer.js` | All dispatch actions |

Granular imports also available from `@/store` (same exports).

### Key dispatch actions

| Action | Description |
|--------|-------------|
| `ADD_QUESTION`, `ADD_PAGE_BREAK`, `ADD_GROUP`, `ADD_TEXT_BLOCK`, `ADD_TERMINATION_BLOCK` | Insert items |
| `UPDATE_ITEM`, `DELETE_ITEM`, `DUPLICATE_ITEM`, `REORDER_ITEMS` | Item CRUD |
| `ADD_OPTION`, `UPDATE_OPTION`, `DELETE_OPTION`, `REORDER_OPTIONS` | Choice options |
| `UPDATE_MATRIX_*`, `ADD_MATRIX_*`, `DELETE_MATRIX_*` | Matrix rows/cols |
| `SET_ITEM_VISIBILITY_MODE`, `ADD/UPDATE/DELETE_VISIBILITY_CONDITION` | Visibility rules |
| `ADD/UPDATE/DELETE_TERMINATION_CONDITION` | Termination block conditions |
| `ADD/UPDATE/DELETE_TERMINATION_RULE` | Per-question termination rules |
| `SET_SURVEY_FIELD`, `SET_SURVEY_SETTING` | Survey metadata |

---

## Utils — engines & helpers

### Question metadata (SSOT)

`@/utils/questionHelpers.js`

- `QUESTION_TYPES`, `QUESTION_TYPE_KEYS` — canonical type list
- `TYPE_ICONS`, `TYPE_COLORS` — builder UI tokens
- `isChoiceType(type)` — choice question check

### Condition evaluation (SSOT)

| Module | Exports | Used by |
|--------|---------|---------|
| `conditionConstants.js` | Operator labels | ConditionBuilder, TerminationEditor |
| `conditionEngine.js` | `evalCondition`, `evalConditionSet` | visibility, termination, test runner |
| `visibilityEngine.js` | `isItemVisible`, `buildVisiblePages` | taker, test runner |
| `terminationEngine.js` | `evalBlock`, `checkTermination` | taker, test runner |

### Taker runtime

| Module | Exports |
|--------|---------|
| `answerValidation.js` | `validateAnswer(question, value)` |
| `shuffleArray.js` | Fisher–Yates shuffle (matrix randomize, maxdiff) |
| `piping.js` | Answer piping into text/options |

### CSV export

Import from `@/utils/csvExport` (barrel):

| Export | Module |
|--------|--------|
| `generateCSV` | `csv/generateCSV.js` |
| `generateTemplateCSV` | `csv/generateCSV.js` |
| `downloadCSV` | `csv/downloadCSV.js` |

Granular: `@/utils/csv` exports `formatAnswer`, `sampleValue`, etc.

### Persistence

| Module | Purpose |
|--------|---------|
| `surveyLibrary.js` | Local survey save/load (`upsertSurvey`, `loadSurvey`) |
| `responseStore.js` | Stored respondent answers |
| `authStore.js` | Admin session |
| `dncStore.js` | Do-not-contact list |

---

## Adding a new question type

1. Add entry to `QUESTION_TYPES` in `questionHelpers.js` (+ icon/color)
2. Add default config in `store/factories.js` → `makeQuestion`
3. Create builder editor in `builder/editors/` and register in `QuestionTypeEditor.jsx`
4. Create taker renderer in `taker/questions/` and register in `QuestionRenderer.jsx`
5. Add validation branch in `answerValidation.js` (if needed)
6. Add CSV formatting in `csv/formatAnswer.js` + `csv/sampleValue.js`
7. Run `npm run check:registries` — must pass with zero missing types

---

## Verification

### Registry parity

```bash
npm run check:registries
```

Ensures builder registry, taker registry, `TYPE_ICONS`, and `TYPE_COLORS` all match `QUESTION_TYPES`.

### Manual smoke test

See `docs/SMOKE_CHECKLIST.md` for full QA pass (visibility, termination, all question types, test runner, export).

### Dev server

```bash
npm run dev
```

---

## Error boundaries

`ErrorBoundary` wraps each major app surface in `App.jsx`:

- **Dashboard** — library list errors
- **SurveyBuilder** — builder/editor errors (reset returns to dashboard)
- **SurveyPreview** — taker/preview errors (admin + public routes)

In development, the error message is shown in the fallback UI. In production, users see a friendly recovery screen with **Try again** and **Reload page**.

---

## Architecture diagram

```
src/
├── App.jsx                 Route shell + error boundaries
├── components/
│   ├── auth/
│   ├── dashboard/
│   ├── builder/            Builder UI + panels + test-runner
│   ├── taker/              Preview/taker + question registry
│   ├── shared/             Reusable editors + ErrorBoundary
│   └── ui/
├── store/                  State factories + reducer
└── utils/                  Engines, CSV, persistence
```

**Registry pattern:** `questionHelpers.js` is the single source of truth for types; `QuestionTypeEditor` (builder) and `QuestionRenderer` (taker) are parallel registries that must stay in sync.
