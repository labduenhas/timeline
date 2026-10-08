import { Link } from 'react-router-dom'
import { Mark } from './Mark'
import { useSite } from '@/context/SiteContext'

export function Footer() {
  const { settings, pages } = useSite()
  const visiblePages = pages.filter((page) => page.is_visible)

  const photo = settings.footer_image_url.trim()

  return (
    <footer className="site-footer relative w-full overflow-hidden border-t border-outline-variant/50 mt-16">
      {photo && (
        <div
          aria-hidden
          className="site-footer-photo absolute inset-0"
          style={{ backgroundImage: `url("${photo.replace(/"/g, '')}")` }}
        />
      )}
      <div className="relative max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-margin-desktop py-10">
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
              <span className="text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">
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
              <span className="text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">
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
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-body-sm text-on-surface-variant">
          <p>
            © {new Date().getFullYear()} {settings.footer_copyright}
          </p>
          <p className="text-right">{settings.footer_credit}</p>
        </div>
      </div>
    </footer>
  )
}
