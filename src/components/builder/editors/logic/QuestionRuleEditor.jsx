import { Plus, Trash2, UserX, AlertTriangle, GitBranch, ExternalLink } from 'lucide-react'
import { isMatrixType } from '@/utils/survey/questions/questionHelpers'
import { getBuilderConditionOptions } from '@/utils/survey/questions/questionOptions'
import { buildPageTargets } from '@/utils/format/builderLayout'
import { isSafeExternalUrl } from '@/utils/survey/engines/externalRedirectEngine'
import { RuleConditionBody } from '@/components/shared/conditions/RuleConditionBody'
import {
  defaultTextOrValueRuleType,
  questionSupportsChoiceRules,
  resolveRuleVariant,
  ruleSummaryPhrase,
  textOrValueRuleButtonLabel,
} from '@/utils/survey/conditions/ruleVariant'
import { RuleLogicSelector } from './RuleLogicSelector'
import { QUESTION_RULE_LOGIC, normalizeQuestionRuleLogic, questionRuleLogicSummary } from '@/utils/survey/conditions/questionRuleLogic'

export const QUESTION_RULE_PURPOSE = {
  termination: {
    rulesKey: 'terminationRules',
    logicKey: 'terminationLogic',
    addAction: 'ADD_TERMINATION_RULE',
    updateAction: 'UPDATE_TERMINATION_RULE',
    deleteAction: 'DELETE_TERMINATION_RULE',
    logicPurpose: 'termination',
    Icon: UserX,
    theme: {
      cardBorder: 'border-rose-200',
      headerBg: 'bg-rose-50',
      icon: 'text-rose-500',
      title: 'text-rose-600',
      toggleBorder: 'border-rose-200',
      toggleActive: 'bg-rose-500 text-white',
      toggleIdle: 'bg-white text-rose-500 hover:bg-rose-50',
      summary: 'text-rose-400',
      deleteBtn: 'text-rose-400 hover:text-rose-600',
      checkboxSelected: 'border-rose-500 bg-rose-500',
      checkboxHover: 'group-hover:border-rose-400',
      addBtn: 'flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-medium px-3 py-1.5 border border-rose-200 hover:bg-rose-50 rounded-lg transition-all',
      pillWrap: 'bg-rose-50 border-rose-100',
    },
    matchModeLabel: 'Fire if',
    showTerminatesBadge: true,
    showOperatorHint: true,
    showNumericTextHint: true,
    extraPlacement: 'after',
    emptyMessage: 'No rules yet — add one below.',
    alwaysShowLogic: true,
    showEmptyWhenNoRules: true,
    supportsMatrix: false,
    addDisabled: false,
    ifNoneLabel: 'Qualifying mode active:',
    ifNoneBody: (n) => (
      <>
        respondent is terminated if their answer matches <strong>none</strong> of the {n} rule{n !== 1 ? 's' : ''} above.
        They must satisfy at least one to continue.
      </>
    ),
  },
  branch: {
    rulesKey: 'branchRules',
    logicKey: 'branchLogic',
    addAction: 'ADD_BRANCH_RULE',
    updateAction: 'UPDATE_BRANCH_RULE',
    deleteAction: 'DELETE_BRANCH_RULE',
    logicPurpose: 'branch',
    Icon: GitBranch,
    theme: {
      cardBorder: 'border-sky-200',
      headerBg: 'bg-sky-50',
      icon: 'text-sky-600',
      title: 'text-sky-700',
      toggleBorder: 'border-sky-200',
      toggleActive: 'bg-sky-600 text-white',
      toggleIdle: 'bg-white text-sky-600 hover:bg-sky-50',
      summary: 'text-sky-500',
      deleteBtn: 'text-sky-400 hover:text-sky-700',
      checkboxSelected: 'border-sky-600 bg-sky-600',
      checkboxHover: 'group-hover:border-sky-400',
      addBtn: 'flex items-center gap-1.5 text-xs text-sky-700 hover:text-sky-800 font-medium px-3 py-1.5 border border-sky-200 hover:bg-sky-50 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed',
      pillWrap: 'bg-sky-50 border-sky-100',
      countBadge: 'bg-sky-600 text-white',
    },
    matchModeLabel: 'When',
    extraPlacement: 'before',
    emptyMessage: 'No branch rules yet — add one below.',
    countNoun: 'branch rule',
    supportsMatrix: true,
    requiresPageTargets: true,
    showLogicWhenHasRules: true,
    showEmptyWhenNoRules: 'pageTargets',
    addDisabled: 'pageTargets',
    footerIfAny: 'Rules are checked when the respondent clicks Next. The first matching rule skips ahead; otherwise the survey continues sequentially.',
    footerIfNone: 'Rules are checked when the respondent clicks Next. If none match, they skip to the fallback page; otherwise they continue sequentially.',
    ifNoneLabel: 'Fallback mode active:',
    ifNoneBody: (n) => (
      <>
        respondent skips ahead if their answer matches{' '}
        <strong>none</strong> of the {n} rule{n !== 1 ? 's' : ''} above.
        Matching any rule keeps them on the normal path.
      </>
    ),
  },
  redirect: {
    rulesKey: 'externalRedirectRules',
    logicKey: 'externalRedirectLogic',
    addAction: 'ADD_EXTERNAL_REDIRECT_RULE',
    updateAction: 'UPDATE_EXTERNAL_REDIRECT_RULE',
    deleteAction: 'DELETE_EXTERNAL_REDIRECT_RULE',
    logicPurpose: 'redirect',
    Icon: ExternalLink,
    theme: {
      cardBorder: 'border-emerald-200',
      headerBg: 'bg-emerald-50',
      icon: 'text-emerald-600',
      title: 'text-emerald-700',
      toggleBorder: 'border-emerald-200',
      toggleActive: 'bg-emerald-600 text-white',
      toggleIdle: 'bg-white text-emerald-600 hover:bg-emerald-50',
      summary: 'text-emerald-500',
      deleteBtn: 'text-emerald-400 hover:text-emerald-700',
      checkboxSelected: 'border-emerald-600 bg-emerald-600',
      checkboxHover: 'group-hover:border-emerald-400',
      addBtn: 'flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 font-medium px-3 py-1.5 border border-emerald-200 hover:bg-emerald-50 rounded-lg transition-all',
      pillWrap: 'bg-emerald-50 border-emerald-100',
      countBadge: 'bg-emerald-600 text-white',
    },
    matchModeLabel: 'When',
    extraPlacement: 'before',
    emptyMessage: 'No external redirect rules yet — add one below.',
    countNoun: 'external redirect rule',
    supportsMatrix: true,
    showLogicWhenHasRules: true,
    showEmptyWhenNoRules: true,
    footerIfAny: 'Matching rules open the link in a new tab and end the survey when the respondent clicks Next.',
    footerIfNone: 'Rules are checked when the respondent clicks Next. If none match, they are redirected to the fallback URL; otherwise the survey continues.',
    ifNoneLabel: 'Fallback mode active:',
    ifNoneBody: (n) => (
      <>
        respondent is redirected if their answer matches{' '}
        <strong>none</strong> of the {n} rule{n !== 1 ? 's' : ''} above.
        Matching any rule keeps them in the survey.
      </>
    ),
  },
}

