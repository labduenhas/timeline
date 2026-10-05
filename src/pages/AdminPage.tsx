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
      localStorage.setItem('acervo_admin_token', secret)
      await api.verifySecret(secret)
      setIsAuthenticated(true)
      setToken(secret)
      loadAdminData()
    } catch (err: any) {
      console.error('[Admin verify error]', err)
      setLoginError(err.message || 'Chave de administração incorreta.')
      localStorage.removeItem('acervo_admin_token')
      setIsAuthenticated(false)
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
    if (token) {
      verifyAndLogin(token)
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
        <div className="w-full max-w-md bg-gray-900/90 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl space-y-6 animate-fadeIn">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center mx-auto text-indigo-400">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Painel Administrativo</h2>
            <p className="text-xs text-gray-400">
              Digite o segredo de administração para gerenciar o acervo e fazer uploads
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              verifyAndLogin(secretInput)
            }}
            className="space-y-4"
          >
            <Input
              type="password"
              placeholder="Chave de Acesso (ADMIN_SECRET)"
              value={secretInput}
              onChange={(e) => setSecretInput(e.target.value)}
              error={loginError || undefined}
              required
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

          <p className="text-[11px] text-center text-gray-500 font-mono">
            Chave padrão local: <code>acervo-super-secret-key-2026</code>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Gestão do Acervo
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Autenticado
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
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
        <div className="p-4 rounded-2xl bg-gray-900/80 border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] uppercase tracking-wider font-mono">Documentos</span>
            <FileText className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">
            {stats?.total_documents ?? documents.length}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-gray-900/80 border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] uppercase tracking-wider font-mono">Visualizações</span>
            <Eye className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">
            {stats?.total_views ?? 0}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-gray-900/80 border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] uppercase tracking-wider font-mono">Categorias</span>
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">
            {stats?.total_categories ?? categories.length}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-gray-900/80 border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] uppercase tracking-wider font-mono">Tags Ativas</span>
            <Tag className="w-4 h-4 text-pink-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">
            {stats?.total_tags ?? tags.length}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
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
