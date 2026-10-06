import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="w-full bg-surface-container-low shadow-[0_-1px_6px_rgba(0,0,0,0.02)] mt-16">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-margin-desktop py-10">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 pb-8">
          <div className="max-w-md">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded bg-primary text-on-primary flex items-center justify-center font-display text-sm">
                A
              </span>
              <span className="font-display text-[22px] text-on-surface">Acervo Timeline</span>
            </div>
            <p className="text-body-sm text-on-surface-variant leading-relaxed">
              Arquivo digital aberto dedicado à documentação, catalogação crítica e conservação preventiva do patrimônio histórico, artístico e cultural.
            </p>
          </div>
          <div className="flex flex-wrap gap-12 text-body-sm">
            <div className="flex flex-col gap-2.5">
              <span className="text-label-sm uppercase tracking-wider text-outline font-semibold">Navegação</span>
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
              <span className="text-label-sm uppercase tracking-wider text-outline font-semibold">Institucional</span>
              <Link to="/" className="text-on-surface-variant hover:text-on-surface transition-colors">
                Missão & Metodologia
              </Link>
              <Link to="/timeline" className="text-on-surface-variant hover:text-on-surface transition-colors">
                Catálogo público
              </Link>
            </div>
          </div>
        </div>
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-body-sm text-outline">
          <p>© {new Date().getFullYear()} Acervo Timeline & Preservação da Memória.</p>
          <p className="text-right">Acesso público para pesquisa e patrimônio cultural.</p>
        </div>
      </div>
    </footer>
  )
}
