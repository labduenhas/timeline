import { useEffect, useState } from 'react'
import { Landmark, Save } from 'lucide-react'
import { FileUploader } from '@/components/admin/FileUploader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { api } from '@/lib/api'
import { DEFAULT_SETTINGS, mergeSettings } from '@/lib/siteDefaults'
import type { SiteSettings } from '@/types'

interface SiteIdentityManagerProps {
  onChanged?: () => void
}

export function SiteIdentityManager({ onChanged }: SiteIdentityManagerProps) {
  const [draft, setDraft] = useState<SiteSettings>(DEFAULT_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api
      .getSettings()
      .then((res) => setDraft(mergeSettings(res.settings)))
      .catch((err) => setError(err.message || 'Não foi possível carregar o rodapé. A API ainda pode não ter esta rota.'))
  }, [])

  const patch = (key: keyof SiteSettings, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await api.updateSettings(draft)
      setDraft(mergeSettings(res.settings))
      setSaved(true)
      onChanged?.()
    } catch (err: any) {
      setError(err.message || 'Não foi possível salvar as alterações.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 space-y-4">
        <h4 className="text-sm font-bold text-on-surface flex items-center gap-2">
          <Landmark className="w-4 h-4 text-terracotta" />
          Identidade do cabeçalho
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Título do site" value={draft.site_title} onChange={(e) => patch('site_title', e.target.value)} />
          <Input
            label="Subtítulo"
            value={draft.site_subtitle}
            onChange={(e) => patch('site_subtitle', e.target.value)}
          />
        </div>
        <div className="space-y-3">
          <Input
            label="URL do logotipo (opcional)"
            value={draft.logo_url}
            onChange={(e) => patch('logo_url', e.target.value)}
            placeholder="Deixe vazio para o patch padrão"
          />
          <FileUploader
            label="Enviar novo logotipo"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onUploaded={(result) => patch('logo_url', result.public_url)}
          />
          {draft.logo_url && (
            <div className="flex items-center gap-3">
              <img src={draft.logo_url} alt="" className="h-10 w-10 object-contain" />
              <button
                type="button"
                className="text-xs text-outline hover:text-on-surface"
                onClick={() => patch('logo_url', '')}
              >
                Usar logotipo padrão
              </button>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm text-on-surface">
            <input
              type="checkbox"
              checked={draft.logo_invert === '1'}
              onChange={(e) => patch('logo_invert', e.target.checked ? '1' : '0')}
              className="rounded border-outline-variant"
            />
            Inverter logotipo no tema escuro
          </label>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 space-y-4">
        <h4 className="text-sm font-bold text-on-surface">Textos do rodapé</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Rótulo da coluna Navegação"
            value={draft.footer_nav_label}
            onChange={(e) => patch('footer_nav_label', e.target.value)}
          />
          <Input
            label="Rótulo da coluna Institucional"
            value={draft.footer_institutional_label}
            onChange={(e) => patch('footer_institutional_label', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-on-surface-variant">Texto de apresentação</label>
          <textarea
            value={draft.footer_about}
            onChange={(e) => patch('footer_about', e.target.value)}
            rows={4}
            className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary"
          />
        </div>
        <Input
          label="Linha de copyright"
          value={draft.footer_copyright}
          onChange={(e) => patch('footer_copyright', e.target.value)}
        />
        <Input
          label="Linha complementar"
          value={draft.footer_credit}
          onChange={(e) => patch('footer_credit', e.target.value)}
        />
      </div>

      {error && <p className="text-xs text-rose-700 dark:text-rose-300">{error}</p>}
      {saved && <p className="text-xs text-emerald-600">Alterações publicadas.</p>}
      <Button type="submit" variant="primary" loading={saving} className="gap-2">
        <Save className="w-4 h-4" />
        Salvar identidade e rodapé
      </Button>
    </form>
  )
}
