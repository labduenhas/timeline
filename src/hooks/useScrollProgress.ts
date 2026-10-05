import { useState, useEffect, RefObject } from 'react'

export function useScrollProgress(containerRef: RefObject<HTMLElement | null>, isHorizontal = true) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleScroll = () => {
      let current = 0
      let max = 0

      if (isHorizontal) {
        current = el.scrollLeft
        max = el.scrollWidth - el.clientWidth
      } else {
        current = el.scrollTop
        max = el.scrollHeight - el.clientHeight
      }

      if (max > 0) {
        const p = Math.min(Math.max(current / max, 0), 1)
        setProgress(p)
      } else {
        setProgress(0)
      }
    }

    el.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // initial calculation

    return () => {
      el.removeEventListener('scroll', handleScroll)
    }
  }, [containerRef, isHorizontal])

  return progress
}
