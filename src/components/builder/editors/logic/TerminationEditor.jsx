import { QuestionRuleEditor } from './QuestionRuleEditor'

export function TerminationEditor({ question, dispatch, contextItems = [] }) {
  return (
    <QuestionRuleEditor
      purpose="termination"
      question={question}
      dispatch={dispatch}
      contextItems={contextItems}
    />
  )
}
