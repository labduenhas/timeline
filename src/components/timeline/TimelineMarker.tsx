import React from 'react'

interface TimelineMarkerProps {
  year: string | number
  eraLabel?: string
}

export function TimelineMarker({ year, eraLabel }: TimelineMarkerProps) {
  return (
    <div className="flex-shrink-0 flex flex-col items-center justify-start px-8 select-none py-4">
      {/* Year Pill */}
      <div className="relative z-20 flex flex-col items-center">
        <div className="px-3.5 py-1 rounded-full bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 font-mono text-xs font-bold tracking-wider shadow-lg shadow-indigo-900/30">
          {year}
        </div>
        {eraLabel && (
          <span className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest font-mono">
            {eraLabel}
          </span>
        )}
        <div className="w-px h-10 bg-gradient-to-b from-indigo-500/60 to-transparent mt-2" />
      </div>
    </div>
  )
}
