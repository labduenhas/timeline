import React, { useEffect, useRef, useState } from 'react'
import { Hand } from 'lucide-react'
import type { DocumentItem, TimelineIndexItem } from '@/types'
import { DocumentCard } from './DocumentCard'
import { indexForYear } from '@/hooks/useTimeline'
import { Skeleton } from '@/components/ui/Skeleton'

export const DEFAULT_CARD_STEP = 442
const OVERSCAN = 4

interface TimelineTrackProps {
  index: TimelineIndexItem[]
  cards: Record<string, DocumentItem>
  onQuickViewDoc: (doc: DocumentItem) => void
  containerRef: React.RefObject<HTMLDivElement>
  onActiveIndexChange?: (index: number) => void
  onVisibleRange?: (start: number, end: number) => void
}

export function cardStep(track: HTMLElement | null) {
  const card = track?.querySelector<HTMLElement>('.timeline-card')
  return card ? card.getBoundingClientRect().width + 32 : DEFAULT_CARD_STEP
}

export function scrollTimelineBy(track: HTMLElement | null, direction: number) {
  if (!track) return
  track.scrollBy({ left: direction * cardStep(track), behavior: 'smooth' })
}

export function scrollTimelineToIndex(
  track: HTMLElement | null,
  index: number,
  behavior: ScrollBehavior = 'smooth'
) {
  if (!track) return
  const step = cardStep(track)
  track.scrollTo({ left: Math.max(0, index) * step, behavior })
}

export function scrollTimelineToYear(
  track: HTMLElement | null,
  year: number,
  dates: TimelineIndexItem[],
  behavior: ScrollBehavior = 'smooth'
) {
  if (!track || dates.length === 0) return
  scrollTimelineToIndex(track, indexForYear(dates, year), behavior)
}

export function scrollTimelineToRange(
  track: HTMLElement | null,
  yearStart: number,
  yearEnd: number,
  dates: TimelineIndexItem[]
) {
  if (!track || dates.length === 0) return
  const match = dates.findIndex((item) => {
    const year = Number(item.doc_date.slice(0, 4))
    return year >= yearStart && year <= yearEnd
  })
  const fallback = dates.findIndex((item) => Number(item.doc_date.slice(0, 4)) >= yearStart)
  const i = match >= 0 ? match : fallback
  if (i < 0) return
  scrollTimelineToIndex(track, i, 'smooth')
}

const DRAG_THRESHOLD = 6

