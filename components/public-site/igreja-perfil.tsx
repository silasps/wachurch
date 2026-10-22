import Link from 'next/link'
import { ArrowLeft, Clock, MapPin, MessageCircle, Instagram, UserPlus, Mail, Phone, Youtube, Facebook, UserRound } from 'lucide-react'
import { coresDoSite, corDeTexto } from '@/lib/cores'
import type { SiteConfig, SitePost } from '@/types'
import TextoFormatado from './texto-formatado'

interface Props {
  siteConfig: SiteConfig
  posts: SitePost[]
  orgNome: string
  /** Licença inclui o módulo social → mostra a aba "Projeto social" */
  temProjetoSocial: boolean
  previewMode?: boolean
  /** Prefixo dos links internos (/cadastro, /privacidade) quando a página não está no host do tenant */
  baseUrl?: string
}

const soDigitos = (v: string) => v.replace(/\D/g, '')

function linkWhatsapp(numero?: string) {
  const d = soDigitos(numero ?? '')
  if (d.length < 10) return null
  return `https://wa.me/${d.length <= 11 ? `55${d}` : d}`
}

function linkRede(valor: string | undefined, base: string) {
  if (!valor?.trim()) return null
  return /^https?:\/\//.test(valor) ? valor : `${base}${valor.replace(/^@/, '')}`
}

