import Link from 'next/link'
import { ArrowLeft, Church, BookOpen, MapPin, IdCard, Navigation } from 'lucide-react'
import { playfair, jakarta } from './fontes'

export type PaginaEditorialId = 'inicio' | 'historia' | 'cultos' | 'membros'

export function rotasEditorial(basePath: string): Record<PaginaEditorialId, string> {
  return {
    inicio: basePath || '/',
    historia: `${basePath}/historia`,
    cultos: `${basePath}/cultos`,
    membros: `${basePath}/membros`,
  }
}

const NAV: Array<{ id: PaginaEditorialId; label: string; icone: typeof Church }> = [
  { id: 'inicio', label: 'Início', icone: Church },
  { id: 'historia', label: 'História', icone: BookOpen },
  { id: 'cultos', label: 'Cultos', icone: MapPin },
  { id: 'membros', label: 'Membros', icone: IdCard },
]

// Moldura do layout editorial: cabeçalho fixo (logo + nome), navegação inferior no celular
// e no topo no computador. Cores da igreja chegam como variáveis CSS (--ed-*).
export function ShellEditorial({
  nome, subtitulo, logoUrl, basePath, ativo, estilo, previewMode, children,
}: {
  nome: string
  subtitulo: string | null
  logoUrl: string | null
  basePath: string
  ativo: PaginaEditorialId
  estilo: React.CSSProperties
  previewMode?: boolean
  children: React.ReactNode
}) {
  const rotas = rotasEditorial(basePath)

  return (
    <div
      className={`${playfair.variable} ${jakarta.variable} font-editorial-texto min-h-screen bg-[#fff8f6] text-[#201a18] cursor-default caret-transparent`}
      style={estilo}
    >
      {previewMode && (
        <div className="fixed top-0 inset-x-0 z-[60] bg-gray-900 text-white text-xs flex items-center justify-between px-4 py-2.5 gap-3">
          <span className="font-medium">Pré-visualização — isso é como os visitantes veem a página</span>
          <Link href="/admin/site" className="flex items-center gap-1.5 text-gray-300 hover:text-white">
            <ArrowLeft size={13} /> Voltar ao painel
          </Link>
        </div>
      )}

      <header className={`fixed ${previewMode ? 'top-9' : 'top-0'} inset-x-0 z-50 bg-[#fff8f6]/85 backdrop-blur-xl shadow-[0_4px_20px_rgba(43,29,22,0.05)]`}>
        <div className="h-16 max-w-5xl mx-auto px-4 flex items-center justify-between gap-3">
          <Link href={rotas.inicio} className="flex items-center gap-2.5 min-w-0">
            {logoUrl && <img src={logoUrl} alt="" className="h-9 w-9 object-contain rounded-full bg-white shrink-0" />}
            <span className="flex flex-col min-w-0">
              <span className="text-[17px] font-semibold text-[#2B1D16] truncate leading-tight">{nome}</span>
              {subtitulo && <span className="text-[11px] font-semibold tracking-wide uppercase text-[var(--ed-pri-forte)] leading-tight">{subtitulo}</span>}
            </span>
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            {NAV.map(n => (
              <Link
                key={n.id}
                href={rotas[n.id]}
                className={`px-3 py-2 rounded-full text-sm font-semibold transition ${ativo === n.id ? 'bg-[var(--ed-pri-clara)] text-[var(--ed-pri-forte)]' : 'text-[#5a4138] hover:text-[#2B1D16]'}`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <Link
            href={rotas.cultos}
            className="sm:hidden min-h-[44px] px-3 rounded-full bg-[var(--ed-pri-clara)] text-[var(--ed-pri-forte)] flex items-center gap-1.5 text-xs font-bold"
            aria-label="Como chegar"
          >
            <Navigation size={16} /> Como chegar
          </Link>
        </div>
      </header>

      <main className={`${previewMode ? 'pt-[100px]' : 'pt-16'} pb-28 sm:pb-12`}>{children}</main>

      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-[#fff8f6]/90 backdrop-blur-xl shadow-[0_-8px_24px_rgba(43,29,22,0.06)] pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around items-center h-20 px-4 max-w-lg mx-auto">
          {NAV.map(({ id, label, icone: Icone }) => (
            <Link
              key={id}
              href={rotas[id]}
              aria-current={ativo === id ? 'page' : undefined}
              className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] px-2 transition ${ativo === id ? 'text-[var(--ed-pri-forte)] font-bold' : 'text-[#5a4138]'}`}
            >
              <Icone size={24} strokeWidth={ativo === id ? 2.4 : 1.8} />
              <span className="text-xs mt-1">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}

// ── Peças visuais compartilhadas ──

export function TituloSecao({ children, cor = 'var(--ed-pri)', direita }: { children: React.ReactNode; cor?: string; direita?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <span className="w-1 h-5 rounded-full" style={{ backgroundColor: cor }} />
        <h2 className="font-editorial-titulo text-[22px] leading-7 font-semibold text-[#2B1D16]">{children}</h2>
      </div>
      {direita}
    </div>
  )
}

export function Rotulo({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`text-xs font-bold uppercase tracking-[0.08em] ${className}`}>{children}</span>
}

export function HeroGradiente({ children }: { children: React.ReactNode }) {
  return (
    <section
      className="relative w-full overflow-hidden px-5 pt-10 pb-14 shadow-lg"
      style={{ background: 'linear-gradient(to bottom, var(--ed-pri-escura), var(--ed-pri), var(--ed-pri-luz))' }}
    >
      <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-white/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-[#fff8f6] to-transparent pointer-events-none" />
      <div className="relative z-10 flex flex-col items-center text-center max-w-md mx-auto">{children}</div>
    </section>
  )
}
