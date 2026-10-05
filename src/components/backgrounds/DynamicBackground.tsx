import { useRef, useEffect } from 'react'
import type { BackgroundState } from '@/hooks/useBackgroundTransition'

interface Props {
  state: BackgroundState
  className?: string
}

export function DynamicBackground({ state, className = '' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight

      const gradient = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        0,
        canvas.width / 2,
        canvas.height / 2,
        Math.max(canvas.width, canvas.height) / 1.5
      )
      gradient.addColorStop(0, 'rgba(0,0,0,0)')
      gradient.addColorStop(1, 'rgba(0,0,0,0.7)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  return (
    <div className={`fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none ${className}`}>
      {/* Base background color */}
      <div className="absolute inset-0 bg-gray-950" />

      {/* Current era image */}
      {state.currentImage && (
        <div
          className="absolute inset-0 bg-cover bg-center transition-none"
          style={{
            backgroundImage: `url(${state.currentImage})`,
            opacity: state.nextImage ? 1 - state.opacity : 1,
            filter: 'blur(3px) saturate(0.65)',
            transform: 'scale(1.05)',
          }}
        />
      )}

      {/* Next era image cross-fading */}
      {state.nextImage && (
        <div
          className="absolute inset-0 bg-cover bg-center transition-none"
          style={{
            backgroundImage: `url(${state.nextImage})`,
            opacity: state.opacity,
            filter: 'blur(3px) saturate(0.65)',
            transform: 'scale(1.05)',
          }}
        />
      )}

      {/* Dark overlay & radial vignette */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]" />
      <canvas ref={canvasRef} className="absolute inset-0 opacity-60" />

      {/* Era period indicator badge */}
      {state.period && (
        <div
          className="absolute bottom-6 right-6 z-10 px-4 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white/70 font-mono text-xs shadow-2xl transition-all duration-500 animate-fadeIn"
          style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}
        >
          <span className="text-indigo-400 font-bold mr-2">
            {state.period.start} — {state.period.end}
          </span>
          <span>{state.period.label}</span>
        </div>
      )}
    </div>
  )
}
