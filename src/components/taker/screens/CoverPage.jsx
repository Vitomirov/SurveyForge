export function CoverPage({ survey, onStart, isPublic = false }) {
  const logoJustify =
    survey?.logoPosition === 'right'  ? 'justify-end'   :
    survey?.logoPosition === 'center' ? 'justify-center' :
                                         'justify-start'

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-6">
      <div className="max-w-lg w-full">
        {survey?.coverImage && (
          <div className="mb-6 rounded-2xl overflow-hidden border border-ink-100 shadow-sm bg-white">
            <img
              src={survey.coverImage}
              alt=""
              className="w-full max-h-72 object-cover"
            />
          </div>
        )}

        {survey?.companyLogo && (
          <div className={`flex mb-5 ${logoJustify}`}>
            <img src={survey.companyLogo} alt="Logo" className="h-12 max-w-[180px] object-contain" />
          </div>
        )}

        <h1 className="text-2xl font-bold text-ink-800 mb-3 leading-snug text-center">
          {survey?.title || 'Untitled Survey'}
        </h1>

        {survey?.description && (
          <div
            className="rte-content text-ink-600 leading-relaxed mb-8"
            dangerouslySetInnerHTML={{ __html: survey.description }}
          />
        )}

        <div className="text-center">
          <button onClick={onStart} className="btn-primary px-8 py-3 text-base">
            {survey?.startButtonText || 'Start Survey'}
          </button>
          {!isPublic && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-6 inline-block">
              👁 Preview mode — this is the welcome page respondents see first
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
