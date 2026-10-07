import { useEffect, useMemo, useRef } from 'react'

const YEAR_PX = 18
const DRAG_THRESHOLD = 6

function yearFromScroll(scrollLeft: number, minYear: number, maxYear: number) {
  return Math.min(maxYear, Math.max(minYear, minYear + Math.round(scrollLeft / YEAR_PX)))
}

function tickKind(year: number) {
  if (year % 10 === 0) return 'major'
  if (year % 5 === 0) return 'mid'
  return 'minor'
}

interface YearRulerProps {
  years: number[]
  activeYear: number | null
  onSelectYear: (year: number) => void
}

export function YearRuler({ years, activeYear, onSelectYear }: YearRulerProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const lastYearRef = useRef<number | null>(null)
  const minYear = years[0]
  const maxYear = years[years.length - 1]

  const ticks = useMemo(() => years, [years])

  useEffect(() => {
    const track = scrollerRef.current
    if (!track || minYear == null) return

    const syncPad = () => {
      const pad = Math.max(24, track.clientWidth / 2 - YEAR_PX / 2)
      track.style.setProperty('--ruler-pad', `${pad}px`)
    }
    syncPad()
    const observer = new ResizeObserver(syncPad)
    observer.observe(track)
    return () => observer.disconnect()
  }, [minYear, ticks.length])

  useEffect(() => {
    const track = scrollerRef.current
    if (!track || activeYear == null || draggingRef.current || minYear == null) return
    const next = (activeYear - minYear) * YEAR_PX
    if (Math.abs(track.scrollLeft - next) < 2) return
    track.scrollLeft = next
    lastYearRef.current = activeYear
  }, [activeYear, minYear])

  useEffect(() => {
    const track = scrollerRef.current
    if (!track || minYear == null || maxYear == null) return

    let pointerId: number | null = null
    let startX = 0
    let startScroll = 0
    let dragging = false
    let pressYear: number | null = null

    const emitYear = () => {
      const year = yearFromScroll(track.scrollLeft, minYear, maxYear)
      if (year === lastYearRef.current) return
      lastYearRef.current = year
      onSelectYear(year)
    }

    const goToYear = (year: number) => {
      lastYearRef.current = year
      onSelectYear(year)
      track.scrollLeft = (year - minYear) * YEAR_PX
    }

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      pointerId = e.pointerId
      startX = e.clientX
      startScroll = track.scrollLeft
      dragging = false
      const attr = (e.target as HTMLElement).closest('[data-ruler-year]')?.getAttribute('data-ruler-year')
      pressYear = attr ? Number(attr) : null
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
        draggingRef.current = true
        track.classList.add('is-dragging')
      }
      track.scrollLeft = startScroll - dx
    }

    const endDrag = (e: PointerEvent) => {
      if (pointerId !== e.pointerId) return
      if (typeof track.hasPointerCapture === 'function' && track.hasPointerCapture(e.pointerId)) {
        track.releasePointerCapture(e.pointerId)
      }
      pointerId = null
      if (dragging) emitYear()
      else if (pressYear != null) goToYear(pressYear)
      pressYear = null
      dragging = false
      track.classList.remove('is-dragging')
      window.setTimeout(() => {
        draggingRef.current = false
      }, 120)
    }

    const onScroll = () => {
      if (!draggingRef.current) return
      emitYear()
    }

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return
      const max = track.scrollWidth - track.clientWidth
      if (max <= 0) return
      e.preventDefault()
      draggingRef.current = true
      track.scrollLeft += e.deltaY
      emitYear()
      window.setTimeout(() => {
        draggingRef.current = false
      }, 120)
    }

    track.addEventListener('pointerdown', onPointerDown)
    track.addEventListener('pointermove', onPointerMove)
    track.addEventListener('pointerup', endDrag)
    track.addEventListener('pointercancel', endDrag)
    track.addEventListener('scroll', onScroll, { passive: true })
    track.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      track.removeEventListener('pointerdown', onPointerDown)
      track.removeEventListener('pointermove', onPointerMove)
      track.removeEventListener('pointerup', endDrag)
      track.removeEventListener('pointercancel', endDrag)
      track.removeEventListener('scroll', onScroll)
      track.removeEventListener('wheel', onWheel)
      track.classList.remove('is-dragging')
    }
  }, [minYear, maxYear, onSelectYear])

  if (ticks.length === 0 || minYear == null || maxYear == null) return null

  const shownYear = activeYear ?? minYear

  return (
    <div className="year-ruler" role="group" aria-label="Régua de anos da linha do tempo">
      <div className="year-ruler-edge year-ruler-edge-left" aria-hidden="true" />
      <div className="year-ruler-edge year-ruler-edge-right" aria-hidden="true" />
      <div className="year-ruler-needle" aria-hidden="true">
        <span className="year-ruler-bead" />
      </div>
      <div
        ref={scrollerRef}
        className="year-ruler-scroller no-scrollbar"
        tabIndex={0}
        aria-valuemin={minYear}
        aria-valuemax={maxYear}
        aria-valuenow={shownYear}
        aria-label={`Ano ${shownYear}`}
        role="slider"
      >
        <div className="year-ruler-track">
          {ticks.map((year) => (
            <button
              key={year}
              type="button"
              data-ruler-year={year}
              className={`year-ruler-tick year-ruler-tick-${tickKind(year)}`}
              aria-label={`Ir para ${year}`}
            >
              {year % 10 === 0 ? <span className="year-ruler-label">{year}</span> : null}
            </button>
          ))}
        </div>
      </div>
      <p className="year-ruler-readout" aria-live="polite">
        {shownYear}
      </p>
    </div>
  )
}

export function yearsFromDocuments(dates: string[]) {
  const values = dates
    .map((date) => Number(String(date).slice(0, 4)))
    .filter((year) => Number.isFinite(year) && year > 0)
  if (values.length === 0) return []
  const start = Math.floor(Math.min(...values) / 10) * 10
  const end = Math.ceil(Math.max(...values) / 10) * 10
  const years: number[] = []
  for (let year = start; year <= end; year += 1) years.push(year)
  return years
}
