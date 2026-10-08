import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface HeroBackdropProps {
  images: string[]
  intervalSeconds: number
  kenBurns: boolean
}

export function HeroBackdrop({ images, intervalSeconds, kenBurns }: HeroBackdropProps) {
  const [index, setIndex] = useState(0)
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    setIndex(0)
  }, [images])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReduceMotion(media.matches)
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    if (images.length < 2) return
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % images.length)
    }, intervalSeconds * 1000)
    return () => window.clearInterval(timer)
  }, [images, intervalSeconds])

  if (images.length === 0) return null

  const motion = kenBurns && images.length > 1 && !reduceMotion

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      {images.map((src, imageIndex) => {
        const active = imageIndex === index
        return (
          <img
            key={`${src}-${imageIndex}`}
            src={src}
            alt=""
            className={cn('hero-slide absolute inset-0 h-full w-full object-cover', active ? 'opacity-100' : 'opacity-0', motion && active && 'is-kenburns')}
            style={motion && active ? { animationDuration: `${intervalSeconds}s` } : undefined}
          />
        )
      })}
      <div className="hero-veil absolute inset-0" />
    </div>
  )
}
