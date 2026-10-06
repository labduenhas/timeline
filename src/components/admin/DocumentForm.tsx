import React, { useState, useEffect } from 'react'
import { Save, AlertCircle, CheckCircle2 } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FileUploader } from './FileUploader'
import type { Category, Tag, DocType, DatePrecision } from '@/types'

interface DocumentFormProps {
  initialData?: any
  onSaved: () => void
  onCancel: () => void
}

export function DocumentForm({ initialData, onSaved, onCancel }: DocumentFormProps) {
  const isEditing = Boolean(initialData?.id)

  const [title, setTitle] = useState(initialData?.title || '')
  const [subtitle, setSubtitle] = useState(initialData?.subtitle || '')
  const [slug, setSlug] = useState(initialData?.slug || '')
  const [docDate, setDocDate] = useState(initialData?.doc_date || '2024-01-01')
  const [datePrecision, setDatePrecision] = useState<DatePrecision>(initialData?.date_precision || 'day')
  const [docType, setDocType] = useState<DocType>(initialData?.doc_type || 'document')
  const [sourceUrl, setSourceUrl] = useState(initialData?.source_url || '')
  const [fileKey, setFileKey] = useState(initialData?.file_key || '')
  const [thumbnailKey, setThumbnailKey] = useState(initialData?.thumbnail_key || '')
  const [coverImageKey, setCoverImageKey] = useState(initialData?.cover_image_key || '')
  const [author, setAuthor] = useState(initialData?.author || '')
  const [publisher, setPublisher] = useState(initialData?.publisher || '')
  const [location, setLocation] = useState(initialData?.location || '')
  const [isPublic, setIsPublic] = useState(initialData?.is_public !== undefined ? Number(initialData.is_public) : 1)
  const [isFeatured, setIsFeatured] = useState(initialData?.is_featured ? 1 : 0)
  const [description, setDescription] = useState(initialData?.description || '')
  const [body, setBody] = useState(initialData?.body || '')

  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialData?.categories?.map((c: any) => c.id || c.slug) || []
  )
  const [selectedTags, setSelectedTags] = useState<string[]>(
    initialData?.tags?.map((t: any) => (typeof t === 'string' ? t : t.slug)) || []
  )

  const [availableCategories, setAvailableCategories] = useState<Category[]>([])
  const [availableTags, setAvailableTags] = useState<Tag[]>([])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    api.getCategories().then((res) => {
      setAvailableCategories(res.categories || [])
      setAvailableTags(res.tags || [])
    }).catch(console.error)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setStatusMsg(null)

    const payload = {
      title,
      subtitle: subtitle || null,
      slug: slug || undefined,
      doc_date: docDate,
      date_precision: datePrecision,
      doc_type: docType,
      source_url: sourceUrl || null,
      file_key: fileKey || null,
      thumbnail_key: thumbnailKey || null,
      cover_image_key: coverImageKey || null,
      author: author || null,
      publisher: publisher || null,
      location: location || null,
      is_public: isPublic,
      is_featured: isFeatured,
      description: description || null,
      body: body || null,
      categories: selectedCategories,
      tags: selectedTags,
    }

    try {
      if (isEditing) {
        await api.updateDocument(initialData.id, payload)
        setStatusMsg({ type: 'success', text: 'Documento atualizado com sucesso!' })
      } else {
        await api.createDocument(payload)
        setStatusMsg({ type: 'success', text: 'Documento criado com sucesso!' })
      }
      setTimeout(() => onSaved(), 1000)
    } catch (err: any) {
      console.error('[DocumentForm submit error]', err)
      setStatusMsg({ type: 'error', text: err.message || 'Falha ao salvar documento.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-outline-variant">
        <div>
          <h3 className="text-lg font-bold text-on-surface">
            {isEditing ? 'Editar Documento Histórico' : 'Novo Documento para o Acervo'}
          </h3>
          <p className="text-xs text-outline">Preencha os metadados para catalogação e visualização na linha do tempo</p>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-3 rounded-xl flex items-center gap-2 text-xs font-medium ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Basic Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Título Principal *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Proclamação da República"
          required
        />
        <Input
          label="Subtítulo ou Complemento"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder="Ex: Edição Histórica do Diário Oficial"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input
          label="Data do Registro (YYYY, YYYY-MM ou YYYY-MM-DD) *"
          value={docDate}
          onChange={(e) => setDocDate(e.target.value)}
          placeholder="1889-11-15"
          required
        />
        <div>
          <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Precisão da Data</label>
          <select
            value={datePrecision}
            onChange={(e) => setDatePrecision(e.target.value as DatePrecision)}
            className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/15"
          >
            <option value="day">Dia Exato (Dia/Mês/Ano)</option>
            <option value="month">Mês e Ano</option>
            <option value="year">Apenas Ano</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Tipo de Mídia / Formato</label>
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value as DocType)}
            className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/15"
          >
            <option value="document">Documento Oficial</option>
            <option value="image">Fotografia / Imagem</option>
            <option value="pdf">Arquivo PDF</option>
            <option value="txt">Manuscrito / Texto</option>
            <option value="video_url">Vídeo (YouTube/Vimeo)</option>
            <option value="video_file">Vídeo (Arquivo R2)</option>
            <option value="audio">Áudio / Registro Sonoro</option>
            <option value="link">Link Web</option>
          </select>
        </div>
      </div>

      {/* External URL or embeds */}
      <Input
        label="URL Externa ou Link do Vídeo (YouTube, etc.)"
        value={sourceUrl}
        onChange={(e) => setSourceUrl(e.target.value)}
        placeholder="https://..."
      />

      {/* Author, Publisher, Location */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input
          label="Autor ou Criador"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Ex: Marechal Deodoro da Fonseca"
        />
        <Input
          label="Editora ou Órgão Emissor"
          value={publisher}
          onChange={(e) => setPublisher(e.target.value)}
          placeholder="Ex: Imprensa Nacional"
        />
        <Input
          label="Localização / Cidade"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Ex: Rio de Janeiro, RJ"
        />
      </div>

      {/* Categories selection */}
      <div>
        <label className="block text-xs font-medium text-on-surface-variant mb-2">Categorias Temáticas</label>
        <div className="flex flex-wrap gap-2">
          {availableCategories.map((c) => {
            const isSelected = selectedCategories.includes(c.id) || selectedCategories.includes(c.slug)
            return (
              <button
                type="button"
                key={c.id}
                onClick={() => toggleCategory(c.id)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                style={{
                  backgroundColor: isSelected ? c.color : `${c.color}15`,
                  color: isSelected ? '#ffffff' : c.color,
                  border: `1px solid ${c.color}${isSelected ? 'ff' : '40'}`,
                }}
              >
                {c.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* File Upload to R2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FileUploader
          label="Arquivo Principal (R2 Storage)"
          onUploaded={(res) => {
            setFileKey(res.file_key)
            if (docType === 'image') setThumbnailKey(res.file_key)
          }}
        />
        <Input
          label="URL ou Chave da Miniatura (Thumbnail)"
          value={thumbnailKey}
          onChange={(e) => setThumbnailKey(e.target.value)}
          placeholder="https://... ou uploads/uuid.webp"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Resumo / Descrição Rápida</label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Breve resumo exibido no hover e no card da timeline..."
          className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-3 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/15"
        />
      </div>

      {/* Rich Body Content */}
      <div>
        <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Conteúdo Completo (HTML / Artigo)</label>
        <textarea
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="<p>Texto detalhado com transcrição, análise histórica e contextualização...</p>"
          className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-3 text-sm text-on-surface font-mono placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/15"
        />
      </div>

      {/* Visibility Toggles */}
      <div className="flex items-center gap-6 pt-2">
        <label className="flex items-center gap-2 cursor-pointer text-xs text-on-surface-variant">
          <input
            type="checkbox"
            checked={isPublic === 1}
            onChange={(e) => setIsPublic(e.target.checked ? 1 : 0)}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
          />
          <span>Publicado (visível no acervo público)</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer text-xs text-on-surface-variant">
          <input
            type="checkbox"
            checked={isFeatured === 1}
            onChange={(e) => setIsFeatured(e.target.checked ? 1 : 0)}
            className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
          />
          <span className="text-terracotta font-medium">Item em Destaque ★</span>
        </label>
      </div>

      {/* Form Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" loading={isSubmitting} className="gap-2">
          <Save className="w-4 h-4" />
          <span>{isEditing ? 'Salvar Alterações' : 'Cadastrar no Acervo'}</span>
        </Button>
      </div>
    </form>
  )
}