function TargetPageSelect({ value, targets, onChange }) {
  return (
    <select
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      className="input-base py-1.5 text-xs font-medium"
    >
      <option value="">— Select target page —</option>
      {targets.map(t => (
        <option key={t.id} value={t.id}>{t.label}</option>
      ))}
    </select>
  )
}

function matrixSummary(rule, question) {
  const rows = question.matrixConfig?.rows || []
  const cols = question.matrixConfig?.columns || []
  const row = rows.find(r => r.id === rule.matrixRowId)
  const colLabels = (rule.matrixColumnIds || []).map(id => cols.find(c => c.id === id)?.text || '?')
  return `${row?.text || 'Row'} → ${colLabels.length ? colLabels.join(', ') : 'no columns'}`
}

function RuleCard({
  purpose,
  rule,
  ruleIndex,
  question,
  dispatch,
  onDelete,
  showChoiceRules,
  contextItems,
  pageTargets,
  showTargetPage,
  showExternalUrl,
  renderMatrixFields: MatrixFields,
}) {
  const cfg = QUESTION_RULE_PURPOSE[purpose]
  const theme = cfg.theme
  const Icon = cfg.Icon
  const opts = getBuilderConditionOptions(question, contextItems)
  const variant = resolveRuleVariant(rule, question)
  const isMatrix = rule.ruleType === 'matrix'

  const update = (patch) =>
    dispatch({ type: cfg.updateAction, questionId: question.id, ruleId: rule.id, patch })

  const targetLabel = pageTargets?.find(t => t.id === rule.targetPageBreakId)?.label || 'No page selected'
  const urlPreview = rule.externalUrl?.trim() || 'No URL set'
  const urlValid = !rule.externalUrl || isSafeExternalUrl(rule.externalUrl)

  let summary = isMatrix ? matrixSummary(rule, question) : ruleSummaryPhrase(rule, question, contextItems)
  if (purpose === 'branch' && showTargetPage) summary = `${summary} → ${targetLabel}`
  if (purpose === 'redirect' && showExternalUrl) summary = `${summary} → ${urlPreview}`

  const extra = purpose === 'termination' ? (
    <input
      type="text"
      value={rule.note}
      onChange={e => update({ note: e.target.value })}
      placeholder="Internal note (optional)…"
      className="w-full text-xs border border-ink-100 rounded-lg px-2 py-1 bg-ink-50 placeholder:text-ink-300 focus:outline-none focus:ring-1 focus:ring-rose-300 focus:bg-white transition-colors"
    />
  ) : purpose === 'branch' && showTargetPage ? (
    <div>
      <label className="text-xs text-ink-500 mb-1 block">Skip to page</label>
      <TargetPageSelect
        value={rule.targetPageBreakId}
        targets={pageTargets}
        onChange={v => update({ targetPageBreakId: v })}
      />
    </div>
  ) : purpose === 'redirect' && showExternalUrl ? (
    <div>
      <label className="text-xs text-ink-500 mb-1 block">External URL</label>
      <input
        type="url"
        value={rule.externalUrl || ''}
        onChange={e => update({ externalUrl: e.target.value })}
        placeholder="https://example.com/landing-page"
        className={`input-base py-1.5 text-sm ${!urlValid ? 'border-amber-400' : ''}`}
      />
      {!urlValid && (
        <p className="text-xs text-amber-600 mt-1">Enter a valid http:// or https:// URL.</p>
      )}
    </div>
  ) : null

  return (
    <div className={`border ${theme.cardBorder} rounded-xl overflow-hidden bg-white`}>
      <div className={`flex items-center gap-2 px-3 py-2 ${theme.headerBg}`}>
        <Icon size={12} className={`${theme.icon} shrink-0`} />
        <span className={`text-xs font-bold ${theme.title}`}>Rule {ruleIndex + 1}</span>

        {showChoiceRules && !isMatrix && (
          <div className={`flex rounded-lg overflow-hidden border ${theme.toggleBorder} ml-1`}>
            {[['choice', 'Choice'], ['text', 'Text']].map(([v, l]) => (
              <button
                key={v}
                onClick={() => update({ ruleType: v })}
                className={`px-2 py-0.5 text-xs font-medium transition-colors ${
                  rule.ruleType === v ? theme.toggleActive : theme.toggleIdle
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        )}

        <span className={`text-xs ${theme.summary} flex-1 truncate ml-1`}>{summary}</span>
        <button onClick={onDelete} className={`p-1 ${theme.deleteBtn} transition-colors shrink-0`}>
          <Trash2 size={12} />
        </button>
      </div>

      <div className="px-3 py-3 space-y-2.5">
        {cfg.extraPlacement === 'before' && extra}
        {isMatrix && MatrixFields && (
          <MatrixFields rule={rule} question={question} onChange={update} />
        )}
        <RuleConditionBody
          rule={rule}
          question={question}
          variant={variant}
          options={opts}
          onChange={update}
          matchModeLabel={cfg.matchModeLabel}
          checkboxSelectedClass={theme.checkboxSelected}
          checkboxHoverClass={theme.checkboxHover}
          showTerminatesBadge={cfg.showTerminatesBadge}
          showOperatorHint={cfg.showOperatorHint}
          showNumericTextHint={cfg.showNumericTextHint}
        />
        {cfg.extraPlacement === 'after' && extra}
      </div>
    </div>
  )
}

export function QuestionRuleEditor({
  purpose,
  question,
  dispatch,
  allItems = [],
  itemIndex = 0,
  contextItems = [],
  renderMatrixFields,
}) {
  const cfg = QUESTION_RULE_PURPOSE[purpose]
  const theme = cfg.theme
  const Icon = cfg.Icon
  const rules = question[cfg.rulesKey] || []
  const logic = normalizeQuestionRuleLogic(question[cfg.logicKey])
  const isIfNone = logic === QUESTION_RULE_LOGIC.IF_NONE
  const showChoiceRule = questionSupportsChoiceRules(question)
  const isMatrixQ = isMatrixType(question.questionType)
  const pageTargets = cfg.requiresPageTargets ? buildPageTargets(allItems, itemIndex) : []
  const ruleContextItems = contextItems.length ? contextItems : allItems
  const addDisabled = cfg.addDisabled === 'pageTargets' && pageTargets.length <= 1
  const hasPageTargets = pageTargets.length > 1

  const addRule = (ruleType) =>
    dispatch({ type: cfg.addAction, questionId: question.id, ruleType })

  const deleteRule = (ruleId) =>
    dispatch({ type: cfg.deleteAction, questionId: question.id, ruleId })

  const setLogic = (val) =>
    dispatch({ type: 'UPDATE_ITEM', id: question.id, patch: { [cfg.logicKey]: val } })

  const showLogic = cfg.alwaysShowLogic
    || (cfg.showLogicWhenHasRules && rules.length > 0 && (!cfg.requiresPageTargets || hasPageTargets))
  const showEmpty = rules.length === 0 && (
    cfg.showEmptyWhenNoRules === true
    || (cfg.showEmptyWhenNoRules === 'pageTargets' && hasPageTargets)
  )

  const effectiveOpts = purpose === 'termination' ? getBuilderConditionOptions(question, contextItems) : []
  const perOptCount = effectiveOpts.filter(o => o.terminates).length
  const noneUrlValid = !question.externalRedirectNoneUrl || isSafeExternalUrl(question.externalRedirectNoneUrl)

  return (
    <div>
      {purpose === 'termination' && (perOptCount > 0 || rules.length > 0) && (
        <div className={`flex flex-wrap gap-1.5 mb-3 p-2 ${theme.pillWrap} border rounded-lg`}>
          {perOptCount > 0 && (
            <span className="text-xs bg-rose-600 text-white px-2 py-0.5 rounded flex items-center gap-1">
              <UserX size={9} /> {perOptCount} instant terminate{perOptCount !== 1 ? 's' : ''}
            </span>
          )}
          {rules.length > 0 && (
            <span className="text-xs bg-rose-100 text-rose-700 border border-rose-200 px-2 py-0.5 rounded flex items-center gap-1">
              <AlertTriangle size={9} /> {rules.length} rule{rules.length !== 1 ? 's' : ''} · <em>{questionRuleLogicSummary(logic)}</em>
            </span>
          )}
        </div>
      )}

      {purpose !== 'termination' && rules.length > 0 && (
        <div className={`flex flex-wrap gap-1.5 mb-3 p-2 ${theme.pillWrap} border rounded-lg`}>
          <span className={`text-xs ${theme.countBadge} px-2 py-0.5 rounded flex items-center gap-1`}>
            <Icon size={9} /> {rules.length} {cfg.countNoun}{rules.length !== 1 ? 's' : ''} · <em>{questionRuleLogicSummary(logic)}</em>
          </span>
        </div>
      )}

      {cfg.requiresPageTargets && pageTargets.length <= 1 && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3">
          Add a page break after this question to enable skip-to-page branching.
        </p>
      )}

      {showLogic && (
        <div className="mb-3">
          <RuleLogicSelector purpose={cfg.logicPurpose} value={logic} onChange={setLogic} />
        </div>
      )}

      {purpose === 'branch' && isIfNone && rules.length > 0 && hasPageTargets && (
        <div className="mb-3">
          <label className="text-xs text-ink-500 mb-1 block">Skip to page (when no rules match)</label>
          <TargetPageSelect
            value={question.branchNoneTargetPageBreakId || ''}
            targets={pageTargets}
            onChange={targetPageBreakId =>
              dispatch({ type: 'UPDATE_ITEM', id: question.id, patch: { branchNoneTargetPageBreakId: targetPageBreakId } })
            }
          />
        </div>
      )}

      {purpose === 'redirect' && isIfNone && rules.length > 0 && (
        <div className="mb-3">
          <label className="text-xs text-ink-500 mb-1 block">External URL (when no rules match)</label>
          <input
            type="url"
            value={question.externalRedirectNoneUrl || ''}
            onChange={e =>
              dispatch({ type: 'UPDATE_ITEM', id: question.id, patch: { externalRedirectNoneUrl: e.target.value } })
            }
            placeholder="https://example.com/fallback"
            className={`input-base py-1.5 text-sm ${!noneUrlValid ? 'border-amber-400' : ''}`}
          />
          {!noneUrlValid && (
            <p className="text-xs text-amber-600 mt-1">Enter a valid http:// or https:// URL.</p>
          )}
        </div>
      )}

      {rules.length > 0 && (
        <div className="space-y-2.5 mb-3">
          {rules.map((rule, ri) => (
            <RuleCard
              key={rule.id}
              purpose={purpose}
              rule={rule}
              ruleIndex={ri}
              question={question}
              dispatch={dispatch}
              onDelete={() => deleteRule(rule.id)}
              showChoiceRules={showChoiceRule}
              contextItems={purpose === 'branch' ? ruleContextItems : contextItems}
              pageTargets={pageTargets}
              showTargetPage={purpose === 'branch' && !isIfNone}
              showExternalUrl={purpose === 'redirect' && !isIfNone}
              renderMatrixFields={renderMatrixFields}
            />
          ))}
        </div>
      )}

      {showEmpty && (
        <p className="text-xs text-ink-300 italic py-1 mb-2">{cfg.emptyMessage}</p>
      )}

      <div className="flex gap-2 flex-wrap">
        {cfg.supportsMatrix && isMatrixQ && (
          <button
            onClick={() => addRule('matrix')}
            disabled={cfg.addDisabled === 'pageTargets' ? addDisabled : undefined}
            className={theme.addBtn}
          >
            <Plus size={12} /> Matrix rule
          </button>
        )}
        {showChoiceRule && (
          <button
            onClick={() => addRule('choice')}
            disabled={cfg.addDisabled === 'pageTargets' ? addDisabled : undefined}
            className={theme.addBtn}
          >
            <Plus size={12} /> Choice rule
          </button>
        )}
        {(!cfg.supportsMatrix || !isMatrixQ) && (
          <button
            onClick={() => addRule(defaultTextOrValueRuleType(question))}
            disabled={cfg.addDisabled === 'pageTargets' ? addDisabled : undefined}
            className={theme.addBtn}
          >
            <Plus size={12} /> {textOrValueRuleButtonLabel(question)}
          </button>
        )}
      </div>

      {cfg.footerIfAny && rules.length > 0 && (
        <p className="text-xs text-ink-400 mt-3">
          {isIfNone ? cfg.footerIfNone : cfg.footerIfAny}
        </p>
      )}

      {isIfNone && rules.length > 0 && (
        <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-800">
            <strong>{cfg.ifNoneLabel}</strong> {cfg.ifNoneBody(rules.length)}
          </p>
        </div>
      )}
    </div>
  )
}

export default QuestionRuleEditor
