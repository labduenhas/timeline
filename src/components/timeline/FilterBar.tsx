import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Category } from '@/types'

interface FilterBarProps {
  category?: string
  onCategoryChange: (cat?: string) => void
}

export function FilterBar({ category, onCategoryChange }: FilterBarProps) {
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    api.getCategories().then((res) => {
      setCategories(res.categories || [])
    }).catch(console.error)
  }, [])

  return (
    <div id="filtros" className="flex flex-wrap items-center justify-between gap-4 pt-4 scroll-mt-28">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 -mb-2 no-scrollbar">
        <button
          type="button"
          onClick={() => onCategoryChange(undefined)}
          className={cn(
            'px-4 py-2 rounded-full text-label-md font-semibold transition-all whitespace-nowrap',
            !category
              ? 'bg-primary text-on-primary'
              : 'bg-surface-container text-on-surface hover:bg-surface-container-highest'
          )}
        >
          Todas as Categorias
        </button>
        {categories.map((item) => {
          const active = category === item.slug
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onCategoryChange(active ? undefined : item.slug)}
              className={cn(
                'px-4 py-2 rounded-full text-label-md font-semibold transition-all whitespace-nowrap',
                active
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface hover:bg-surface-container-highest'
              )}
            >
              {item.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
