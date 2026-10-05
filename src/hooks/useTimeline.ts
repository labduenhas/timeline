import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import type { DocumentItem, PeriodBackground } from '@/types'

export interface TimelineFilters {
  category?: string
  tags?: string[]
  from?: string
  to?: string
  search?: string
}

export function useTimeline(filters: TimelineFilters) {
  const [items, setItems] = useState<DocumentItem[]>([])
  const [periodBackgrounds, setPeriodBackgrounds] = useState<PeriodBackground[]>([])
  const [total, setTotal] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTimeline = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getTimeline({
        category: filters.category,
        tags: filters.tags?.length ? filters.tags.join(',') : undefined,
        from: filters.from,
        to: filters.to,
        search: filters.search,
      })
      setItems(data.items || [])
      setPeriodBackgrounds(data.period_backgrounds || [])
      setTotal(data.total || 0)
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
    items,
    periodBackgrounds,
    total,
    loading,
    error,
    refetch: fetchTimeline,
  }
}