export function TimelineTrack({
  index,
  cards,
  onQuickViewDoc,
  containerRef,
  onActiveIndexChange,
  onVisibleRange,
}: TimelineTrackProps) {
  const draggedRef = useRef(false)
  const [step, setStep] = useState(DEFAULT_CARD_STEP)
  const [trackHeight, setTrackHeight] = useState(900)
  const [range, setRange] = useState({ start: 0, end: 12 })
  const total = index.length

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (document.querySelector('[data-inspector]')) return
      if (e.key === 'ArrowRight') scrollTimelineBy(containerRef.current, 1)
      if (e.key === 'ArrowLeft') scrollTimelineBy(containerRef.current, -1)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [containerRef])

  useEffect(() => {
    const track = containerRef.current
    if (!track) return

    let pointerId: number | null = null
    let startX = 0
    let startScroll = 0
    let dragging = false

    const measure = () => {
      const next = cardStep(track)
      if (next > 80) setStep(next)
      const card = track.querySelector<HTMLElement>('.timeline-card')
      if (!card) return
      const height = Math.ceil(card.getBoundingClientRect().height)
      if (height > 200) setTrackHeight(height + 40)
    }

    const updateVisible = () => {
      const width = cardStep(track)
      if (width > 80) setStep(width)
      const count = Math.max(1, Math.ceil(track.clientWidth / width) + OVERSCAN * 2)
      const start = Math.max(0, Math.floor(track.scrollLeft / width) - OVERSCAN)
      const end = Math.min(total - 1, start + count)
      setRange({ start, end })
      onVisibleRange?.(start, end)
      const current = Math.min(total, Math.max(1, Math.round(track.scrollLeft / width) + 1))
      onActiveIndexChange?.(current)
    }

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return
      const target = e.target as HTMLElement
      if (target.closest('button, a, input, textarea, select')) return

      pointerId = e.pointerId
      startX = e.clientX
      startScroll = track.scrollLeft
      dragging = false
      e.preventDefault()
      try {
        track.setPointerCapture(e.pointerId)
      } catch {
        pointerId = null
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      if (pointerId !== e.pointerId) return
      const dx = e.clientX - startX
      if (!dragging) {
        if (Math.abs(dx) < DRAG_THRESHOLD) return
        dragging = true
        draggedRef.current = true
        track.classList.add('is-dragging')
      }
      track.scrollLeft = startScroll - dx
    }

    const endDrag = (e: PointerEvent) => {
      if (pointerId !== e.pointerId) return
      if (typeof track.hasPointerCapture === 'function' && track.hasPointerCapture(e.pointerId)) {
        track.releasePointerCapture(e.pointerId)
      }
      const didDrag = dragging
      pointerId = null
      dragging = false
      track.classList.remove('is-dragging')
      if (didDrag) {
        window.setTimeout(() => {
          draggedRef.current = false
        }, 100)
      }
    }

    const onClickCapture = (e: MouseEvent) => {
      if (!draggedRef.current) return
      draggedRef.current = false
      e.preventDefault()
      e.stopPropagation()
    }

    const onDragStart = (e: DragEvent) => {
      e.preventDefault()
    }

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return

      const max = track.scrollWidth - track.clientWidth
      const atStart = track.scrollLeft <= 0 && e.deltaY < 0
      const atEnd = track.scrollLeft >= max - 1 && e.deltaY > 0
      if (atStart || atEnd || max <= 0) return

      e.preventDefault()
      track.scrollLeft += e.deltaY
    }

    track.addEventListener('pointerdown', onPointerDown)
    track.addEventListener('pointermove', onPointerMove)
    track.addEventListener('pointerup', endDrag)
    track.addEventListener('pointercancel', endDrag)
    track.addEventListener('click', onClickCapture, true)
    track.addEventListener('dragstart', onDragStart)
    track.addEventListener('wheel', onWheel, { passive: false })
    track.addEventListener('scroll', updateVisible, { passive: true })
    window.addEventListener('resize', measure)
    measure()
    updateVisible()

    return () => {
      track.removeEventListener('pointerdown', onPointerDown)
      track.removeEventListener('pointermove', onPointerMove)
      track.removeEventListener('pointerup', endDrag)
      track.removeEventListener('pointercancel', endDrag)
      track.removeEventListener('click', onClickCapture, true)
      track.removeEventListener('dragstart', onDragStart)
      track.removeEventListener('wheel', onWheel)
      track.removeEventListener('scroll', updateVisible)
      window.removeEventListener('resize', measure)
      track.classList.remove('is-dragging')
    }
  }, [containerRef, total, onActiveIndexChange, onVisibleRange, Object.keys(cards).length])

  const slots = []
  for (let i = range.start; i <= range.end; i += 1) {
    const meta = index[i]
    if (!meta) continue
    slots.push({ i, meta, doc: cards[meta.id] })
  }

  return (
    <section className="relative w-full overflow-hidden py-10">
      <div className="absolute top-[48%] left-0 w-full h-[2px] bg-outline-variant opacity-30 pointer-events-none" />
      <div
        ref={containerRef}
        className="timeline-scroller relative px-4 sm:px-8 lg:px-margin-desktop py-4 no-scrollbar"
      >
        <div className="relative" style={{ width: Math.max(step, total * step), height: trackHeight }}>
          {slots.map(({ i, meta, doc }) => (
            <div
              key={meta.id}
              className="timeline-slot absolute top-0"
              style={{ left: i * step, width: step, paddingRight: 32 }}
            >
              {doc ? (
                <DocumentCard doc={doc} trackRef={containerRef} onQuickView={onQuickViewDoc} />
              ) : (
                <div className="w-full space-y-3">
                  <Skeleton className="aspect-[4/5] w-full rounded-xl" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <p className="px-4 sm:px-8 lg:px-margin-desktop text-outline text-label-sm uppercase tracking-widest hidden sm:flex items-center gap-2">
        <Hand className="w-4 h-4" />
        <span>Arraste ou role horizontalmente</span>
      </p>
    </section>
  )
}
