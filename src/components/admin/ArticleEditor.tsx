import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  RemoveFormatting,
} from 'lucide-react'
import { ArticleBody } from '@/components/document/ArticleBody'
import {
  convertArticle,
  plainToHtml,
  readArticle,
  sanitizeHtml,
  writeArticle,
  type ArticleFormat,
} from '@/lib/article'
import { cn } from '@/lib/utils'

const MODES: { id: ArticleFormat; label: string }[] = [
  { id: 'text', label: 'Texto puro' },
  { id: 'html', label: 'HTML' },
  { id: 'rich', label: 'Editor visual' },
  { id: 'markdown', label: 'Markdown' },
]

const PLACEHOLDERS: Record<Exclude<ArticleFormat, 'rich'>, string> = {
  text: 'Escreva o artigo. Uma linha em branco separa os parágrafos.',
  html: '<h3>Seção</h3>\n<p>Transcrição, análise histórica e contextualização.</p>',
  markdown: '## Seção\n\nParágrafo com **ênfase** e uma lista:\n\n- primeiro registro\n- segundo registro',
}

export function ArticleEditor({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const initial = readArticle(value)
  const [format, setFormat] = useState<ArticleFormat>(initial.format)
  const [source, setSource] = useState(initial.source)
  const onChangeRef = useRef(onChange)
  const emitted = useRef(value)
  onChangeRef.current = onChange

  useEffect(() => {
    const next = writeArticle(format, source)
    if (next === emitted.current) return
    emitted.current = next
    onChangeRef.current(next)
  }, [format, source])

  const selectFormat = (next: ArticleFormat) => {
    if (next === format) return
    setSource(convertArticle(format, source, next))
    setFormat(next)
  }

  const stored = writeArticle(format, source)

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label className="text-xs font-medium text-on-surface-variant">Conteúdo completo</label>
        <div className="flex flex-wrap gap-1 rounded-full bg-surface-container p-1" role="tablist" aria-label="Formato do artigo">
          {MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              role="tab"
              aria-selected={format === mode.id}
              onClick={() => selectFormat(mode.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-label-sm uppercase tracking-wider transition-colors',
                format === mode.id
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              )}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-body-sm text-outline">
        A publicação usa as fontes, os títulos e os espaçamentos do acervo. O formato muda só a forma de escrever.
      </p>

      {format === 'rich' ? (
        <RichEditor source={source} onSource={setSource} />
      ) : (
        <textarea
          rows={8}
          value={source}
          onChange={(event) => setSource(event.target.value)}
          placeholder={PLACEHOLDERS[format]}
          spellCheck={format !== 'html'}
          className={cn(
            'w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-3 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/15',
            format === 'html' || format === 'markdown' ? 'font-mono' : ''
          )}
        />
      )}

      {format !== 'rich' && stored && (
        <div className="rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-4 sm:p-5">
          <p className="text-label-sm uppercase tracking-widest text-outline mb-3">Prévia no acervo</p>
          <ArticleBody stored={stored} />
        </div>
      )}
    </div>
  )
}

function RichEditor({ source, onSource }: { source: string; onSource: (html: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null)
  const internal = useRef(false)
  const savedRange = useRef<Range | null>(null)
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('https://')

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    if (internal.current) {
      internal.current = false
      return
    }
    if (editor.innerHTML !== source) editor.innerHTML = source
  }, [source])

  const publish = () => {
    internal.current = true
    onSource(editorRef.current?.innerHTML || '')
  }

  const command = (name: string, value?: string) => {
    editorRef.current?.focus()
    document.execCommand(name, false, value)
    publish()
  }

  const rememberSelection = () => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    const range = selection.getRangeAt(0)
    if (!editorRef.current?.contains(range.commonAncestorContainer)) return
    savedRange.current = range.cloneRange()
  }

  const applyLink = () => {
    const editor = editorRef.current
    const selection = window.getSelection()
    if (!editor || !selection) return
    editor.focus()
    selection.removeAllRanges()
    if (savedRange.current) selection.addRange(savedRange.current)
    const href = linkUrl.trim()
    if (href) document.execCommand('createLink', false, href)
    setLinkOpen(false)
    publish()
  }

  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-lowest focus-within:ring-2 focus-within:ring-primary/15">
      <div className="flex flex-wrap items-center gap-1 border-b border-outline-variant/70 px-2 py-2">
        <ToolbarButton label="Parágrafo" onClick={() => command('formatBlock', 'p')}>
          <RemoveFormatting className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton label="Título" onClick={() => command('formatBlock', 'h2')}>
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton label="Subtítulo" onClick={() => command('formatBlock', 'h3')}>
          <Heading3 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton label="Negrito" onClick={() => command('bold')}>
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton label="Itálico" onClick={() => command('italic')}>
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton label="Lista" onClick={() => command('insertUnorderedList')}>
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton label="Lista numerada" onClick={() => command('insertOrderedList')}>
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton label="Citação" onClick={() => command('formatBlock', 'blockquote')}>
          <Quote className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Link"
          onClick={() => {
            rememberSelection()
            setLinkOpen((open) => !open)
          }}
        >
          <Link2 className="w-4 h-4" />
        </ToolbarButton>
      </div>
      {linkOpen && (
        <div className="flex items-center gap-2 border-b border-outline-variant/70 px-3 py-2">
          <input
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                applyLink()
              }
            }}
            placeholder="https://"
            aria-label="Endereço do link"
            className="flex-1 bg-transparent text-body-sm text-on-surface placeholder:text-outline focus:outline-none"
          />
          <button type="button" onClick={applyLink} className="text-label-sm uppercase tracking-wider text-terracotta">
            Aplicar
          </button>
        </div>
      )}
      <div
        ref={editorRef}
        className="article-body article-editor px-4 py-3"
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label="Editor visual do artigo"
        data-placeholder="Escreva o artigo. Títulos, ênfase e listas já saem com o estilo do acervo."
        spellCheck
        onInput={publish}
        onPaste={(event) => {
          event.preventDefault()
          const html = event.clipboardData.getData('text/html')
          const text = event.clipboardData.getData('text/plain')
          const inserted = html ? sanitizeHtml(html) : plainToHtml(text)
          if (inserted) document.execCommand('insertHTML', false, inserted)
          publish()
        }}
      />
    </div>
  )
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="w-8 h-8 rounded-full text-on-surface-variant hover:bg-surface-container hover:text-on-surface flex items-center justify-center"
    >
      {children}
    </button>
  )
}
