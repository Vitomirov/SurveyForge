import { isChoiceType } from '@/utils/questionHelpers'
import { LazyComponent } from '@/components/shared/LazyComponent'
import { EDITOR_LOADERS, loadChoiceEditor } from './editorLoaders'

const EDITOR_FALLBACK = <div className="h-8 animate-pulse bg-ink-100 rounded" />

/**
 * Renders the type-specific editor for a survey question.
 * Central registry — add new question types in editorLoaders.js only.
 */
export function QuestionTypeEditor({
  question,
  dispatch,
  focusOptionId,
  availableQuestions,
  contextItems = [],
  surveyDateFormat,
}) {
  const { questionType } = question

  const loader = isChoiceType(questionType)
    ? loadChoiceEditor
    : EDITOR_LOADERS[questionType]

  if (!loader) return null

  return (
    <LazyComponent
      loader={loader}
      fallback={EDITOR_FALLBACK}
      question={question}
      dispatch={dispatch}
      focusOptionId={focusOptionId}
      availableQuestions={availableQuestions}
      contextItems={contextItems}
      surveyDateFormat={surveyDateFormat}
    />
  )
}
