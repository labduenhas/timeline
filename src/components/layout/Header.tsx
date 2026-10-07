import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Search, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Mark } from './Mark'

const navItems = [
  { label: 'Linha do Tempo', path: '/' },
  { label: 'Explorar Acervo', path: '/timeline' },
]

function scrollToSection(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  const field = el instanceof HTMLInputElement ? el : el.querySelector('input')
  window.setTimeout(() => field?.focus(), 280)
}

export function Header() {
  const location = useLocation()
  const navigate = useNavigate()

  const goToHomeSection = (id: string) => {
    if (location.pathname === '/') {
      scrollToSection(id)
      return
    }
    navigate({ pathname: '/', hash: id })
  }

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-surface/90 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
      <div className="h-16 sm:h-20 max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-margin-desktop flex items-center justify-between gap-3">
        <div className="flex items-center gap-6 min-w-0">
          <Link to="/" className="flex items-center gap-3 group text-left min-w-0">
            <div className="w-9 h-9 shrink-0 rounded bg-primary text-on-primary flex items-center justify-center transition-transform group-hover:scale-105">
              <Mark className="h-[1.65rem] w-[1.65rem]" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-display text-[18px] sm:text-[22px] leading-none tracking-tight text-on-surface truncate">
                Acervo Timeline
              </span>
              <span className="font-medium text-label-sm uppercase tracking-wider text-outline mt-1 hidden sm:block">
                Preservação da Memória & História
              </span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-8 pl-6">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'py-2 text-body-md transition-colors',
                    isActive
                      ? 'text-on-surface border-b-2 border-primary pb-1 font-semibold'
                      : 'text-on-surface-variant hover:text-on-surface'
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            title="Buscar no Acervo"
            onClick={() => goToHomeSection('pesquisa')}
            className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => goToHomeSection('filtros')}
            className="flex items-center gap-1.5 px-3 h-10 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded transition-colors text-body-sm"
          >
            <SlidersHorizontal className="w-[18px] h-[18px]" />
            <span className="hidden xl:inline">Filtros</span>
          </button>
          <div className="h-5 w-px bg-outline-variant mx-1 hidden sm:block" />
          <Link
            to="/admin"
            className="px-3.5 h-9 hidden lg:flex items-center text-label-md font-semibold uppercase tracking-wider text-on-surface border border-outline-variant hover:border-primary hover:bg-surface-container-lowest rounded transition-colors"
          >
            Administração
          </Link>
        </div>
      </div>

      <nav className="lg:hidden flex items-center justify-between gap-3 px-4 pb-3 text-[13px] sm:justify-start sm:gap-6 sm:px-8 sm:text-body-sm">
        {[...navItems, { label: 'Administração', path: '/admin' }].map((item) => {
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'whitespace-nowrap py-1',
                isActive
                  ? 'text-on-surface border-b-2 border-primary font-semibold'
                  : 'text-on-surface-variant'
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
