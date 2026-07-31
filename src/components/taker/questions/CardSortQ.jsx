import { useState } from 'react'
import {
  DndContext as SortDndContext, DragOverlay as SortDragOverlay,
  useDraggable, useDroppable,
  PointerSensor as SortPointerSensor,
  useSensor as useSortSensor, useSensors as useSortSensors,
} from '@dnd-kit/core'

function DraggableCard({ card, isDragging: external }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id })
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className={`px-3 py-2 bg-white border-2 rounded-xl text-sm text-ink-800 cursor-grab active:cursor-grabbing select-none transition-all shadow-sm ${
        isDragging ? 'opacity-40 border-brand-300' : 'border-ink-200 hover:border-brand-300 hover:shadow-md'
      }`}>
      {card.text}
    </div>
  )
}

function DroppableCategory({ id, label, color, cardIds, allCards, isUnsorted }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const cards = cardIds.map(cid => allCards.find(c => c.id === cid)).filter(Boolean)

  return (
    <div className="flex flex-col min-w-0">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2 px-1">
        {!isUnsorted && <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />}
        <span className={`text-sm font-semibold ${isUnsorted ? 'text-ink-500' : 'text-ink-700'}`}>{label}</span>
        <span className="text-xs text-ink-400 bg-ink-100 px-1.5 rounded-full ml-auto">{cards.length}</span>
      </div>

      {/* Drop zone */}
      <div ref={setNodeRef}
        className={`flex-1 min-h-[120px] rounded-xl border-2 border-dashed p-2 flex flex-col gap-2 transition-all ${
          isOver ? 'border-brand-400 bg-brand-50/40' : isUnsorted ? 'border-ink-200 bg-ink-50/40' : 'border-ink-200 bg-white'
        }`}
        style={!isUnsorted ? { borderColor: isOver ? undefined : color + '40' } : {}}>
        {cards.map(card => <DraggableCard key={card.id} card={card} />)}
        {cards.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-ink-300 italic">Drop here</p>
          </div>
        )}
      </div>
    </div>
  )
}

export function CardSortQ({ question, value = {}, onChange }) {
  const cfg  = question.cardSortConfig
  const cats = cfg.categories || []
  const cards = cfg.cards || []

  // Initialize assignment: all cards start unsorted
  const getAssignment = () => {
    if (value.assignment) return value.assignment
    return {
      uncategorized: cards.map(c => c.id),
      ...Object.fromEntries(cats.map(c => [c.id, []])),
    }
  }
  const assignment = getAssignment()

  const sensors = useSortSensors(useSortSensor(SortPointerSensor, { activationConstraint: { distance: 4 } }))
  const [dragId, setDragId] = useState(null)
  const dragCard = dragId ? cards.find(c => c.id === dragId) : null

  const findContainer = (cardId) =>
    Object.keys(assignment).find(key => assignment[key].includes(cardId))

  const handleDragEnd = ({ active, over }) => {
    setDragId(null)
    if (!over) return
    const src  = findContainer(active.id)
    // over.id could be a container or a card in a container
    const dest = Object.keys(assignment).includes(over.id)
      ? over.id
      : findContainer(over.id)
    if (!src || !dest || src === dest) return
    const next = {
      ...assignment,
      [src]:  assignment[src].filter(id => id !== active.id),
      [dest]: [...assignment[dest], active.id],
    }
    onChange({ ...value, assignment: next })
  }

  const allContainers = [
    { id: 'uncategorized', label: 'Unsorted', color: null, isUnsorted: true },
    ...cats.map(c => ({ id: c.id, label: c.label, color: c.color, isUnsorted: false })),
  ]

  return (
    <SortDndContext sensors={sensors} onDragStart={e => setDragId(e.active.id)} onDragEnd={handleDragEnd}>
      {cfg.instruction && <p className="text-sm text-ink-500 italic mb-3">{cfg.instruction}</p>}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(allContainers.length, 4)}, minmax(0, 1fr))` }}>
        {allContainers.map(col => (
          <DroppableCategory
            key={col.id}
            id={col.id}
            label={col.label}
            color={col.color}
            cardIds={assignment[col.id] || []}
            allCards={cards}
            isUnsorted={col.isUnsorted}
          />
        ))}
      </div>
      <SortDragOverlay>
        {dragCard && (
          <div className="px-3 py-2 bg-white border-2 border-brand-400 rounded-xl text-sm text-ink-800 shadow-lg rotate-2">
            {dragCard.text}
          </div>
        )}
      </SortDragOverlay>
      <p className="text-xs text-ink-400 mt-3 text-center">Drag cards into categories</p>
    </SortDndContext>
  )
}

export default CardSortQ
