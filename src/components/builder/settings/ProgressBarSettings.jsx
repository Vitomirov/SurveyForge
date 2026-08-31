import { Toggle } from '@/components/ui'

export function ProgressBarSettings({ survey, dispatch }) {
  const shown = survey.settings?.showProgressBar !== false

  return (
    <div className="mt-3 border-t border-ink-100 pt-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider">Progress bar</p>
          <p className="text-xs text-ink-400 mt-0.5">
            Shows page progress during the survey. Accounts for skip-to-page branching.
          </p>
        </div>
        <Toggle
          size="sm"
          checked={shown}
          onChange={val => dispatch({ type: 'SET_SURVEY_SETTING', key: 'showProgressBar', value: val })}
          label={shown ? 'Shown' : 'Hidden'}
        />
      </div>
    </div>
  )
}

export default ProgressBarSettings
