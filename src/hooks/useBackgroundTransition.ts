import { useState, useEffect, useRef, useCallback } from 'react'
import type { PeriodBackground } from '@/types'

export interface BackgroundState {
  currentImage: string | null
  nextImage: string | null
  opacity: number
  period: { start: number; end: number; label: string } | null
}

export function useBackgroundTransition(
  scrollProgress: number,
  periodBackgrounds: PeriodBackground[]
) {
  const [bg, setBg] = useState<BackgroundState>({
    currentImage: null,
    nextImage: null,
    opacity: 0,
    period: null,
  })
  const transitionRef = useRef<number | null>(null)

  const findPeriod = useCallback(
    (progress: number) => {
      if (!periodBackgrounds.length) return null
      const index = Math.floor(progress * periodBackgrounds.length)
      return periodBackgrounds[Math.min(index, periodBackgrounds.length - 1)]
    },
    [periodBackgrounds]
  )

  useEffect(() => {
    const period = findPeriod(scrollProgress)
    if (!period) return

    const newImage = period.image_url
    if (newImage === bg.currentImage && !bg.nextImage) return

    if (transitionRef.current) cancelAnimationFrame(transitionRef.current)

    setBg((prev) => ({ ...prev, nextImage: newImage, opacity: 0 }))

    let start: number | null = null
    const duration = 1200 // ms

    function animate(ts: number) {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic

      setBg((prev) => ({
        currentImage: progress >= 1 ? newImage : prev.currentImage,
        nextImage: progress >= 1 ? null : newImage,
        opacity: eased,
        period: period
          ? {
              start: period.year_start,
              end: period.year_end,
              label: period.description,
            }
          : null,
      }))

      if (progress < 1) {
        transitionRef.current = requestAnimationFrame(animate)
      }
    }
    transitionRef.current = requestAnimationFrame(animate)

    return () => {
      if (transitionRef.current) cancelAnimationFrame(transitionRef.current)
    }
  }, [scrollProgress, findPeriod])

  return bg
}