// Página pública da igreja no formato de perfil (capa, foto, bio, botões e abas)
export default function IgrejaPerfil({ siteConfig: c, posts, orgNome, temProjetoSocial, previewMode, baseUrl = '' }: Props) {
  const escuro = c.tema === 'escuro'
  const cores = coresDoSite(c)
  // Escuro: cor exata da marca (contrasta com o fundo preto). Claro: tom ajustado para texto branco
  const cor = escuro ? cores.marca : cores.primary
  const textoSobreCor = corDeTexto(cor)
  const nome = c.hero_titulo || orgNome
  const end = c.endereco ?? {}
  const enderecoTexto = [
    [end.logradouro, end.numero].filter(Boolean).join(', '), end.complemento, end.bairro,
    [end.cidade, end.uf].filter(Boolean).join(' - '), end.cep,
  ].filter(Boolean).join(' · ') || c.contato?.endereco || ''
  const mapa = enderecoTexto ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${nome} ${enderecoTexto}`)}` : null
  const whatsapp = linkWhatsapp(c.contato?.whatsapp)
  const instagram = linkRede(c.redes_sociais?.instagram, 'https://instagram.com/')
  const youtube = linkRede(c.redes_sociais?.youtube, 'https://youtube.com/@')
  const facebook = linkRede(c.redes_sociais?.facebook, 'https://facebook.com/')
  const horarios = (c.horarios ?? []).filter(h => h.dia || h.hora)
  const lideranca = (c.lideranca ?? []).filter(l => l.nome)
  const projetos = temProjetoSocial ? posts.filter(p => p.categoria === 'projeto' || p.categoria === 'noticia') : []

  const abas = [
    { id: 'inicio', label: 'Início' },
    ...(c.historia ? [{ id: 'historia', label: 'História' }] : []),
    ...(projetos.length ? [{ id: 'projeto', label: 'Projeto social' }] : []),
    { id: 'contato', label: 'Contato' },
  ]

  return (
    <div className={`min-h-screen bg-gray-50 escuro:bg-neutral-950 cursor-default caret-transparent${escuro ? ' tema-escuro' : ''}${previewMode ? ' pt-9' : ''}`}>
      {previewMode && (
        <div className="fixed top-0 inset-x-0 z-50 bg-gray-900 text-white text-xs flex items-center justify-between px-4 py-2.5 gap-3">
          <span className="font-medium">Pré-visualização — isso é como os visitantes veem a página</span>
          <Link href="/admin/site" className="flex items-center gap-1.5 text-gray-300 hover:text-white">
            <ArrowLeft size={13} /> Voltar ao painel
          </Link>
        </div>
      )}

      {/* Capa + perfil */}
      <header className="bg-white escuro:bg-neutral-900">
        <div
          className="h-40 sm:h-64 bg-cover bg-center"
          style={c.capa_url ? { backgroundImage: `url(${c.capa_url})` } : { background: `linear-gradient(135deg, ${cor}, ${cor}cc)` }}
        />
        <div className="max-w-3xl mx-auto px-4 pt-4 pb-5">
          {/* Logo ao lado do nome (sem sobrepor a capa) */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-full border border-gray-200 escuro:border-neutral-700 bg-white overflow-hidden flex items-center justify-center">
              {c.logo_url
                ? <img src={c.logo_url} alt={nome} className="w-full h-full object-contain p-1" />
                : <span className="text-3xl font-bold" style={{ color: cor }}>{nome.charAt(0)}</span>}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900 escuro:text-white leading-tight">{nome}</h1>
              {(c.denominacao || c.ano_fundacao) && (
                <p className="text-sm text-gray-500 escuro:text-neutral-400 mt-0.5">
                  {[c.denominacao, c.ano_fundacao && `desde ${c.ano_fundacao}`].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </div>
          {(c.bio || c.hero_subtitulo) && <p className="text-base text-gray-700 escuro:text-neutral-300 mt-3">{c.bio || c.hero_subtitulo}</p>}

          <div className="flex flex-wrap gap-2 mt-4">
            <Link href={`${baseUrl}/cadastro`} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: cor, color: textoSobreCor }}>
              <UserPlus size={16} /> Cadastro de membros
            </Link>
            {whatsapp && <Acao href={whatsapp} icone={<MessageCircle size={16} />}>WhatsApp</Acao>}
            {instagram && <Acao href={instagram} icone={<Instagram size={16} />}>Instagram</Acao>}
            {mapa && <Acao href={mapa} icone={<MapPin size={16} />}>Como chegar</Acao>}
          </div>
        </div>

        {/* Abas (âncoras — sem JS) */}
        <nav className="sticky top-0 z-30 bg-white escuro:bg-neutral-900 border-y border-gray-200 escuro:border-neutral-800">
          <div className="max-w-3xl mx-auto px-4 flex gap-6 overflow-x-auto">
            {abas.map(a => (
              <a key={a.id} href={`#${a.id}`} className="shrink-0 py-3 text-sm font-semibold text-gray-600 escuro:text-neutral-400 hover:text-gray-900 escuro:hover:text-white border-b-2 border-transparent hover:border-gray-300 escuro:hover:border-neutral-600">
                {a.label}
              </a>
            ))}
          </div>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <section id="inicio" className="space-y-6 scroll-mt-14">
          {horarios.length > 0 && (
            <Card titulo="Horários de culto" icone={<Clock size={18} style={{ color: cor }} />}>
              <ul className="divide-y divide-gray-100 escuro:divide-neutral-800">
                {horarios.map((h, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                    <span>
                      <span className="block font-medium text-gray-900 escuro:text-white">{h.nome || 'Culto'}</span>
                      <span className="block text-sm text-gray-500 escuro:text-neutral-400">{h.dia}</span>
                    </span>
                    <span className="text-lg font-semibold" style={{ color: cor }}>{h.hora}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {enderecoTexto && (
            <Card titulo="Onde estamos" icone={<MapPin size={18} style={{ color: cor }} />}>
              <p className="text-gray-700 escuro:text-neutral-300">{enderecoTexto}</p>
              {mapa && (
                <a href={mapa} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 text-sm font-semibold" style={{ color: cor }}>
                  Abrir no mapa →
                </a>
              )}
            </Card>
          )}

          {c.sobre_texto && (
            <Card titulo={c.sobre_titulo || 'Quem somos'}>
              <TextoFormatado texto={c.sobre_texto} cor={cor} />
            </Card>
          )}

          {c.missao && !c.historia && (
            <Card titulo="Nossa missão">
              <p className="font-serif text-xl leading-relaxed text-gray-900 escuro:text-white">{c.missao}</p>
            </Card>
          )}

          {lideranca.length > 0 && (
            <Card titulo="Liderança">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {lideranca.map((l, i) => (
                  <div key={i} className="text-center">
                    <div className="w-20 h-20 mx-auto rounded-full bg-gray-100 escuro:bg-neutral-800 overflow-hidden flex items-center justify-center">
                      {l.foto_url ? <img src={l.foto_url} alt={l.nome} className="w-full h-full object-cover" /> : <UserRound size={32} className="text-gray-300" />}
                    </div>
                    <p className="mt-2 font-medium text-gray-900 escuro:text-white text-sm">{l.nome}</p>
                    {l.cargo && <p className="text-xs text-gray-500 escuro:text-neutral-400">{l.cargo}</p>}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </section>

        {c.historia && (
          <section id="historia" className="scroll-mt-14 bg-white escuro:bg-neutral-900 rounded-2xl border border-gray-200 escuro:border-neutral-800 overflow-hidden">
            <div className="h-1.5" style={{ backgroundColor: cor }} />
            <div className="px-6 py-8 sm:px-12 sm:py-12">
              <div className="max-w-2xl mx-auto">
                <p className="mb-6 text-xs font-bold uppercase tracking-[0.2em]" style={{ color: cor }}>
                  Nossa história{c.ano_fundacao ? <span className="text-gray-400 escuro:text-neutral-500 font-medium"> · desde {c.ano_fundacao}</span> : null}
                </p>
                <TextoFormatado texto={c.historia} cor={cor} primeiroComoLead />
                {c.missao && (
                  <div className="mt-10 rounded-2xl p-6 sm:p-8 text-center" style={{ backgroundColor: `${cor}10` }}>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] mb-3" style={{ color: cor }}>Nossa missão</p>
                    <p className="font-serif text-xl sm:text-2xl leading-relaxed text-gray-900 escuro:text-white">{c.missao}</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {projetos.length > 0 && (
          <section id="projeto" className="scroll-mt-14">
            <Card titulo="Projeto social">
              <div className="grid sm:grid-cols-2 gap-4">
                {projetos.map(p => (
                  <article key={p.id} className="rounded-xl border border-gray-100 escuro:border-neutral-800 overflow-hidden">
                    {p.imagem_url && <img src={p.imagem_url} alt="" className="w-full h-40 object-cover" />}
                    <div className="p-3">
                      <p className="font-semibold text-gray-900 escuro:text-white">{p.titulo}</p>
                      {p.conteudo && <p className="text-sm text-gray-600 escuro:text-neutral-400 mt-1 line-clamp-3">{p.conteudo}</p>}
                    </div>
                  </article>
                ))}
              </div>
            </Card>
          </section>
        )}

        <section id="contato" className="scroll-mt-14">
          <Card titulo="Contato">
            <div className="space-y-2 text-gray-700 escuro:text-neutral-300">
              {c.contato?.telefone && <p className="flex items-center gap-2"><Phone size={16} className="text-gray-400 escuro:text-neutral-500" /> {c.contato.telefone}</p>}
              {c.contato?.email && <p className="flex items-center gap-2"><Mail size={16} className="text-gray-400 escuro:text-neutral-500" /> {c.contato.email}</p>}
              <div className="flex gap-3 pt-1">
                {instagram && <a href={instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-gray-500 escuro:text-neutral-400 hover:text-gray-900 escuro:hover:text-white"><Instagram size={22} /></a>}
                {youtube && <a href={youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="text-gray-500 escuro:text-neutral-400 hover:text-gray-900 escuro:hover:text-white"><Youtube size={22} /></a>}
                {facebook && <a href={facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-gray-500 escuro:text-neutral-400 hover:text-gray-900 escuro:hover:text-white"><Facebook size={22} /></a>}
              </div>
            </div>
          </Card>
        </section>

        <p className="text-center text-xs text-gray-400 escuro:text-neutral-500 py-4">
          <Link href={`${baseUrl}/privacidade`} className="underline">Privacidade</Link> · Feito com Ostrick Social
        </p>
      </main>
    </div>
  )
}

function Card({ titulo, icone, children }: { titulo: string; icone?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white escuro:bg-neutral-900 rounded-2xl border border-gray-200 escuro:border-neutral-800 p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 escuro:text-white mb-3">{icone}{titulo}</h2>
      {children}
    </div>
  )
}

function Acao({ href, icone, children }: { href: string; icone: React.ReactNode; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-800 escuro:text-neutral-200 bg-gray-100 escuro:bg-neutral-800 hover:bg-gray-200 escuro:hover:bg-neutral-700">
      {icone}{children}
    </a>
  )
}
