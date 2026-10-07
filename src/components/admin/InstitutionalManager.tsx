import { useEffect, useState } from 'react'
import { Eye, EyeOff, FilePlus, Landmark, Pencil, Trash2 } from 'lucide-react'
import { ArticleEditor } from '@/components/admin/ArticleEditor'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { api } from '@/lib/api'
import { DEFAULT_PAGES } from '@/lib/siteDefaults'
import type { SitePage } from '@/types'

interface InstitutionalManagerProps {
  onChanged?: () => void
}

const emptyDraft = (): SitePage => ({
  id: '',
  slug: '',
  title: '',
  body: '',
  is_visible: true,
  sort_order: 100,
})

export function InstitutionalManager({ onChanged }: InstitutionalManagerProps) {
  const [pages, setPages] = useState<SitePage[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | 'new' | null>(null)
  const [draft, setDraft] = useState<SitePage>(emptyDraft())

  const loadPages = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getPages(true)
      setPages(res.items || [])
    } catch (err: any) {
      setPages(DEFAULT_PAGES)
      setError(err.message || 'Não foi possível carregar as páginas. A API ainda pode não ter esta rota.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPages()
  }, [])

  const openPage = async (page: SitePage) => {
    setError(null)
    setSelectedId(page.id)
    try {
      const full = await api.getPage(page.slug)
      setDraft({ ...page, ...full, body: full.body || '' })
    } catch {
      setDraft({ ...page, body: page.body || '' })
    }
  }

  const openNew = () => {
    setSelectedId('new')
    setDraft(emptyDraft())
    setError(null)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.title.trim()) return
    setSaving(true)
    setError(null)
    try {
      if (selectedId === 'new' || !draft.id) {
        const created = await api.createPage({
          title: draft.title,
          slug: draft.slug,
          body: draft.body || '',
          is_visible: draft.is_visible,
          sort_order: draft.sort_order,
        })
        await loadPages()
        setSelectedId(created.id)
        setDraft((prev) => ({ ...prev, id: created.id, slug: created.slug }))
      } else {
        await api.updatePage(draft.id, {
          title: draft.title,
          slug: draft.slug,
          body: draft.body || '',
          is_visible: draft.is_visible,
          sort_order: draft.sort_order,
        })
        await loadPages()
      }
      onChanged?.()
    } catch (err: any) {
      setError(err.message || 'Não foi possível salvar a página.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (page: SitePage) => {
    try {
      await api.updatePage(page.id, { is_visible: !page.is_visible })
      await loadPages()
      if (draft.id === page.id) setDraft((prev) => ({ ...prev, is_visible: !page.is_visible }))
      onChanged?.()
    } catch (err: any) {
      setError(err.message || 'Não foi possível alterar a visibilidade.')
    }
  }

  const handleDelete = async (page: SitePage) => {
    if (!window.confirm(`Apagar a página “${page.title}”? Esta ação não pode ser desfeita.`)) return
    try {
      await api.deletePage(page.id)
      if (selectedId === page.id) {
        setSelectedId(null)
        setDraft(emptyDraft())
      }
      await loadPages()
      onChanged?.()
    } catch (err: any) {
      setError(err.message || 'Não foi possível apagar a página.')
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,280px)_1fr] gap-6">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-on-surface flex items-center gap-2">
            <Landmark className="w-4 h-4 text-terracotta" />
            <span>Páginas ({pages.length})</span>
          </h4>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={openNew}>
            <FilePlus className="w-3.5 h-3.5" />
            Nova
          </Button>
        </div>

        {loading ? (
          <p className="text-xs text-outline">Carregando páginas…</p>
        ) : (
          <ul className="space-y-2">
            {pages.map((page) => (
              <li key={page.id}>
                <div
                  className={`rounded-xl border px-3 py-2.5 ${
                    selectedId === page.id
                      ? 'border-primary bg-surface-container'
                      : 'border-outline-variant bg-surface-container-low'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button type="button" className="text-left min-w-0" onClick={() => openPage(page)}>
                      <p className="text-sm font-medium text-on-surface truncate">{page.title}</p>
                      <p className="text-[11px] font-mono text-outline truncate">/p/{page.slug}</p>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        title={page.is_visible ? 'Ocultar no rodapé' : 'Exibir no rodapé'}
                        onClick={() => handleToggle(page)}
                        className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high"
                      >
                        {page.is_visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        title="Editar"
                        onClick={() => openPage(page)}
                        className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Apagar"
                        onClick={() => handleDelete(page)}
                        className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6">
        {!selectedId ? (
          <p className="text-sm text-on-surface-variant">
            Selecione uma página à esquerda ou crie uma nova. Páginas visíveis aparecem na coluna Institucional do rodapé.
          </p>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Título"
                value={draft.title}
                onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                required
              />
              <Input
                label="Endereço (slug)"
                value={draft.slug}
                onChange={(e) => setDraft((prev) => ({ ...prev, slug: e.target.value }))}
                placeholder="missao-metodologia"
              />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-on-surface">
                <input
                  type="checkbox"
                  checked={draft.is_visible}
                  onChange={(e) => setDraft((prev) => ({ ...prev, is_visible: e.target.checked }))}
                  className="rounded border-outline-variant"
                />
                Exibir no rodapé
              </label>
              <Input
                label="Ordem"
                type="number"
                className="w-24"
                value={draft.sort_order}
                onChange={(e) => setDraft((prev) => ({ ...prev, sort_order: Number(e.target.value) }))}
              />
            </div>
            <ArticleEditor key={selectedId} value={draft.body || ''} onChange={(body) => setDraft((prev) => ({ ...prev, body }))} />
            {error && <p className="text-xs text-rose-700 dark:text-rose-300">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" variant="primary" loading={saving}>
                Salvar página
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSelectedId(null)
                  setDraft(emptyDraft())
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}
        {error && !selectedId && <p className="text-xs text-rose-700 dark:text-rose-300 mt-4">{error}</p>}
      </div>
    </div>
  )
}
