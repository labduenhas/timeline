import { Link } from 'react-router-dom'
import { Mark } from './Mark'
import { useSite } from '@/context/SiteContext'

export function Footer() {
  const { settings, pages } = useSite()
  const visiblePages = pages.filter((page) => page.is_visible)

  return (
    <footer className="w-full bg-surface-container-low shadow-[0_-1px_6px_rgba(0,0,0,0.02)] mt-16">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-margin-desktop py-10">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 pb-8">
          <div className="max-w-md">
            <div className="flex items-center gap-2 mb-2">
              <Mark className="h-[1.65rem] w-[1.65rem] shrink-0" />
              <span className="font-display text-[22px] text-on-surface">{settings.site_title}</span>
            </div>
            <p className="text-body-sm text-on-surface-variant leading-relaxed">{settings.footer_about}</p>
          </div>
          <div className="flex flex-wrap gap-12 text-body-sm">
            <div className="flex flex-col gap-2.5">
              <span className="text-label-sm uppercase tracking-wider text-outline font-semibold">
                {settings.footer_nav_label}
              </span>
              <Link to="/" className="text-on-surface-variant hover:text-on-surface transition-colors">
                Linha do Tempo
              </Link>
              <Link to="/timeline" className="text-on-surface-variant hover:text-on-surface transition-colors">
                Obras e Documentos
              </Link>
              <Link to="/admin" className="text-on-surface-variant hover:text-on-surface transition-colors">
                Administração
              </Link>
            </div>
            <div className="flex flex-col gap-2.5">
              <span className="text-label-sm uppercase tracking-wider text-outline font-semibold">
                {settings.footer_institutional_label}
              </span>
              {visiblePages.map((page) => (
                <Link
                  key={page.id}
                  to={`/p/${page.slug}`}
                  className="text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  {page.title}
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-body-sm text-outline">
          <p>
            © {new Date().getFullYear()} {settings.footer_copyright}
          </p>
          <p className="text-right">{settings.footer_credit}</p>
        </div>
      </div>
    </footer>
  )
}
