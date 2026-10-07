import React, { useState, useEffect } from 'react'
import {
  ShieldCheck,
  Lock,
  PlusCircle,
  Layers,
  BarChart3,
  LogOut,
  FolderPlus,
  Eye,
  FileText,
  Tag,
} from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DocumentTable } from '@/components/admin/DocumentTable'
import { DocumentForm } from '@/components/admin/DocumentForm'
import { CategoryManager } from '@/components/admin/CategoryManager'
import type { DocumentItem, Category, Tag as TagType, AdminStats } from '@/types'

export function AdminPage() {
  const [token, setToken] = useState<string>(() => localStorage.getItem('acervo_admin_token') || '')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [secretInput, setSecretInput] = useState('')
  const [website, setWebsite] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)

  // Admin Data State
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<TagType[]>([])
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'categories'>('list')
  const [editingDoc, setEditingDoc] = useState<any | null>(null)

  const verifyAndLogin = async (secret: string) => {
    setIsVerifying(true)
    setLoginError(null)
    try {
      const session = await api.verifySecret(secret, website)
      const sessionToken = session.token || (session.valid ? secret : '')
      if (!sessionToken) {
        throw Object.assign(new Error('Chave de administração incorreta.'), { status: 401 })
      }
      localStorage.setItem('acervo_admin_token', sessionToken)
      setToken(sessionToken)
      setIsAuthenticated(true)
      setSecretInput('')
      loadAdminData()
    } catch (err: any) {
      console.error('[Admin verify error]', err)
      localStorage.removeItem('acervo_admin_token')
      setToken('')
      setIsAuthenticated(false)
      setLoginError(
        err.status === 429
          ? 'Muitas tentativas. Aguarde alguns minutos.'
          : err.status === 503
            ? 'O painel administrativo não está disponível.'
            : 'Chave de administração incorreta.'
      )
    } finally {
      setIsVerifying(false)
    }
  }

  const loadAdminData = async () => {
    try {
      const [statsRes, docsRes, catRes] = await Promise.all([
        api.getAdminStats().catch(() => null),
        api.getDocuments({ limit: 50 }),
        api.getCategories(),
      ])

      if (statsRes) setStats(statsRes)
      setDocuments(docsRes.items || [])
      setCategories(catRes.categories || [])
      setTags(catRes.tags || [])
    } catch (err) {
      console.error('[loadAdminData error]', err)
    }
  }

  useEffect(() => {
    if (!token) return
    let cancelled = false
    api.getAdminStats()
      .then(() => {
        if (cancelled) return
        setIsAuthenticated(true)
        loadAdminData()
      })
      .catch(() => {
        if (cancelled) return
        localStorage.removeItem('acervo_admin_token')
        setToken('')
        setIsAuthenticated(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('acervo_admin_token')
    setToken('')
    setIsAuthenticated(false)
    setSecretInput('')
  }

  // Login Screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-3xl p-8 backdrop-blur-xl shadow-2xl space-y-6 animate-fadeIn">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-surface-container border border-outline-variant flex items-center justify-center mx-auto text-on-surface">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-bold text-on-surface tracking-tight">Painel Administrativo</h2>
            <p className="text-xs text-outline">
              Digite o segredo de administração para gerenciar o acervo e fazer uploads
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              verifyAndLogin(secretInput)
            }}
            className="relative space-y-4"
          >
            <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
              <label htmlFor="website">Deixe este campo em branco</label>
              <input
                id="website"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>
            <Input
              type="password"
              aria-label="Frase de acesso"
              value={secretInput}
              onChange={(e) => setSecretInput(e.target.value)}
              error={loginError || undefined}
              required
              autoComplete="current-password"
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full py-2.5"
              loading={isVerifying}
            >
              <ShieldCheck className="w-4 h-4 mr-2" />
              Acessar Painel
            </Button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-outline-variant">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
              Gestão do Acervo
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Autenticado
            </span>
          </div>
          <p className="text-xs text-outline mt-1">
            Cadastre, edite e organize registros no Cloudflare D1 e R2
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="gap-2 text-rose-300 hover:text-rose-200 hover:border-rose-500/40"
          >
            <LogOut className="w-4 h-4" />
            <span>Encerrar Sessão</span>
          </Button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/70 space-y-1">
          <div className="flex items-center justify-between text-outline">
            <span className="text-[11px] uppercase tracking-wider font-mono">Documentos</span>
            <FileText className="w-4 h-4 text-terracotta" />
          </div>
          <p className="text-2xl font-bold text-on-surface font-mono">
            {stats?.total_documents ?? documents.length}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/70 space-y-1">
          <div className="flex items-center justify-between text-outline">
            <span className="text-[11px] uppercase tracking-wider font-mono">Visualizações</span>
            <Eye className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-on-surface font-mono">
            {stats?.total_views ?? 0}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/70 space-y-1">
          <div className="flex items-center justify-between text-outline">
            <span className="text-[11px] uppercase tracking-wider font-mono">Categorias</span>
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-on-surface font-mono">
            {stats?.total_categories ?? categories.length}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/70 space-y-1">
          <div className="flex items-center justify-between text-outline">
            <span className="text-[11px] uppercase tracking-wider font-mono">Tags Ativas</span>
            <Tag className="w-4 h-4 text-pink-400" />
          </div>
          <p className="text-2xl font-bold text-on-surface font-mono">
            {stats?.total_tags ?? tags.length}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant pb-3">
        <Button
          variant={activeTab === 'list' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => {
            setActiveTab('list')
            setEditingDoc(null)
          }}
          className="gap-2"
        >
          <Layers className="w-4 h-4" />
          <span>Todos os Documentos</span>
        </Button>

        <Button
          variant={activeTab === 'create' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => {
            setEditingDoc(null)
            setActiveTab('create')
          }}
          className="gap-2"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Novo Documento</span>
        </Button>

        <Button
          variant={activeTab === 'categories' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => {
            setEditingDoc(null)
            setActiveTab('categories')
          }}
          className="gap-2"
        >
          <FolderPlus className="w-4 h-4" />
          <span>Categorias & Tags</span>
        </Button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'list' && (
        <DocumentTable
          documents={documents}
          onEdit={(doc) => {
            setEditingDoc(doc)
            setActiveTab('create')
          }}
          onRefresh={loadAdminData}
        />
      )}

      {activeTab === 'create' && (
        <DocumentForm
          initialData={editingDoc}
          onSaved={() => {
            loadAdminData()
            setActiveTab('list')
            setEditingDoc(null)
          }}
          onCancel={() => {
            setActiveTab('list')
            setEditingDoc(null)
          }}
        />
      )}

      {activeTab === 'categories' && (
        <CategoryManager
          categories={categories}
          tags={tags}
          onRefresh={loadAdminData}
        />
      )}
    </div>
  )
}
