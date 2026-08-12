import {
  DndContext, closestCenter, DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy,
} from '@dnd-kit/sortable'

import { EmptyState } from '@/components/builder/panels'
import {
  SurveyItemRow, PageOneLockBarRow, getDragOverlayLabel,
} from '@/components/builder/SurveyItemRow'

export function SurveyItemList({
  state,
  dispatch,
  sensors,
  sortableItemIds,
  itemMeta,
  availableQuestionsByIndex,
  groupQuestionCounts,
  allPagesLockEnabled,
  draggedItem,
  onActivateItem,
  onDragStart,
  onDragEnd,
}) {
  if (state.items.length === 0) {
    return <EmptyState onAdd={type => dispatch({ type: 'ADD_QUESTION', qtype: type })} />
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={sortableItemIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {!allPagesLockEnabled && (
            <PageOneLockBarRow
              survey={state.survey}
              dispatch={dispatch}
              activeItemId={state.activeItemId}
              onActivateItem={onActivateItem}
            />
          )}
          {state.items.map((item, idx) => (
            <SurveyItemRow
              key={item.id}
              item={item}
              idx={idx}
              meta={itemMeta[idx]}
              state={state}
              dispatch={dispatch}
              availableQuestions={availableQuestionsByIndex[idx]}
              groupQuestionCounts={groupQuestionCounts}
              allPagesLockEnabled={allPagesLockEnabled}
              onActivateItem={onActivateItem}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {draggedItem && (
          <div className="card drag-overlay px-4 py-3 flex items-center gap-3">
            <span className="text-sm font-medium text-ink-600 truncate">
              {getDragOverlayLabel(draggedItem)}
            </span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
