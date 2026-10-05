import React, { useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { DocumentItem } from '@/types'
import { DocumentCard } from './DocumentCard'
import { TimelineMarker } from './TimelineMarker'

interface TimelineTrackProps {
  items: DocumentItem[]
  onSelectDoc: (slug: string) => void
  onQuickViewDoc: (doc: DocumentItem) => void
  containerRef: React.RefObject<HTMLDivElement>
}

export function TimelineTrack({
  items,
  onSelectDoc,
  onQuickViewDoc,
  containerRef,
}: TimelineTrackProps) {
  const isMouseDown = useRef(false)
  const startX = useRef(0)
  const scrollLeftStart = useRef(0)

  // Keyboard navigation (Left / Right arrow keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === 'ArrowRight') {
        containerRef.current.scrollBy({ left: 300, behavior: 'smooth' })
      } else if (e.key === 'ArrowLeft') {
        containerRef.current.scrollBy({ left: -300, behavior: 'smooth' })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [containerRef])

  // Mouse Drag to scroll
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return
    isMouseDown.current = true
    startX.current = e.pageX - containerRef.current.offsetLeft
    scrollLeftStart.current = containerRef.current.scrollLeft
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown.current || !containerRef.current) return
    e.preventDefault()
    const x = e.pageX - containerRef.current.offsetLeft
    const walk = (x - startX.current) * 1.5 // scroll speed multiplier
    containerRef.current.scrollLeft = scrollLeftStart.current - walk
  }

  const handleMouseUp = () => {
    isMouseDown.current = false
  }

  const scrollByAmount = (amount: number) => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: amount, behavior: 'smooth' })
    }
  }

  // Pre-calculate items with markers
  let lastYear = ''
  const renderElements: React.ReactNode[] = []

  items.forEach((doc) => {
    const currentYear = doc.doc_date ? doc.doc_date.substring(0, 4) : ''
    if (currentYear && currentYear !== lastYear) {
      lastYear = currentYear
      renderElements.push(
        <TimelineMarker key={`marker-${currentYear}-${doc.id}`} year={currentYear} />
      )
    }

    renderElements.push(
      <DocumentCard
        key={doc.id}
        doc={doc}
        onSelect={onSelectDoc}
        onQuickView={onQuickViewDoc}
      />
    )
  })

  return (
    <div className="relative w-full group/track select-none">
      {/* Scroll Navigation Buttons for desktop */}
      <button
        onClick={() => scrollByAmount(-450)}
        className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-gray-950/80 hover:bg-indigo-600 text-white border border-white/20 items-center justify-center backdrop-blur-md shadow-2xl transition-all opacity-0 group-hover/track:opacity-100 hover:scale-110 active:scale-95"
        aria-label="Rolar para esquerda"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <button
        onClick={() => scrollByAmount(450)}
        className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-gray-950/80 hover:bg-indigo-600 text-white border border-white/20 items-center justify-center backdrop-blur-md shadow-2xl transition-all opacity-0 group-hover/track:opacity-100 hover:scale-110 active:scale-95"
        aria-label="Rolar para direita"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Main Continuous Timeline Rail (Horizontal) */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="w-full overflow-x-auto overflow-y-hidden py-12 px-6 sm:px-12 flex items-start gap-4 md:gap-8 scrollbar-thin scrollbar-thumb-indigo-500/30 scrollbar-track-transparent cursor-grab active:cursor-grabbing scroll-smooth"
        style={{ scrollSnapType: 'x proximity' }}
      >
        {/* Horizontal center track line */}
        <div className="absolute left-0 right-0 top-18 h-0.5 bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />

        {renderElements}

        {/* End of line spacer */}
        <div className="flex-shrink-0 w-24 flex items-center justify-center text-xs text-gray-500 font-mono italic">
          — Fim do Acervo —
        </div>
      </div>
    </div>
  )
}
