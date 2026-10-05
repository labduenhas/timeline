import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, Calendar, Filter, Sparkles, FolderArchive } from 'lucide-react'
import { api } from '@/lib/api'
import { formatDate, getTypeLabel, getTypeIconEmoji } from '@/lib/utils'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import type { DocumentItem, Category } from '@/types'

export function TimelinePage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedType, setSelectedType] = useState<string>('')

  const loadDocs = async () => {
    setLoading(true)
    try {
      const res = await api.getDocuments({
        page,
        limit: 12,
        search: search || undefined,
        category: selectedCategory || undefined,
        type: selectedType || undefined,
      })
      setDocuments(res.items || [])
      setTotal(res.total || 0)
      setTotalPages(res.total_pages || 1)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    api.getCategories().then((res) => {
      setCategories(res.categories || [])
    }).catch(console.error)
  }, [])

  useEffect(() => {
    loadDocs()
  }, [page, selectedCategory, selectedType])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    loadDocs()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* Page Title & Intro */}
      <div className="space-y-2 text-center max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Explorar Acervo Histórico
        </h1>
        <p className="text-sm text-gray-400">
          Pesquise e consulte todos os registros, documentos oficiais, imagens e mídias raras digitalizadas.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-gray-900/80 border border-white/10 rounded-2xl p-4 sm:p-6 shadow-2xl backdrop-blur-xl space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por palavras-chave, eventos ou personalidades..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-950 border border-gray-700 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <Button type="submit" variant="primary" className="px-6">
            Buscar
          </Button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5 text-xs">
          {/* Category Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-medium">Categoria:</span>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value)
                setPage(1)
              }}
              className="bg-gray-950 border border-gray-700 rounded-lg px-2.5 py-1 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Todas as Categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Type Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-medium">Tipo de Arquivo:</span>
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value)
                setPage(1)
              }}
              className="bg-gray-950 border border-gray-700 rounded-lg px-2.5 py-1 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Todos os Tipos</option>
              <option value="document">Documento Oficial</option>
              <option value="image">Fotografia</option>
              <option value="pdf">PDF</option>
              <option value="txt">Texto / Manuscrito</option>
              <option value="video_url">Vídeo</option>
              <option value="audio">Áudio</option>
            </select>
          </div>

          <span className="text-gray-400 font-mono">
            {total} {total === 1 ? 'resultado' : 'resultados'}
          </span>
        </div>
      </div>

      {/* Grid of Documents */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-gray-900/60 rounded-2xl p-4 border border-white/5 space-y-3">
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="p-12 text-center bg-gray-900/40 border border-white/5 rounded-3xl max-w-lg mx-auto space-y-4">
          <FolderArchive className="w-12 h-12 text-gray-500 mx-auto" />
          <h3 className="text-lg font-bold text-white">Nenhum documento encontrado</h3>
          <p className="text-xs text-gray-400">Tente buscar outros termos ou limpar os filtros de categoria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {documents.map((doc) => (
            <Link
              key={doc.id}
              to={`/doc/${doc.slug}`}
              className="group bg-gray-900/80 border border-white/10 hover:border-indigo-500/50 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="relative h-44 bg-gray-800 overflow-hidden">
                  {doc.thumbnail_url ? (
                    <img
                      src={doc.thumbnail_url}
                      alt={doc.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-4xl opacity-50 bg-gradient-to-b from-white/5 to-white/0">
                      <span>{getTypeIconEmoji(doc.doc_type)}</span>
                      <span className="text-[10px] text-gray-400 font-mono mt-1 uppercase">
                        {doc.doc_type}
                      </span>
                    </div>
                  )}
                  <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] text-white border border-white/10">
                    {getTypeLabel(doc.doc_type)}
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-indigo-400 font-mono">
                    <span>{formatDate(doc.doc_date, doc.date_precision)}</span>
                    {doc.view_count > 0 && (
                      <span className="text-gray-500 text-[11px]">{doc.view_count} views</span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-2 leading-snug">
                    {doc.title}
                  </h3>

                  {doc.description && (
                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                      {doc.description}
                    </p>
                  )}
                </div>
              </div>

              {doc.categories && doc.categories.length > 0 && (
                <div className="px-4 pb-4 pt-1 flex flex-wrap gap-1">
                  {doc.categories.slice(0, 2).map((c) => (
                    <span
                      key={c.slug}
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor: `${c.color}20`,
                        color: c.color,
                        border: `1px solid ${c.color}40`,
                      }}
                    >
                      {c.name}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </Button>
          <span className="text-xs text-gray-400 font-mono px-4">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  )
}
