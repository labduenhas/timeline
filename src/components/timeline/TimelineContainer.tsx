import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, RefreshCw, Sparkles, FolderArchive } from 'lucide-react'
import { useTimeline } from '@/hooks/useTimeline'
import { useScrollProgress } from '@/hooks/useScrollProgress'
import { useBackgroundTransition } from '@/hooks/useBackgroundTransition'
import { DynamicBackground } from '@/components/backgrounds/DynamicBackground'
import { FilterBar } from './FilterBar'
import { TimelineTrack } from './TimelineTrack'
import { DocumentModal } from './DocumentModal'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import type { DocumentItem } from '@/types'

export function TimelineContainer() {
  const navigate = useNavigate()
  const trackRef = useRef<HTMLDivElement>(null)

  // Filters State
  const [category, setCategory] = useState<string | undefined>()
  const [tags, setTags] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  // Quick view preview state
  const [quickDoc, setQuickDoc] = useState<DocumentItem | null>(null)

  // Fetch timeline data
  const { items, periodBackgrounds, total, loading, error, refetch } = useTimeline({
    category,
    tags,
    search,
    from,
    to,
  })

  // Track scroll progress along horizontal rail
  const scrollProgress = useScrollProgress(trackRef, true)

  // Calculate dynamic background transitions based on scroll position
  const bgState = useBackgroundTransition(scrollProgress, periodBackgrounds)

  const handleTagToggle = (tagSlug: string) => {
    setTags((prev) =>
      prev.includes(tagSlug) ? prev.filter((t) => t !== tagSlug) : [...prev, tagSlug]
    )
  }

  const handleResetFilters = () => {
    setCategory(undefined)
    setTags([])
    setSearch('')
    setFrom('')
    setTo('')
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col justify-between overflow-hidden">
      {/* Dynamic Background with smooth crossfade */}
      <DynamicBackground state={bgState} />

      {/* Top Filter and Search Bar */}
      <div className="w-full max-w-7xl mx-auto px-4 pt-6 pb-2 z-20">
        <FilterBar
          category={category}
          tags={tags}
          search={search}
          from={from}
          to={to}
          onCategoryChange={setCategory}
          onTagToggle={handleTagToggle}
          onSearchChange={setSearch}
          onDateRangeChange={(f, t) => {
            if (f !== undefined) setFrom(f)
            if (t !== undefined) setTo(t)
          }}
          onReset={handleResetFilters}
          totalResults={total}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-center my-auto z-10 w-full">
        {loading ? (
          <div className="w-full px-8 py-16 flex gap-6 overflow-x-hidden">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="w-56 flex-shrink-0 space-y-3">
                <Skeleton className="h-36 w-full rounded-2xl" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="max-w-md mx-auto my-12 p-6 rounded-2xl bg-gray-900/90 border border-rose-500/30 text-center space-y-4 backdrop-blur-xl shadow-2xl">
            <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
            <h3 className="text-lg font-bold text-white">Falha ao carregar o acervo</h3>
            <p className="text-xs text-gray-300">{error}</p>
            <Button variant="primary" onClick={refetch} className="mx-auto">
              <RefreshCw className="w-4 h-4 mr-2" /> Tentar Novamente
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="max-w-md mx-auto my-16 p-8 rounded-3xl bg-gray-900/80 border border-white/10 text-center space-y-4 backdrop-blur-xl shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
              <FolderArchive className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white">Nenhum documento encontrado</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Não encontramos nenhum registro histórico correspondente aos filtros selecionados. Tente ajustar a busca ou o período.
            </p>
            <Button variant="secondary" onClick={handleResetFilters} className="mx-auto">
              Redefinir Filtros
            </Button>
          </div>
        ) : (
          <TimelineTrack
            items={items}
            containerRef={trackRef}
            onSelectDoc={(slug) => navigate(`/doc/${slug}`)}
            onQuickViewDoc={(doc) => setQuickDoc(doc)}
          />
        )}
      </div>

      {/* Subtle instructions hint on footer bar */}
      <div className="pb-4 px-6 text-center text-[11px] text-gray-400 font-mono tracking-wide z-10 flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
        <span>Arraste com o mouse ou use as setas do teclado ← → para viajar no tempo</span>
      </div>

      {/* Quick view modal */}
      <DocumentModal doc={quickDoc} onClose={() => setQuickDoc(null)} />
    </div>
  )
}
