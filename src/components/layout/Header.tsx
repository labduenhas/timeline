import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { History, Layers, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Header() {
  const location = useLocation()

  const navItems = [
    { label: 'Linha do Tempo', path: '/', icon: History },
    { label: 'Explorar Acervo', path: '/timeline', icon: Layers },
    { label: 'Administração', path: '/admin', icon: ShieldCheck },
  ]

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-gray-950/70 backdrop-blur-xl border-b border-white/10 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
            <History className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white group-hover:text-indigo-300 transition-colors">
              Acervo Timeline
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Cloudflare Free Tier
            </span>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all',
                  isActive
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                )}
              >
                <Icon className={cn('w-4 h-4', isActive ? 'text-indigo-400' : 'text-gray-400')} />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
