import { useEffect, useState } from 'react'
import { Heading, Save, X } from 'lucide-react'
import { FileUploader } from '@/components/admin/FileUploader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { api } from '@/lib/api'
import { clampHeroInterval, DEFAULT_SETTINGS, mergeSettings, parseHeroImages } from '@/lib/siteDefaults'
import type { SiteSettings } from '@/types'

const COPY_KEYS = [
  'home_badge',
  'home_eyebrow',
  'home_title',
  'home_lead',
  'home_search_placeholder',
  'hero_images',
  'hero_interval',
  'hero_kenburns',
  'explore_badge',
  'explore_title',
  'explore_lead',
  'explore_search_placeholder',
] as const

interface PageCopyManagerProps {
  onChanged?: () => void
}

export function PageCopyManager({ onChanged }: PageCopyManagerProps) {
  const [draft, setDraft] = useState<SiteSettings>(DEFAULT_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api
      .getSettings()
      .then((res) => setDraft(mergeSettings(res.settings)))
      .catch((err) => setError(err.message || 'Não foi possível carregar os textos.'))
  }, [])

  const patch = (key: keyof SiteSettings, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const heroImages = parseHeroImages(draft.hero_images)

  const setHeroImages = (urls: string[]) => {
    patch('hero_images', JSON.stringify(urls))
  }

  const appendHeroImage = (url: string) => {
    setDraft((prev) => ({
      ...prev,
      hero_images: JSON.stringify([...parseHeroImages(prev.hero_images), url]),
    }))
    setSaved(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const settings = Object.fromEntries(COPY_KEYS.map((key) => [key, draft[key]]))
    settings.hero_interval = String(clampHeroInterval(draft.hero_interval))
    try {
      const res = await api.updateSettings(settings)
      setDraft(mergeSettings(res.settings))
      setSaved(true)
      onChanged?.()
    } catch (err: any) {
      setError(err.message || 'Não foi possível salvar os textos.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 space-y-4">
        <h4 className="text-sm font-bold text-on-surface flex items-center gap-2">
          <Heading className="w-4 h-4 text-terracotta" />
          Home
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Selo (aparece em maiúsculas)"
            value={draft.home_badge}
            onChange={(e) => patch('home_badge', e.target.value)}
          />
          <Input
            label="Linha ao lado do selo"
            value={draft.home_eyebrow}
            onChange={(e) => patch('home_eyebrow', e.target.value)}
          />
        </div>
        <Input label="Título" value={draft.home_title} onChange={(e) => patch('home_title', e.target.value)} />
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-on-surface-variant">Texto de apoio</label>
          <textarea
            value={draft.home_lead}
            onChange={(e) => patch('home_lead', e.target.value)}
            rows={3}
            className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary"
          />
        </div>
        <Input
          label="Texto de exemplo da busca"
          value={draft.home_search_placeholder}
          onChange={(e) => patch('home_search_placeholder', e.target.value)}
        />
        <div className="space-y-3 border-t border-outline-variant/60 pt-4">
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Paisagem, ideal 1920 × 900 px, com o assunto à direita. O lado esquerdo fica sob o texto.
            Uma imagem permanece fixa. Com mais de uma, elas trocam sozinhas.
          </p>
          <FileUploader
            label="Imagens de fundo da abertura"
            accept="image/png,image/jpeg,image/webp"
            multiple
            onUploaded={(result) => appendHeroImage(result.public_url)}
          />
          {heroImages.length > 0 && (
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {heroImages.map((url, index) => (
                <li key={`${url}-${index}`} className="relative">
                  <img src={url} alt="" className="h-24 w-full rounded-lg object-cover border border-outline-variant grayscale" />
                  <button
                    type="button"
                    aria-label={`Remover imagem ${index + 1}`}
                    onClick={() => setHeroImages(heroImages.filter((_, item) => item !== index))}
                    className="absolute top-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-surface/90 text-on-surface"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Input
            label="Trocar a cada (segundos)"
            type="number"
            min={3}
            max={60}
            value={draft.hero_interval}
            onChange={(e) => patch('hero_interval', e.target.value)}
          />
          <p className="text-xs text-outline leading-relaxed">
            O tempo só é usado quando houver mais de uma imagem. Com o Ken Burns ligado, o zoom de cada foto dura esse mesmo tempo.
          </p>
          <label className="flex items-center gap-2 text-sm text-on-surface">
            <input
              type="checkbox"
              checked={draft.hero_kenburns === '1'}
              onChange={(e) => patch('hero_kenburns', e.target.checked ? '1' : '0')}
              className="rounded border-outline-variant"
            />
            Efeito Ken Burns
          </label>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 space-y-4">
        <h4 className="text-sm font-bold text-on-surface">Explorar acervo</h4>
        <Input
          label="Selo (aparece em maiúsculas)"
          value={draft.explore_badge}
          onChange={(e) => patch('explore_badge', e.target.value)}
        />
        <Input label="Título" value={draft.explore_title} onChange={(e) => patch('explore_title', e.target.value)} />
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-on-surface-variant">Texto de apoio</label>
          <textarea
            value={draft.explore_lead}
            onChange={(e) => patch('explore_lead', e.target.value)}
            rows={3}
            className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary"
          />
        </div>
        <Input
          label="Texto de exemplo da busca"
          value={draft.explore_search_placeholder}
          onChange={(e) => patch('explore_search_placeholder', e.target.value)}
        />
      </div>

      {error && <p className="text-xs text-rose-700 dark:text-rose-300">{error}</p>}
      {saved && <p className="text-xs text-emerald-600">Textos publicados.</p>}
      <Button type="submit" variant="primary" loading={saving} className="gap-2">
        <Save className="w-4 h-4" />
        Salvar textos
      </Button>
    </form>
  )
}
