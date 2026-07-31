/** Dynamic import loaders for question-type editors — one chunk per type. */
export const EDITOR_LOADERS = {
  open_text:           () => import('./OpenTextEditor.jsx'),
  date:                () => import('./DateEditor.jsx'),
  matrix:              () => import('./MatrixEditor.jsx'),
  bipolar_matrix:      () => import('./BipolarMatrixEditor.jsx'),
  maxdiff:             () => import('./MaxDiffEditor.jsx'),
  card_sort:           () => import('./CardSortEditor.jsx'),
  constant_sum:        () => import('./ConstantSumEditor.jsx'),
  slider:              () => import('./SliderEditor.jsx'),
  nps:                 () => import('./NpsEditor.jsx'),
  star_rating:         () => import('./StarRatingEditor.jsx'),
  ranking:             () => import('./RankingEditor.jsx'),
  textbox_list:        () => import('./TextboxListEditor.jsx'),
  semantic_diff:       () => import('./SemanticDiffEditor.jsx'),
  cascade:             () => import('./CascadeEditor.jsx'),
  image_choice_single: () => import('./ImageChoiceEditor.jsx'),
  image_choice_multi:  () => import('./ImageChoiceEditor.jsx'),
}

/** Choice types (single/multi/dropdown) share one editor chunk. */
export const loadChoiceEditor = () => import('./ChoiceEditor.jsx')
