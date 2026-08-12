import { lazy, Suspense } from 'react'
import { PageLoader } from '@/components/ui'
import { useSurveyBuilder } from '@/components/builder/hooks/useSurveyBuilder'
import { BuilderHeader } from '@/components/builder/BuilderHeader'
import { BuilderWorkspace } from '@/components/builder/BuilderWorkspace'
import { BuilderMobileChrome } from '@/components/builder/BuilderMobileChrome'
import { BuilderModals } from '@/components/builder/BuilderModals'

const SurveyPreview = lazy(() => import('@/components/taker/SurveyPreview.jsx'))

export function SurveyBuilder({ initialState, initialRevision = null, onBackToDashboard }) {
  const builder = useSurveyBuilder({ initialState, initialRevision })

  if (builder.state.showPreview) {
    return (
      <Suspense fallback={<PageLoader label="Loading preview…" />}>
        <SurveyPreview
          survey={builder.state.survey}
          items={builder.state.items}
          onClose={builder.closePreview}
          branding={builder.previewBranding}
        />
      </Suspense>
    )
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col lg:h-screen lg:overflow-hidden">
      <BuilderHeader
        survey={builder.state.survey}
        dispatch={builder.dispatch}
        saveStatus={builder.saveStatus}
        isDirty={builder.state.isDirty}
        onBackToDashboard={onBackToDashboard}
        showMobileMenu={builder.showMobileMenu}
        setShowMobileMenu={builder.setShowMobileMenu}
        onExportCSVTemplate={builder.handleExportCSVTemplate}
        onOpenExport={() => builder.setShowExport(true)}
        onOpenTest={() => builder.setShowTest(true)}
        onOpenPreview={builder.openPreview}
        onSave={builder.handleSave}
      />

      <BuilderWorkspace
        state={builder.state}
        dispatch={builder.dispatch}
        sensors={builder.sensors}
        sortableItemIds={builder.sortableItemIds}
        itemMeta={builder.itemMeta}
        availableQuestionsByIndex={builder.availableQuestionsByIndex}
        groupQuestionCounts={builder.groupQuestionCounts}
        allPagesLockEnabled={builder.allPagesLockEnabled}
        draggedItem={builder.draggedItem}
        hasItems={builder.hasItems}
        addActions={builder.addActions}
        onActivateItem={builder.handleActivateItem}
        onDragStart={builder.handleDragStart}
        onDragEnd={builder.handleDragEnd}
        onOpenMore={() => builder.setShowMobilePanel(true)}
      />

      <BuilderMobileChrome
        hasItems={builder.hasItems}
        items={builder.state.items}
        dispatch={builder.dispatch}
        showMobilePanel={builder.showMobilePanel}
        setShowMobilePanel={builder.setShowMobilePanel}
        addActions={builder.addActions}
      />

      <BuilderModals
        showTest={builder.showTest}
        showExport={builder.showExport}
        survey={builder.state.survey}
        items={builder.state.items}
        onCloseTest={() => builder.setShowTest(false)}
        onCloseExport={() => builder.setShowExport(false)}
      />
    </div>
  )
}

export default SurveyBuilder
