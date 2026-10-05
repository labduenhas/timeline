import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Edit2, Trash2, Eye, Search, ExternalLink, Star } from 'lucide-react'
import { api } from '@/lib/api'
import { formatDate, getTypeIconEmoji } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import type { DocumentItem } from '@/types'

interface DocumentTableProps {
  documents: DocumentItem[]
  onEdit: (doc: DocumentItem) => void
  onRefresh: () => void
}

export function DocumentTable({ documents, onEdit, onRefresh }: DocumentTableProps) {
  const [search, setSearch] = useState('')
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const filteredDocs = documents.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    (d.author && d.author.toLowerCase().includes(search.toLowerCase())) ||
    d.doc_date.includes(search)
  )

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Tem certeza que deseja remover o documento "${title}" do acervo?`)) {
      return
    }
    setIsDeleting(id)
    try {
      await api.deleteDocument(id)
      onRefresh()
    } catch (err) {
      console.error(err)
      alert('Erro ao excluir documento')
    } finally {
      setIsDeleting(null)
    }
  }

  return (
    <div className="bg-gray-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
      {/* Header bar */}
      <div className="p-4 sm:p-6 border-b border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-base font-bold text-white">Catálogo Geral de Documentos</h4>
          <p className="text-xs text-gray-400">Total de {documents.length} registros cadastrados</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Filtrar por título ou autor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-gray-950 border border-gray-700 rounded-lg text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/5 bg-gray-950/40 text-gray-400 font-mono uppercase text-[10px]">
              <th className="py-3 px-4">Documento</th>
              <th className="py-3 px-4">Data Histórica</th>
              <th className="py-3 px-4">Tipo</th>
              <th className="py-3 px-4">Categorias</th>
              <th className="py-3 px-4 text-center">Visualizações</th>
              <th className="py-3 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredDocs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500">
                  Nenhum documento encontrado.
                </td>
              </tr>
            ) : (
              filteredDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-white/[0.02] transition-colors">
                  {/* Thumbnail & Title */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-800 flex-shrink-0 overflow-hidden flex items-center justify-center border border-white/10">
                        {doc.thumbnail_url ? (
                          <img
                            src={doc.thumbnail_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-lg opacity-60">
                            {getTypeIconEmoji(doc.doc_type)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 max-w-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-white truncate block">
                            {doc.title}
                          </span>
                          {doc.is_featured && (
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />
                          )}
                        </div>
                        {doc.author && (
                          <span className="text-[11px] text-gray-400 truncate block">
                            {doc.author}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Date */}
                  <td className="py-3 px-4 font-mono text-gray-300 whitespace-nowrap">
                    {formatDate(doc.doc_date, doc.date_precision)}
                  </td>

                  {/* Type */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-800 border border-white/10 text-[11px] text-gray-300">
                      <span>{getTypeIconEmoji(doc.doc_type)}</span>
                      <span className="capitalize">{doc.doc_type.replace('_', ' ')}</span>
                    </span>
                  </td>

                  {/* Categories */}
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {doc.categories?.slice(0, 2).map((c) => (
                        <span
                          key={c.slug}
                          className="px-2 py-0.5 rounded text-[10px] font-medium"
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
                  </td>

                  {/* Views */}
                  <td className="py-3 px-4 text-center font-mono text-gray-400">
                    {doc.view_count || 0}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <Link to={`/doc/${doc.slug}`} target="_blank">
                        <Button variant="ghost" size="icon" className="w-7 h-7 text-gray-400 hover:text-white" title="Ver detalhes">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-indigo-400 hover:text-indigo-300"
                        title="Editar"
                        onClick={() => onEdit(doc)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-rose-400 hover:text-rose-300"
                        title="Remover"
                        loading={isDeleting === doc.id}
                        onClick={() => handleDelete(doc.id, doc.title)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
