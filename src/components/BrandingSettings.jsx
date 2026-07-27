import { useRef } from 'react'
import { Image as ImageIcon, X, Upload } from 'lucide-react'

const MAX_LOGO_BYTES = 2 * 1024 * 1024 // 2MB — logos are small, no need for more

const POSITIONS = [
  { v: 'left',   label: 'Left' },
  { v: 'center', label: 'Center' },
  { v: 'right',  label: 'Right' },
]

export function BrandingSettings({ survey, dispatch }) {
  const fileInputRef = useRef(null)

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    if (file.size > MAX_LOGO_BYTES) {
      alert('Logo image is too large. Please use an image under 2MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      dispatch({ type: 'SET_SURVEY_FIELD', field: 'companyLogo', value: reader.result })
    }
    reader.readAsDataURL(file)
  }

  const onInputChange = (e) => handleFile(e.target.files?.[0])

  const onDrop = (e) => {
    e.preventDefault()
    handleFile(e.dataTransfer.files?.[0])
  }

  const removeLogo = () =>
    dispatch({ type: 'SET_SURVEY_FIELD', field: 'companyLogo', value: null })

  const position = survey.logoPosition || 'left'

  return (
    <div className="mt-3 border-t border-ink-100 pt-3">
      <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <ImageIcon size={12} /> Branding — company logo
      </p>

      <div className="flex items-start gap-3">
        {/* Logo preview / upload box */}
        {survey.companyLogo ? (
          <div className="relative group w-20 h-20 shrink-0 rounded-xl border border-ink-200 bg-white flex items-center justify-center overflow-hidden">
            <img
              src={survey.companyLogo}
              alt="Logo"
              className="max-w-full max-h-full object-contain p-1.5"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Replace logo"
                className="p-1.5 bg-white rounded-lg text-ink-700 hover:bg-ink-50 transition-all"
              >
                <Upload size={12} />
              </button>
              <button
                onClick={removeLogo}
                title="Remove logo"
                className="p-1.5 bg-white rounded-lg text-rose-600 hover:bg-rose-50 transition-all"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={onDrop}
            onDragOver={e => e.preventDefault()}
            className="w-20 h-20 shrink-0 flex flex-col items-center justify-center gap-1 border-2 border-dashed border-ink-200 hover:border-brand-300 hover:bg-brand-50/30 rounded-xl cursor-pointer transition-all"
          >
            <Upload size={15} className="text-ink-300" />
            <p className="text-xs text-ink-400">Logo</p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onInputChange}
          className="hidden"
        />

        {/* Position + helper text */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-ink-500 mb-1.5">Position on welcome page</p>
          <div className="flex gap-1.5">
            {POSITIONS.map(p => (
              <button
                key={p.v}
                onClick={() => dispatch({ type: 'SET_SURVEY_FIELD', field: 'logoPosition', value: p.v })}
                className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-all ${
                  position === p.v
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-ink-500 border-ink-200 hover:border-brand-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-ink-400 mt-2 leading-relaxed">
            Shown above the title on the welcome page, and in the top bar on every page throughout the survey. A logo with a transparent background (PNG) works best.
          </p>
        </div>
      </div>
    </div>
  )
}
