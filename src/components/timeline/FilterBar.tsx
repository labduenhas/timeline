import React, { useState, useEffect } from 'react'
import { Search, X, RotateCcw } from 'lucide-react'
import { api } from '@/lib/api'
import type { Category, Tag } from '@/types'

interface FilterBarProps {
  category?: string
  tags?: string[]
  search?: string
  from?: string
  to?: string
  onCategoryChange: (cat?: string) => void
  onTagToggle: (tag: string) => void
  onSearchChange: (search: string) => void
  onDateRangeChange: (from?: string, to?: string) => void
  onReset: () => void
  totalResults: number
}

export function FilterBar({
  category,
  tags = [],
  search = '',
  from = '',
  to = '',
  onCategoryChange,
  onTagToggle,
  onSearchChange,
  onDateRangeChange,
  onReset,
  totalResults,
}: FilterBarProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    api.getCategories().then((res) => {
      setCategories(res.categories || [])
      setAvailableTags(res.tags || [])
    }).catch(console.error)
  }, [])

  const hasActiveFilters = Boolean(category || tags.length > 0 || search || from || to)

  return (
    <div className="w-full bg-gray-950/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl space-y-3.5">
      {/* Top row: search & primary category pills */}
      <div className="flex flex-col md:flex-row items-center gap-3 justify-between">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por título, autor ou assunto..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-gray-900/80 border border-white/10 rounded-xl text-xs md:text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => onCategoryChange(undefined)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
              !category
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-gray-900/60 text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            Todas as Categorias
          </button>
          {categories.map((cat) => {
            const isSelected = category === cat.slug
            return (
              <button
                key={cat.id}
                onClick={() => onCategoryChange(isSelected ? undefined : cat.slug)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5"
                style={{
                  backgroundColor: isSelected ? cat.color : `${cat.color}15`,
                  color: isSelected ? '#ffffff' : cat.color,
                  border: `1px solid ${cat.color}${isSelected ? 'ff' : '40'}`,
                }}
              >
                <span>{cat.name}</span>
                {cat.doc_count !== undefined && (
                  <span className="text-[10px] opacity-75">({cat.doc_count})</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Results Counter & Toggle advanced */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <span className="text-xs text-gray-400 font-mono">
            <strong className="text-indigo-400 font-bold">{totalResults}</strong>{' '}
            {totalResults === 1 ? 'item' : 'itens'}
          </span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium underline underline-offset-4"
          >
            {isExpanded ? 'Menos filtros' : 'Mais filtros'}
          </button>
        </div>
      </div>

      {/* Advanced Filters: Tags & Date Range */}
      {isExpanded && (
        <div className="pt-3 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
          {/* Tag Cloud */}
          <div>
            <span className="text-xs font-medium text-gray-400 block mb-2">Filtrar por Tags:</span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {availableTags.map((tag) => {
                const isSelected = tags.includes(tag.slug)
                return (
                  <button
                    key={tag.id}
                    onClick={() => onTagToggle(tag.slug)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
                        : 'bg-gray-900/40 text-gray-400 border-white/5 hover:border-white/20 hover:text-gray-200'
                    }`}
                  >
                    #{tag.name}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Date Range & Clear */}
          <div className="flex flex-col justify-between">
            <span className="text-xs font-medium text-gray-400 block mb-2">Intervalo de Anos:</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Ano Inicial (ex: 1900)"
                value={from}
                onChange={(e) => onDateRangeChange(e.target.value, to)}
                className="w-full px-3 py-1.5 bg-gray-900/80 border border-white/10 rounded-lg text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-gray-500 text-xs">até</span>
              <input
                type="number"
                placeholder="Ano Final (ex: 2026)"
                value={to}
                onChange={(e) => onDateRangeChange(from, e.target.value)}
                className="w-full px-3 py-1.5 bg-gray-900/80 border border-white/10 rounded-lg text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {hasActiveFilters && (
              <div className="pt-3 flex justify-end">
                <button
                  onClick={onReset}
                  className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Limpar todos os filtros</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
