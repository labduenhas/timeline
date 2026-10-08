import { useEffect, useRef, useState } from 'react'

const DRAG_THRESHOLD = 4

export function PageRuler() {
  const rulerRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const measure = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      setProgress(max <= 0 ? 0 : Math.min(1, Math.max(0, window.scrollY / max)))
    }
    measure()
    window.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
    }
  }, [])

  useEffect(() => {
    const ruler = rulerRef.current
    if (!ruler) return

    let pointerId: number | null = null
    let lastY = 0
    let dragging = false

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      pointerId = event.pointerId
      lastY = event.clientY
      dragging = false
      ruler.setPointerCapture(event.pointerId)
    }

    const onPointerMove = (event: PointerEvent) => {
      if (pointerId !== event.pointerId) return
      const dy = event.clientY - lastY
      if (!dragging) {
        if (Math.abs(dy) < DRAG_THRESHOLD) return
        dragging = true
        ruler.classList.add('is-dragging')
      }
      lastY = event.clientY
      window.scrollBy({ top: dy, behavior: 'auto' })
    }

    const endDrag = (event: PointerEvent) => {
      if (pointerId !== event.pointerId) return
      pointerId = null
      dragging = false
      ruler.classList.remove('is-dragging')
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      window.scrollBy({ top: event.deltaY, left: 0, behavior: 'auto' })
    }

    ruler.addEventListener('pointerdown', onPointerDown)
    ruler.addEventListener('pointermove', onPointerMove)
    ruler.addEventListener('pointerup', endDrag)
    ruler.addEventListener('pointercancel', endDrag)
    ruler.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      ruler.removeEventListener('pointerdown', onPointerDown)
      ruler.removeEventListener('pointermove', onPointerMove)
      ruler.removeEventListener('pointerup', endDrag)
      ruler.removeEventListener('pointercancel', endDrag)
      ruler.removeEventListener('wheel', onWheel)
      ruler.classList.remove('is-dragging')
    }
  }, [])

  return (
    <div
      ref={rulerRef}
      className="page-ruler hidden lg:block"
      role="scrollbar"
      aria-orientation="vertical"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      aria-label="Régua para descer a página"
    >
      <div className="page-ruler-ticks" aria-hidden="true" />
      <div
        className="page-ruler-mark"
        style={{ top: `calc(0.65rem + (100% - 1.3rem) * ${progress})` }}
        aria-hidden="true"
      />
    </div>
  )
}
