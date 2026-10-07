import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import type { DocumentItem, PeriodBackground, TimelineIndexItem } from '@/types'

export interface TimelineFilters {
  category?: string
  tags?: string[]
  from?: string
  to?: string
  search?: string
}

export const TIMELINE_WINDOW = 28

export function yearOf(date: string) {
  return Number(String(date).slice(0, 4))
}

export function indexForYear(index: TimelineIndexItem[], year: number) {
  if (index.length === 0) return 0
  let lo = 0
  let hi = index.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (yearOf(index[mid].doc_date) < year) lo = mid + 1
    else hi = mid
  }
  let best = lo
  let bestDist = Math.abs(yearOf(index[lo].doc_date) - year)
  if (lo > 0) {
    const prev = Math.abs(yearOf(index[lo - 1].doc_date) - year)
    if (prev < bestDist) {
      best = lo - 1
      bestDist = prev
    }
  }
  if (lo + 1 < index.length) {
    const next = Math.abs(yearOf(index[lo + 1].doc_date) - year)
    if (next < bestDist) best = lo + 1
  }
  return best
}

export function useTimeline(filters: TimelineFilters) {
  const [index, setIndex] = useState<TimelineIndexItem[]>([])
  const [cards, setCards] = useState<Record<string, DocumentItem>>({})
  const [featured, setFeatured] = useState<DocumentItem[]>([])
  const [periodBackgrounds, setPeriodBackgrounds] = useState<PeriodBackground[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const cardsRef = useRef(cards)
  cardsRef.current = cards
  const pending = useRef(new Set<string>())

  const filterKey = [filters.category, filters.tags?.join(','), filters.from, filters.to, filters.search].join('|')

  const fetchWindow = useCallback(
    async (offset: number, limit = TIMELINE_WINDOW) => {
      const start = Math.max(0, offset)
      const key = `${filterKey}:${start}:${limit}`
      if (pending.current.has(key)) return
      pending.current.add(key)
      try {
        const data = await api.getTimeline({
          category: filters.category,
          tags: filters.tags?.length ? filters.tags.join(',') : undefined,
          from: filters.from,
          to: filters.to,
          search: filters.search,
          offset: start,
          limit,
        })
        setCards((prev) => {
          const next = { ...prev }
          for (const item of data.items || []) next[item.id] = item
          return next
        })
      } finally {
        pending.current.delete(key)
      }
    },
    [filterKey, filters.category, filters.from, filters.search, filters.tags, filters.to]
  )

  const ensureRange = useCallback(
    (startIndex: number, endIndex: number) => {
      const start = Math.max(0, startIndex)
      const end = Math.max(start, endIndex)
      const slice = index.slice(start, end + 1)
      const missing = slice.filter((entry) => !cardsRef.current[entry.id])
      if (missing.length === 0) return
      fetchWindow(start, Math.max(TIMELINE_WINDOW, end - start + 1))
    },
    [fetchWindow, index]
  )

  const fetchTimeline = useCallback(async () => {
    setLoading(true)
    setError(null)
    pending.current.clear()
    try {
      const data = await api.getTimeline({
        category: filters.category,
        tags: filters.tags?.length ? filters.tags.join(',') : undefined,
        from: filters.from,
        to: filters.to,
        search: filters.search,
        mode: 'index',
      })
      const nextIndex = data.index?.length
        ? data.index
        : (data.items || []).map((item) => ({
            id: item.id,
            slug: item.slug,
            doc_date: item.doc_date,
            is_featured: item.is_featured,
          }))
      const nextCards: Record<string, DocumentItem> = {}
      for (const item of data.items || []) nextCards[item.id] = item
      for (const item of data.featured || []) nextCards[item.id] = item
      setIndex(nextIndex)
      setCards(nextCards)
      setFeatured(data.featured?.length ? data.featured : (data.items || []).filter((item) => item.is_featured).slice(0, 3))
      setPeriodBackgrounds(data.period_backgrounds || [])
      setTotal(data.total || nextIndex.length)
      if (!data.index?.length && !(data.items || []).length) {
        /* empty catalog */
      } else if (data.index?.length && !(data.items || []).length) {
        await api
          .getTimeline({
            category: filters.category,
            tags: filters.tags?.length ? filters.tags.join(',') : undefined,
            from: filters.from,
            to: filters.to,
            search: filters.search,
            offset: 0,
            limit: TIMELINE_WINDOW,
          })
          .then((windowRes) => {
            setCards((prev) => {
              const merged = { ...prev }
              for (const item of windowRes.items || []) merged[item.id] = item
              return merged
            })
          })
      }
    } catch (err: any) {
      console.error('[useTimeline fetch error]', err)
      setError(err.message || 'Não foi possível carregar a linha do tempo.')
    } finally {
      setLoading(false)
    }
  }, [filters.category, filters.tags?.join(','), filters.from, filters.to, filters.search])

  useEffect(() => {
    fetchTimeline()
  }, [fetchTimeline])

  return {
    index,
    cards,
    featured,
    periodBackgrounds,
    total,
    loading,
    error,
    refetch: fetchTimeline,
    ensureRange,
  }
}
