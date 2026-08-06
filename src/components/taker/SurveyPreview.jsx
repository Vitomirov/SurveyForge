import { useState, useMemo, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, Check, Fingerprint } from 'lucide-react'
import { buildVisiblePages } from '@/utils/visibilityEngine'
import { resolvePipingTokens } from '@/utils/piping'
import { generateCSV, downloadCSV } from '@/utils/csvExport'
import { saveResponse, newResponseId } from '@/utils/responseStore'
import { useApi } from '@/config/api'
import { saveResponseApi, savePublicResponse } from '@/api/responses'
import { collectFingerprint } from '@/utils/deviceSignals'
import { DEFAULT_DATE_FORMAT } from '@/constants/surveyDefaults'
import { isOnDNCListAsync, loadDNCListAsync } from '@/utils/dncStore'
import { checkTermination, evalBlock, buildBlockCause } from '@/utils/terminationEngine'
import { resolveBranchTargetPage } from '@/utils/branchEngine'
import {
  resolveExternalRedirectUrl,
  resolvePageExternalRedirect,
  redirectsOnAnswerChange,
} from '@/utils/externalRedirectEngine'
import { validateAnswer } from '@/utils/answerValidation'
import { buildQuestionNumberById } from '@/utils/questionHelpers'
import { prefetchModule, prefetchCommonQuestions } from '@/utils/routePrefetch'
import { QUESTION_LOADERS } from './questions/questionLoaders'
import { QuestionRenderer } from './questions'
import { CoverPage, CompletionScreen, TerminationScreen, ClosedSurveyScreen } from './screens'

