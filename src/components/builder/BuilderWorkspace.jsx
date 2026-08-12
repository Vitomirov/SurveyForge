import { BuilderQuickAddDock } from '@/components/builder/panels'
import { SurveyHeaderCard } from '@/components/builder/SurveyHeaderCard'
import { SurveyItemList } from '@/components/builder/SurveyItemList'
import { BuilderSidebar } from '@/components/builder/BuilderSidebar'

export function BuilderWorkspace({
  state,
  dispatch,
  sensors,
  sortableItemIds,
  itemMeta,
  availableQuestionsByIndex,
  groupQuestionCounts,
  allPagesLockEnabled,
  draggedItem,
  hasItems,
  addActions,
  onActivateItem,
  onDragStart,
  onDragEnd,
  onOpenMore,
}) {
  return (
    <div className="flex-1 min-h-0 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-6 lg:py-0 flex flex-col lg:flex-row gap-4 lg:gap-6 lg:overflow-hidden">
      <main className="flex-1 min-w-0 lg:flex lg:flex-col lg:min-h-0">
        <div className="lg:flex-1 lg:overflow-y-auto lg:min-h-0 lg:py-6 lg:pr-0.5">
          <SurveyHeaderCard survey={state.survey} dispatch={dispatch} />
          <SurveyItemList
            state={state}
            dispatch={dispatch}
            sensors={sensors}
            sortableItemIds={sortableItemIds}
            itemMeta={itemMeta}
            availableQuestionsByIndex={availableQuestionsByIndex}
            groupQuestionCounts={groupQuestionCounts}
            allPagesLockEnabled={allPagesLockEnabled}
            draggedItem={draggedItem}
            onActivateItem={onActivateItem}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
          {hasItems && <div className="h-20 lg:hidden" aria-hidden="true" />}
        </div>

        {hasItems && (
          <div className="hidden lg:block shrink-0 pt-3 pb-4 bg-surface border-t border-ink-200/80">
            <BuilderQuickAddDock dispatch={dispatch} onOpenMore={onOpenMore} />
          </div>
        )}
      </main>

      <BuilderSidebar items={state.items} addActions={addActions} />
    </div>
  )
}
