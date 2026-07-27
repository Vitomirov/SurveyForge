import { buildPipedOptions } from '@/utils/piping'
import { SingleSelectQ } from './SingleSelectQ'
import { MultiSelectQ } from './MultiSelectQ'
import { DropdownQ } from './DropdownQ'
import { OpenTextQ } from './OpenTextQ'
import { DateQ } from './DateQ'
import { MatrixQ } from './MatrixQ'
import { BipolarMatrixQ } from './BipolarMatrixQ'
import { MaxDiffQ } from './MaxDiffQ'
import { CardSortQ } from './CardSortQ'
import { ConstantSumQ } from './ConstantSumQ'
import { SliderQ } from './SliderQ'
import { NpsQ } from './NpsQ'
import { StarRatingQ } from './StarRatingQ'
import { RankingQ } from './RankingQ'
import { TextboxListQ } from './TextboxListQ'
import { SemanticDiffQ } from './SemanticDiffQ'
import { CascadeQ } from './CascadeQ'
import { ImageChoiceQ } from './ImageChoiceQ'

/**
 * Renders the respondent-facing input for a survey question.
 * Central registry — add new question types here only.
 */
export function QuestionRenderer({ question, value, onChange, surveyDateFormat, companions, onCompanionChange, responses, items }) {
  // Resolve piped options for choice questions
  const opts = (question.pipedOptionsConfig?.enabled)
    ? buildPipedOptions(question, responses, items)
    : question.options

  switch (question.questionType) {
    case 'single_select':  return <SingleSelectQ  question={{ ...question, options: opts }} value={value} onChange={onChange} companions={companions} onCompanionChange={onCompanionChange} />
    case 'multi_select':   return <MultiSelectQ   question={{ ...question, options: opts }} value={value} onChange={onChange} companions={companions} onCompanionChange={onCompanionChange} />
    case 'dropdown':       return <DropdownQ      question={{ ...question, options: opts }} value={value} onChange={onChange} />
    case 'open_text':      return <OpenTextQ      question={question} value={value} onChange={onChange} />
    case 'date':           return <DateQ          question={question} value={value} onChange={onChange} surveyDateFormat={surveyDateFormat} />
    case 'matrix':         return <MatrixQ        question={question} value={value} onChange={onChange} />
    case 'bipolar_matrix': return <BipolarMatrixQ question={question} value={value} onChange={onChange} />
    case 'maxdiff':        return <MaxDiffQ       question={question} value={value} onChange={onChange} />
    case 'card_sort':      return <CardSortQ      question={question} value={value} onChange={onChange} />
    case 'constant_sum':   return <ConstantSumQ   question={question} value={value} onChange={onChange} />
    case 'slider':         return <SliderQ        question={question} value={value} onChange={onChange} />
    case 'nps':            return <NpsQ           question={question} value={value} onChange={onChange} />
    case 'star_rating':    return <StarRatingQ    question={question} value={value} onChange={onChange} />
    case 'ranking':        return <RankingQ       question={question} value={value} onChange={onChange} />
    case 'textbox_list':   return <TextboxListQ   question={question} value={value} onChange={onChange} />
    case 'semantic_diff':  return <SemanticDiffQ  question={question} value={value} onChange={onChange} />
    case 'cascade':            return <CascadeQ       question={question} value={value} onChange={onChange} />
    case 'image_choice_single':
    case 'image_choice_multi': return <ImageChoiceQ  question={question} value={value} onChange={onChange} />
    default: return <p className="text-sm text-ink-400 italic">Unknown question type.</p>
  }
}
