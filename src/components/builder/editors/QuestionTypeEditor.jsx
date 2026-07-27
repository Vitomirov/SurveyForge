import { isChoiceType } from '@/utils/questionHelpers'
import { ChoiceEditor } from './ChoiceEditor'
import { OpenTextEditor } from './OpenTextEditor'
import { DateEditor } from './DateEditor'
import { MatrixEditor } from './MatrixEditor'
import { BipolarMatrixEditor } from './BipolarMatrixEditor'
import { MaxDiffEditor } from './MaxDiffEditor'
import { CardSortEditor } from './CardSortEditor'
import { ConstantSumEditor } from './ConstantSumEditor'
import { SliderEditor } from './SliderEditor'
import { NpsEditor } from './NpsEditor'
import { StarRatingEditor } from './StarRatingEditor'
import { RankingEditor } from './RankingEditor'
import { TextboxListEditor } from './TextboxListEditor'
import { SemanticDiffEditor } from './SemanticDiffEditor'
import { CascadeEditor } from './CascadeEditor'
import { ImageChoiceEditor } from './ImageChoiceEditor'

/**
 * Renders the type-specific editor for a survey question.
 * Central registry — add new question types here only.
 */
export function QuestionTypeEditor({
  question,
  dispatch,
  focusOptionId,
  availableQuestions,
  surveyDateFormat,
}) {
  const { questionType } = question

  if (isChoiceType(questionType)) {
    return (
      <ChoiceEditor
        question={question}
        dispatch={dispatch}
        focusOptionId={focusOptionId}
        availableQuestions={availableQuestions}
      />
    )
  }

  switch (questionType) {
    case 'open_text':
      return <OpenTextEditor question={question} dispatch={dispatch} />
    case 'date':
      return <DateEditor question={question} dispatch={dispatch} surveyDateFormat={surveyDateFormat} />
    case 'matrix':
      return <MatrixEditor question={question} dispatch={dispatch} />
    case 'bipolar_matrix':
      return <BipolarMatrixEditor question={question} dispatch={dispatch} />
    case 'maxdiff':
      return <MaxDiffEditor question={question} dispatch={dispatch} />
    case 'card_sort':
      return <CardSortEditor question={question} dispatch={dispatch} />
    case 'constant_sum':
      return <ConstantSumEditor question={question} dispatch={dispatch} />
    case 'slider':
      return <SliderEditor question={question} dispatch={dispatch} />
    case 'nps':
      return <NpsEditor question={question} dispatch={dispatch} />
    case 'star_rating':
      return <StarRatingEditor question={question} dispatch={dispatch} />
    case 'ranking':
      return <RankingEditor question={question} dispatch={dispatch} />
    case 'textbox_list':
      return <TextboxListEditor question={question} dispatch={dispatch} />
    case 'semantic_diff':
      return <SemanticDiffEditor question={question} dispatch={dispatch} />
    case 'cascade':
      return <CascadeEditor question={question} dispatch={dispatch} />
    case 'image_choice_single':
    case 'image_choice_multi':
      return <ImageChoiceEditor question={question} dispatch={dispatch} />
    default:
      return null
  }
}
