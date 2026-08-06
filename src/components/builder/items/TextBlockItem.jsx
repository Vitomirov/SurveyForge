import { useRef, useState, memo } from 'react'
import { GripVertical, Trash2, ChevronDown, ChevronRight, Image as ImageIcon, X, Upload, FileText } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { RichTextEditor, VisibilityEditor } from '@/components/shared'
import { visibilitySummary } from '@/utils/visibilityEngine'

const MAX_IMAGE_BYTES = 4 * 1024 * 1024

export const TextBlockItem = memo(function TextBlockItem({
  item, dispatch, isActive, onActivateItem, availableQuestions = [], contextItems = [],
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
  const fileRef = useRef(null)

  const update = (patch) => dispatch({ type: 'UPDATE_ITEM', id: item.id, patch })

  const handleImage = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    if (file.size > MAX_IMAGE_BYTES) { alert('Image must be under 4MB.'); return }
    const reader = new FileReader()
    reader.onload = () => update({ image: reader.result })
    reader.readAsDataURL(file)
  }

  const visEnabled = item.visibility?.enabled
  const visSummary = visEnabled ? visibilitySummary(item.visibility, availableQuestions) : null

  // Preview of content for collapsed state
  const plainPreview = item.content
    ? item.content.replace(/<[^>]*>/g, '').slice(0, 60) + (item.content.length > 60 ? '…' : '')
    : null

  return (
    <div ref={setNodeRef} style={style}>
      <div className={`rounded-2xl border-2 transition-all ${
        isActive ? 'border-emerald-400 shadow-sm' : 'border-emerald-100 hover:border-emerald-200'
      } bg-white`}>

        {/* Header row */}
        <div className="flex items-center gap-2 px-3 py-2.5">
          <div {...attributes} {...listeners} className="drag-handle text-ink-200 hover:text-ink-400 cursor-grab">
            <GripVertical size={15} />
          </div>

          <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
            <FileText size={12} className="text-emerald-600" />
          </div>

          {/* Title input */}
          <input
            type="text"
            value={item.title || ''}
            onChange={e => update({ title: e.target.value })}
            placeholder="Text / Media block (optional title)"
            className="flex-1 text-sm font-medium text-ink-700 bg-transparent border-none outline-none placeholder:text-ink-300"
            onClick={e => e.stopPropagation()}
          />

          {visEnabled && (
            <span className="text-xs font-semibold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full shrink-0">
              Conditional
            </span>
          )}

          <button
            onClick={() => onActivateItem(item.id)}
            className="p-1 text-ink-300 hover:text-ink-600 transition-colors"
          >
            {isActive ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </button>

          <button
            onClick={() => dispatch({ type: 'DELETE_ITEM', id: item.id })}
            className="p-1.5 text-ink-200 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
          >
            <Trash2 size={13} />
          </button>
        </div>

        {/* Collapsed preview */}
        {!isActive && (plainPreview || item.image) && (
          <div className="px-4 pb-2.5 flex items-center gap-3">
            {item.image && (
              <img src={item.image} alt="" className="h-8 w-12 object-cover rounded border border-ink-100" />
            )}
            {plainPreview && (
              <p className="text-xs text-ink-400 truncate">{plainPreview}</p>
            )}
          </div>
        )}

        {/* Expanded editor */}
        {isActive && (
          <div className="px-4 pb-4 space-y-4 border-t border-ink-100 pt-3">

            {/* Rich text content */}
            <div>
              <label className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-2 block">Content</label>
              <RichTextEditor
                value={item.content || ''}
                onChange={html => update({ content: html })}
                placeholder="Type instructions, explanations, or context for respondents…"
              />
            </div>

            {/* Image upload */}
            <div>
              <label className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-2 block">Image (optional)</label>
              {item.image ? (
                <div className="relative group rounded-xl overflow-hidden border border-ink-200">
                  <img src={item.image} alt="" className="w-full max-h-48 object-contain bg-ink-50" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="text-xs font-medium bg-white text-ink-700 px-3 py-1.5 rounded-lg hover:bg-ink-50"
                    >
                      Replace
                    </button>
                    <button
                      onClick={() => update({ image: null, imageCaption: '' })}
                      className="text-xs font-medium bg-white text-rose-600 px-3 py-1.5 rounded-lg hover:bg-rose-50 flex items-center gap-1"
                    >
                      <X size={11} /> Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileRef.current?.click()}
                  onDrop={e => { e.preventDefault(); handleImage(e.dataTransfer.files?.[0]) }}
                  onDragOver={e => e.preventDefault()}
                  className="flex flex-col items-center justify-center gap-1.5 py-5 border-2 border-dashed border-ink-200 hover:border-emerald-300 hover:bg-emerald-50/20 rounded-xl cursor-pointer transition-all"
                >
                  <Upload size={16} className="text-ink-300" />
                  <p className="text-xs text-ink-500 font-medium">Click or drag image here</p>
                  <p className="text-xs text-ink-300">PNG, JPG up to 4MB</p>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={e => handleImage(e.target.files?.[0])} />
              {item.image && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={item.imageCaption || ''}
                    onChange={e => update({ imageCaption: e.target.value })}
                    placeholder="Image caption (optional)"
                    className="input-base text-sm"
                  />
                </div>
              )}
            </div>

            {/* Visibility logic */}
            <div className="border-t border-ink-100 pt-3">
              {visSummary && <p className="text-xs text-violet-800 italic mb-1.5">{visSummary}</p>}
              <VisibilityEditor
                itemId={item.id}
                vis={item.visibility}
                availableQuestions={availableQuestions}
                contextItems={contextItems}
                dispatch={dispatch}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
})