export function SurveyPreview({ survey, items, onClose, isPublic = false }) {
  const [responses, setResponses]       = useState({})
  const [companions, setCompanions]     = useState({})  // { questionId: { optionId: text } }
  const [errors, setErrors]             = useState({})
  const [currentPage, setCurrentPage]   = useState(0)
  const [submitted, setSubmitted]       = useState(false)
  const [terminated, setTerminated]     = useState(false)
  const [terminatedBy, setTerminatedBy] = useState(null)
  const [showCover, setShowCover]       = useState(survey?.showCoverPage !== false)
  const [fingerprint, setFingerprint]   = useState(null)
  const [fpStatus, setFpStatus]         = useState('idle') // 'idle' | 'collecting' | 'done'

  // ── Collect device/browser fingerprint once, on mount ──────────────────
  // Runs in the background regardless of cover page state, so by the time
  // the respondent reaches the end the data is already ready to attach.
  const fpEnabled = survey?.settings?.fingerprinting?.enabled
  const fpSignals = survey?.settings?.fingerprinting?.signals
  useEffect(() => {
    if (!fpEnabled) return
    let cancelled = false
    setFpStatus('collecting')
    collectFingerprint(fpSignals).then(fp => {
      if (!cancelled) { setFingerprint(fp); setFpStatus('done') }
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fpEnabled])

  useEffect(() => {
    if (!survey?.id || !useApi) return
    loadDNCListAsync(survey.id, { publicMode: isPublic })
      .catch(err => console.error('Failed to load DNC list', err))
  }, [survey?.id, isPublic])

  useEffect(() => {
    prefetchCommonQuestions()
    const types = new Set(
      (items || []).filter(i => i.itemType === 'question').map(i => i.questionType)
    )
    for (const type of types) {
      const loader = QUESTION_LOADERS[type]
      if (loader) prefetchModule(loader)
    }
  }, [items])

  // Build pages + capture termination blocks, fully respecting conditional
  // show/hide logic on questions, page breaks, and groups. Must recompute
  // whenever `responses` changes, since visibility can depend on earlier answers.
  const { pages, blocksByPage } = useMemo(
    () => buildVisiblePages(items, responses),
    [items, responses]
  )

  const questionNumberById = useMemo(
    () => buildQuestionNumberById(items),
    [items]
  )

  const currentItems     = pages[currentPage] || []
  const currentQuestions = currentItems.filter(i => i.itemType === 'question')
  const totalPages       = pages.length

  const currentPageBreakTitle = useMemo(() => {
    if (currentPage <= 0) return null
    let breakIndex = 0
    for (const item of items) {
      if (item.itemType !== 'page_break') continue
      if (breakIndex === currentPage - 1) return item.title || null
      breakIndex++
    }
    return null
  }, [items, currentPage])

  // Resolve piped text once per visible page item when responses change
  const pipedDisplayByItemId = useMemo(() => {
    const map = {}
    for (const item of currentItems) {
      if (item.itemType === 'text_block') {
        map[item.id] = {
          title: item.title ? resolvePipingTokens(item.title, responses, items) : '',
          content: item.content ? resolvePipingTokens(item.content, responses, items) : '',
        }
      } else if (item.itemType === 'question') {
        map[item.id] = {
          text: resolvePipingTokens(item.text, responses, items),
        }
      }
    }
    return map
  }, [currentItems, responses, items])

  const reset = () => {
    setResponses({}); setCompanions({}); setErrors({}); setCurrentPage(0)
    setSubmitted(false); setTerminated(false); setTerminatedBy(null)
    setShowCover(survey?.showCoverPage !== false)
    if (fpEnabled) {
      setFpStatus('collecting')
      collectFingerprint(fpSignals).then(fp => { setFingerprint(fp); setFpStatus('done') })
    }
  }

  const handleCompanionChange = (questionId, optionId, text) => {
    setCompanions(c => ({
      ...c,
      [questionId]: { ...(c[questionId] || {}), [optionId]: text },
    }))
  }

  // ── Build a response entry from current state ─────────────────────────
  const buildEntry = (status, terminatedByArg = null) => ({
    id:          newResponseId(),
    timestamp:   new Date().toISOString(),
    status,
    pageReached: currentPage,
    responses,
    companions,
    terminatedBy: terminatedByArg,
    fingerprint: fpEnabled ? (fingerprint || {}) : null,
  })

  // ── Auto-save to localStorage + optionally download CSV ───────────────
  const persistAndDownload = async (status, terminatedByArg = null, doDownload = false) => {
    // ── DNC check — only for completed responses ──────────────────────────
    let finalStatus = status
    if (status === 'complete' && survey?.id) {
      const emailQ = items.find(i => i.itemType === 'question' && i.isEmailField)
      if (emailQ) {
        const emailAnswer = responses[emailQ.id] || ''
        if (await isOnDNCListAsync(survey.id, emailAnswer, { publicMode: isPublic })) {
          finalStatus = 'dnc'
        }
      }
    }
    const entry = buildEntry(finalStatus, terminatedByArg)
    if (survey?.id) {
      if (useApi) {
        const save = isPublic ? savePublicResponse : saveResponseApi
        save(survey.id, entry).catch(err => console.error('Failed to save response', err))
      } else {
        saveResponse(survey.id, entry)
      }
    }
    if (doDownload) {
      const csv = generateCSV(items, [entry], survey)
      downloadCSV(csv, `${(survey?.title || 'survey').replace(/\s+/g, '_')}_${finalStatus}.csv`)
    }
    return finalStatus
  }

  const performExternalRedirect = (url, responseSnapshot) => {
    const entry = {
      ...buildEntry('partial'),
      responses: responseSnapshot,
      redirectedTo: url,
    }
    if (survey?.id) {
      if (useApi) {
        const save = isPublic ? savePublicResponse : saveResponseApi
        save(survey.id, entry).catch(err => console.error('Failed to save response before redirect', err))
      } else {
        saveResponse(survey.id, entry)
      }
    }
    window.location.assign(url)
  }

  const handleChange = (question, val) => {
    const nextResponses = { ...responses, [question.id]: val }
    setResponses(nextResponses)
    if (errors[question.id]) setErrors(e => ({ ...e, [question.id]: null }))

    if (redirectsOnAnswerChange(question)) {
      const url = resolveExternalRedirectUrl(question, val, nextResponses, items)
      if (url) performExternalRedirect(url, nextResponses)
    }
  }

  const validatePage = () => {
    const pageErrors = {}
    for (const q of currentQuestions) {
      const err = validateAnswer(q, responses[q.id])
      if (err) pageErrors[q.id] = err
    }
    setErrors(pageErrors)
    return Object.keys(pageErrors).length === 0
  }

  // All termination checked on Next: per-question rules + termination blocks
  const checkPageTermination = () => {
    // 1. Per-question termination rules
    for (const q of currentQuestions) {
      const result = checkTermination(q, responses[q.id], responses, items)
      if (result.terminated) {
        const tb = { questionText: q.text, cause: result.cause, blockTitle: null }
        setTerminated(true)
        setTerminatedBy(tb)
        persistAndDownload('terminated', tb)
        return true
      }
    }
    // 2. Termination blocks assigned to this page
    const blocks = blocksByPage[currentPage] || []
    for (const block of blocks) {
      if (block.conditions?.length && evalBlock(block, responses, items)) {
        const cause = buildBlockCause(block, responses, items)
        const tb    = { questionText: null, cause, blockTitle: block.title || 'Termination Block' }
        setTerminated(true)
        setTerminatedBy(tb)
        persistAndDownload('terminated', tb)
        return true
      }
    }
    return false
  }

  const handleNext = () => {
    if (!validatePage()) return
    if (checkPageTermination()) return

    const redirectUrl = resolvePageExternalRedirect(currentQuestions, responses, items)
    if (redirectUrl) {
      performExternalRedirect(redirectUrl, responses)
      return
    }

    if (currentPage < totalPages - 1) {
      const branchTarget = resolveBranchTargetPage(currentQuestions, responses, items, pages, currentPage)
      setCurrentPage(branchTarget ?? currentPage + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      setSubmitted(true)
      persistAndDownload('complete')
    }
  }

  const progress = totalPages > 1 ? Math.round((currentPage / totalPages) * 100) : 0

  return (
    <div className="min-h-screen bg-ink-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-ink-200 sticky top-0 z-30 safe-top">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 min-h-14 py-2 sm:py-0 flex items-center gap-2 sm:gap-3">
          {survey?.companyLogo && (
            <img src={survey.companyLogo} alt="Logo" className="h-6 sm:h-7 w-auto max-w-[100px] sm:max-w-[120px] object-contain shrink-0" />
          )}
          <h1 className="text-sm font-semibold text-ink-800 flex-1 truncate min-w-0">{survey?.title || 'Survey'}</h1>
          {fpEnabled && (
            <span
              title={fpStatus === 'done' ? 'Fingerprint data collected for this session' : 'Collecting fingerprint…'}
              className={`text-xs font-semibold px-2 sm:px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1 ${
                fpStatus === 'done'
                  ? 'text-violet-600 bg-violet-50 border border-violet-200'
                  : 'text-ink-400 bg-ink-50 border border-ink-200'
              }`}
            >
              <Fingerprint size={11} /> <span className="hidden sm:inline">{fpStatus === 'done' ? 'FP captured' : 'FP collecting…'}</span>
            </span>
          )}
          {!isPublic && (
            <>
              <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 sm:px-2.5 py-1 rounded-full shrink-0 hidden sm:inline-flex">
                👁 Preview Mode
              </span>
              <button onClick={onClose} className="flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800 font-medium px-2 sm:px-3 py-1.5 hover:bg-ink-50 rounded-lg transition-all shrink-0">
                <X size={15} /> <span className="hidden sm:inline">Exit Preview</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Progress bar */}
      {totalPages > 1 && !terminated && !submitted && !showCover && (
        <div className="bg-white border-b border-ink-100 px-4 sm:px-6 py-2">
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-between text-xs text-ink-400 mb-1.5">
              <span>Page {currentPage + 1} of {totalPages}</span>
              <span>{progress}% complete</span>
            </div>
            <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
              <div className="h-full bg-brand-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {isPublic && survey?.status === 'closed' ? (
        <ClosedSurveyScreen settings={survey?.settings} />
      ) : showCover ? (
        <CoverPage survey={survey} onStart={() => setShowCover(false)} isPublic={isPublic} />
      ) : terminated ? (
        <TerminationScreen settings={survey?.settings} terminatedBy={terminatedBy} onReset={reset} onDownload={() => persistAndDownload('terminated', terminatedBy, true)} isPublic={isPublic} />
      ) : submitted ? (
        <CompletionScreen onReset={reset} onDownload={() => persistAndDownload('complete', null, true)} isPublic={isPublic} />
      ) : (
        <>
          <div className="flex-1 py-6 sm:py-8 px-4 sm:px-6">
            <div className="max-w-2xl mx-auto space-y-4 sm:space-y-5">
              {currentPageBreakTitle && (
                <div className="text-center mb-2">
                  <h2 className="text-lg font-semibold text-ink-700">{currentPageBreakTitle}</h2>
                </div>
              )}

              {currentItems.map(item => {
                // ── Text / Media block ──────────────────────────────────
                if (item.itemType === 'text_block') {
                  const piped = pipedDisplayByItemId[item.id] || {}
                  return (
                    <div key={item.id} className="bg-white rounded-2xl border border-emerald-100 p-4 sm:p-6">
                      {item.title && (
                        <p className="text-base font-semibold text-ink-800 mb-3">{piped.title}</p>
                      )}
                      {item.image && (
                        <div className="mb-3">
                          <img src={item.image} alt={item.imageCaption || ''} className="w-full max-h-72 object-contain rounded-xl border border-ink-100 bg-ink-50" />
                          {item.imageCaption && (
                            <p className="text-xs text-ink-400 text-center mt-1.5 italic">{item.imageCaption}</p>
                          )}
                        </div>
                      )}
                      {item.content && (
                        <div className="rte-content text-ink-700 text-sm leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: piped.content }} />
                      )}
                      {!item.title && !item.image && !item.content && (
                        <p className="text-ink-300 italic text-sm">Empty text block</p>
                      )}
                    </div>
                  )
                }

                // ── Question ────────────────────────────────────────────
                const q     = item
                const qNum  = questionNumberById[q.id] ?? 0
                const piped = pipedDisplayByItemId[q.id]
                const error = errors[q.id]
                return (
                  <div key={q.id} className={`bg-white rounded-2xl border-2 p-4 sm:p-6 transition-all duration-200 ${error ? 'border-rose-300 shadow-sm shadow-rose-100' : 'border-ink-100 hover:border-ink-200'}`}>
                    <div className="mb-3 sm:mb-4 flex items-start gap-2 sm:gap-3">
                      <span className="inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-brand-50 text-brand-600 text-xs sm:text-sm font-bold shrink-0 mt-0.5">
                        {qNum}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm sm:text-base font-semibold text-ink-800 leading-snug">
                          {piped?.text || <span className="text-ink-300 italic">Untitled question</span>}
                          {q.required && <span className="text-rose-500 ml-1">*</span>}
                        </p>
                      </div>
                    </div>
                    <div className="sm:ml-10">
                      <QuestionRenderer
                        question={q}
                        value={responses[q.id]}
                        onChange={val => handleChange(q, val)}
                        surveyDateFormat={survey?.defaultDateFormat || DEFAULT_DATE_FORMAT}
                        companions={companions[q.id] || {}}
                        onCompanionChange={(optId, text) => handleCompanionChange(q.id, optId, text)}
                        responses={responses}
                        items={items}
                      />
                      {error && (
                        <p className="mt-2 text-sm text-rose-600 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0 text-xs font-bold">!</span>
                          {error}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Navigation */}
          <div className="bg-white border-t border-ink-100 px-4 sm:px-6 py-3 sm:py-4 sticky bottom-0 safe-bottom">
            <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
              <button onClick={() => { setCurrentPage(p => Math.max(0, p-1)); window.scrollTo({top:0,behavior:'smooth'}) }} disabled={currentPage === 0} className="flex items-center gap-1 sm:gap-2 text-sm font-medium text-ink-500 hover:text-ink-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0">
                <ChevronLeft size={16} /> Back
              </button>
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <button
                  onClick={() => persistAndDownload('partial')}
                  title="Save this partial response to the export store"
                  className="hidden sm:inline-flex text-xs font-medium text-ink-400 hover:text-ink-600 px-3 py-1.5 border border-ink-200 hover:border-ink-300 rounded-lg transition-all"
                >
                  Save partial
                </button>
                <button onClick={handleNext} className="btn-primary px-4 sm:px-8 shrink-0">
                  {currentPage === totalPages - 1 ? <><Check size={15} /> <span className="hidden sm:inline">Submit</span></> : <>Next <ChevronRight size={15} /></>}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default SurveyPreview
