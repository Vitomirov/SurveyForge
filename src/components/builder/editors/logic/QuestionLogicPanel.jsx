import { Divider } from '@/components/ui'
import { TerminationEditor } from './TerminationEditor'
import { BranchEditor } from './BranchEditor'
import { ExternalRedirectEditor } from './ExternalRedirectEditor'

export function QuestionLogicPanel({
  question,
  dispatch,
  allItems = [],
  itemIndex = 0,
  contextItems,
  tips,
  beforeTermination,
  terminationHint,
  branchHint,
  redirectHint,
  terminationEditor: TerminationEditorComponent = TerminationEditor,
}) {
  const ruleContextItems = contextItems ?? []

  return (
    <>
      {tips}
      <Divider label="Screen-out Rules" />
      {beforeTermination}
      {terminationHint && (
        <p className="text-xs text-ink-400 mb-3">{terminationHint}</p>
      )}
      <TerminationEditorComponent
        question={question}
        dispatch={dispatch}
        contextItems={ruleContextItems}
      />

      <Divider label="Skip to Page" />
      {branchHint && (
        <p className="text-xs text-ink-400 mb-3">{branchHint}</p>
      )}
      <BranchEditor
        question={question}
        dispatch={dispatch}
        allItems={allItems}
        itemIndex={itemIndex}
        contextItems={ruleContextItems}
      />

      <Divider label="Skip to External URL" />
      {redirectHint && (
        <p className="text-xs text-ink-400 mb-3">{redirectHint}</p>
      )}
      <ExternalRedirectEditor
        question={question}
        dispatch={dispatch}
        contextItems={ruleContextItems}
      />
    </>
  )
}

export default QuestionLogicPanel
