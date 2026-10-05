import React, { useState } from 'react'
import { Plus, Tag as TagIcon, Palette } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { Category, Tag } from '@/types'

interface CategoryManagerProps {
  categories: Category[]
  tags: Tag[]
  onRefresh: () => void
}

export function CategoryManager({ categories, tags, onRefresh }: CategoryManagerProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#6366f1')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [tagName, setTagName] = useState('')
  const [tagColor, setTagColor] = useState('#94a3b8')
  const [isSubmittingTag, setIsSubmittingTag] = useState(false)

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return
    setIsSubmitting(true)
    try {
      await api.createCategory({ name, color, description, sort_order: categories.length + 1 })
      setName('')
      setDescription('')
      onRefresh()
    } catch (err) {
      console.error(err)
      alert('Erro ao criar categoria')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tagName) return
    setIsSubmittingTag(true)
    try {
      await api.createTag({ name: tagName, color: tagColor })
      setTagName('')
      onRefresh()
    } catch (err) {
      console.error(err)
      alert('Erro ao criar tag')
    } finally {
      setIsSubmittingTag(false)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Category Creation & List */}
      <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 space-y-4">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <Palette className="w-4 h-4 text-indigo-400" />
          <span>Categorias Temáticas ({categories.length})</span>
        </h4>

        <form onSubmit={handleCreateCategory} className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Nome da Categoria"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-12 h-10 rounded-lg cursor-pointer bg-gray-800 border border-gray-700"
            />
          </div>
          <Input
            placeholder="Breve descrição da categoria (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Button type="submit" size="sm" loading={isSubmitting} className="w-full">
            <Plus className="w-4 h-4 mr-1.5" /> Adicionar Categoria
          </Button>
        </form>

        <div className="pt-2 divide-y divide-white/5 max-h-56 overflow-y-auto">
          {categories.map((c) => (
            <div key={c.id} className="py-2 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="font-semibold text-white">{c.name}</span>
              </div>
              <span className="text-gray-500 font-mono">{c.doc_count || 0} docs</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tag Creation & List */}
      <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 space-y-4">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <TagIcon className="w-4 h-4 text-indigo-400" />
          <span>Etiquetas e Tags ({tags.length})</span>
        </h4>

        <form onSubmit={handleCreateTag} className="flex gap-2">
          <Input
            placeholder="Nova Tag (ex: manuscrito)"
            value={tagName}
            onChange={(e) => setTagName(e.target.value)}
            required
          />
          <input
            type="color"
            value={tagColor}
            onChange={(e) => setTagColor(e.target.value)}
            className="w-12 h-10 rounded-lg cursor-pointer bg-gray-800 border border-gray-700"
          />
          <Button type="submit" size="sm" loading={isSubmittingTag}>
            <Plus className="w-4 h-4" />
          </Button>
        </form>

        <div className="pt-2 flex flex-wrap gap-1.5 max-h-56 overflow-y-auto">
          {tags.map((t) => (
            <span
              key={t.id}
              className="text-xs px-2.5 py-1 rounded-lg border border-white/10 bg-gray-800/80 text-gray-300 font-mono"
            >
              #{t.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
