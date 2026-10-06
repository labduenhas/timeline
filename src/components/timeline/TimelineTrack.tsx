import React, { useEffect, useRef } from 'react'
import { Hand } from 'lucide-react'
import type { DocumentItem } from '@/types'
import { DocumentCard } from './DocumentCard'

interface TimelineTrackProps {
  items: DocumentItem[]
  onQuickViewDoc: (doc: DocumentItem) => void
  containerRef: React.RefObject<HTMLDivElement>
  onActiveIndexChange?: (index: number) => void
}

export function cardStep(track: HTMLElement | null) {
  const first = track?.querySelector<HTMLElement>('.timeline-card')
  return first ? first.getBoundingClientRect().width + 32 : 442
}

export function scrollTimelineBy(track: HTMLElement | null, direction: number) {
  if (!track) return
  track.scrollBy({ left: direction * cardStep(track), behavior: 'smooth' })
}

export function scrollTimelineToRange(track: HTMLElement | null, yearStart: number, yearEnd: number) {
  if (!track) return
  const cards = Array.from(track.querySelectorAll<HTMLElement>('.timeline-card'))
  const match = cards.find((card) => {
    const year = Number(card.dataset.year)
    return year >= yearStart && year <= yearEnd
  }) ?? cards.find((card) => Number(card.dataset.year) >= yearStart)

  if (!match) return
  const left = match.getBoundingClientRect().left - track.getBoundingClientRect().left + track.scrollLeft - 32
  track.scrollTo({
    left,
    behavior: 'smooth',
  })
}

const DRAG_THRESHOLD = 6

export function TimelineTrack({
  items,
  onQuickViewDoc,
  containerRef,
  onActiveIndexChange,
}: TimelineTrackProps) {
  const draggedRef = useRef(false)

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

    const onScroll = () => {
      const width = cardStep(track)
      const count = track.querySelectorAll('.timeline-card').length
      const current = Math.min(count, Math.max(1, Math.round(track.scrollLeft / width) + 1))
      onActiveIndexChange?.(current)
    }

    track.addEventListener('pointerdown', onPointerDown)
    track.addEventListener('pointermove', onPointerMove)
    track.addEventListener('pointerup', endDrag)
    track.addEventListener('pointercancel', endDrag)
    track.addEventListener('click', onClickCapture, true)
    track.addEventListener('dragstart', onDragStart)
    track.addEventListener('wheel', onWheel, { passive: false })
    track.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    return () => {
      track.removeEventListener('pointerdown', onPointerDown)
      track.removeEventListener('pointermove', onPointerMove)
      track.removeEventListener('pointerup', endDrag)
      track.removeEventListener('pointercancel', endDrag)
      track.removeEventListener('click', onClickCapture, true)
      track.removeEventListener('dragstart', onDragStart)
      track.removeEventListener('wheel', onWheel)
      track.removeEventListener('scroll', onScroll)
      track.classList.remove('is-dragging')
    }
  }, [containerRef, items, onActiveIndexChange])

  return (
    <section className="relative w-full overflow-hidden py-10">
      <div className="absolute top-[48%] left-0 w-full h-[2px] bg-outline-variant opacity-30 pointer-events-none" />
      <div
        ref={containerRef}
        className="timeline-scroller relative flex gap-8 px-4 sm:px-8 lg:px-margin-desktop py-4 no-scrollbar"
      >
        {items.map((doc) => (
          <DocumentCard
            key={doc.id}
            doc={doc}
            trackRef={containerRef}
            onQuickView={onQuickViewDoc}
          />
        ))}
      </div>
      <p className="px-4 sm:px-8 lg:px-margin-desktop text-outline text-label-sm uppercase tracking-widest hidden sm:flex items-center gap-2">
        <Hand className="w-4 h-4" />
        <span>Arraste ou role horizontalmente</span>
      </p>
    </section>
  )
}
