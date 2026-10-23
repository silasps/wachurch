import Link from 'next/link'
import {
  MapPin, ArrowUpRight, ArrowRight, Clock, CalendarPlus, Quote, HandHeart, UserRound, Sun, ScrollText,
  House, Facebook, Instagram, Youtube, MessageCircle, Phone, Mail, ShieldCheck, Coffee, HeartHandshake, UserCheck,
} from 'lucide-react'
import { createServiceClient } from '@/lib/supabase-server'
import { getSiteConfig } from '@/lib/tenant'
import { getMembresiaConfig } from '@/lib/membros-server'
import { CAMINHOS_INGRESSO, TEXTOS_PADRAO_INGRESSO, textoIngresso, type MembresiaConfigPublica } from '@/lib/membros'
import { clarear, coresDoSite, escurecer, paraTextoBranco } from '@/lib/cores'
import {
  cidadeUf, cultosComProximaData, enderecoTexto, linkRede, linkWhatsapp, mapaEmbedUrl, mapaUrl, type CultoInfo,
} from '@/lib/site-igreja'
import { Inline, parseTexto } from '../texto-formatado'
import { HeroGradiente, Rotulo, ShellEditorial, TituloSecao, rotasEditorial, type PaginaEditorialId } from './shell'
import type { Organization, SiteConfig, SiteGaleria } from '@/types'

interface Ctx {
  c: SiteConfig
  nome: string
  nomeCurto: string
  rotas: ReturnType<typeof rotasEditorial>
  cadastro: (tipo?: 'quer_ser_membro' | 'ja_membro') => string
  privacidade: string
  cultos: CultoInfo[]
  endereco: string
  mapa: string | null
  mapaEmbed: string | null
  galeria: SiteGaleria[]
  membresia: MembresiaConfigPublica
}

// Carrega os dados e renderiza uma página do layout editorial (usada por /, /historia, /cultos, /membros
// no host da igreja e por /s/<slug>/… em qualquer host)
export default async function PaginaEditorial({ org, pagina, basePath, previewMode }: {
  org: Organization
  pagina: PaginaEditorialId
  basePath: string
  previewMode?: boolean
}) {
  const supabase = await createServiceClient()
  const [c, { data: galeria }, membresia] = await Promise.all([
    getSiteConfig(org.id),
    supabase.from('site_galeria').select('*').eq('org_id', org.id).order('created_at', { ascending: false }).limit(6),
    getMembresiaConfig(org.id),
  ])
  if (!c) return null

  const marca = coresDoSite(c).marca
  const estilo = {
    '--ed-pri': marca,
    '--ed-pri-forte': paraTextoBranco(marca),
    '--ed-pri-clara': clarear(marca, 0.82),
    '--ed-pri-escura': escurecer(marca, 0.14),
    '--ed-pri-luz': clarear(marca, 0.12),
  } as React.CSSProperties

  const nome = c.hero_titulo || org.nome
  const endereco = enderecoTexto(c)
  const rotas = rotasEditorial(basePath)
  const ctx: Ctx = {
    c,
    nome,
    nomeCurto: c.nome_curto?.trim() || nome.split(' - ')[0],
    rotas,
    cadastro: tipo => `${basePath}/cadastro${tipo ? `?tipo=${tipo}` : ''}`,
    privacidade: `${basePath}/privacidade`,
    cultos: cultosComProximaData(c.horarios ?? [], nome, endereco),
    endereco,
    mapa: mapaUrl(nome, endereco),
    mapaEmbed: mapaEmbedUrl(endereco),
    galeria: (galeria ?? []) as SiteGaleria[],
    membresia,
  }
  const subtitulo = [c.nome_curto, c.ano_fundacao && `desde ${c.ano_fundacao}`].filter(Boolean).join(' · ') || c.denominacao

  return (
    <ShellEditorial nome={nome} subtitulo={subtitulo} logoUrl={c.logo_url} basePath={basePath} ativo={pagina} estilo={estilo} previewMode={previewMode}>
      {pagina === 'inicio' && <Inicio ctx={ctx} />}
      {pagina === 'historia' && <Historia ctx={ctx} />}
      {pagina === 'cultos' && <Cultos ctx={ctx} />}
      {pagina === 'membros' && <Membros ctx={ctx} />}
      <Rodape ctx={ctx} />
    </ShellEditorial>
  )
}

// ── Início ──

function Inicio({ ctx }: { ctx: Ctx }) {
  const { c } = ctx
  const blocos = c.historia ? parseTexto(c.historia) : []
  const frase = blocos.find(b => b.tipo === 'destaque')
  const lideres = (c.lideranca ?? []).filter(l => l.nome)
  const selo = [c.denominacao, c.ano_fundacao && `desde ${c.ano_fundacao}`].filter(Boolean).join(' · ')

  return (
    <>
      <HeroGradiente>
        {selo && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-md mb-6">
            <span className="w-2 h-2 rounded-full bg-[var(--ed-pri-clara)] animate-pulse" />
            <Rotulo className="text-white">{selo}</Rotulo>
          </div>
        )}
        <Marca ctx={ctx} />
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--ed-pri-clara)] mb-3">
          {c.boas_vindas?.trim() || 'Aqui há lugar para você'}
        </p>
        {(c.slogan || c.bio) && (
          <h1 className="font-editorial-titulo italic text-[30px] leading-[38px] text-white max-w-sm mb-8 drop-shadow-sm">
            “{(c.slogan || c.bio)!.trim()}”
          </h1>
        )}
        <div className="w-full max-w-xs flex flex-col gap-3">
          {c.historia && <BotaoHero href={ctx.rotas.historia}>Conheça a {ctx.nomeCurto}</BotaoHero>}
          <BotaoHero href={ctx.cadastro('quer_ser_membro')} destaque>Quero ser membro</BotaoHero>
          <BotaoHero href={ctx.cadastro('ja_membro')} translucido>Já sou membro</BotaoHero>
        </div>
      </HeroGradiente>

      <div className="max-w-2xl mx-auto px-5">
        {ctx.endereco && (
          <section className="-mt-4 relative z-20">
            <div className="bg-white rounded-xl p-4 shadow-md flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-full bg-[var(--ed-pri-clara)] text-[var(--ed-pri-forte)] flex items-center justify-center shrink-0">
                  <MapPin size={22} fill="currentColor" strokeWidth={1.5} className="text-[var(--ed-pri-forte)]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <Rotulo className="text-[#5a4138]">{ctx.nome}</Rotulo>
                  <span className="text-sm text-[#2B1D16] font-medium truncate">{cidadeUf(c) || ctx.endereco}</span>
                </div>
              </div>
              {ctx.mapa && (
                <a href={ctx.mapa} target="_blank" rel="noopener noreferrer" className="shrink-0 h-10 px-3.5 rounded-full bg-[var(--ed-pri-forte)] text-white text-xs font-semibold flex items-center gap-1 shadow-sm">
                  Como chegar <ArrowUpRight size={15} />
                </a>
              )}
            </div>
          </section>
        )}

        {ctx.cultos.length > 0 && (
          <section className="mt-8">
            <TituloSecao direita={<Rotulo className="text-[var(--ed-pri-forte)]">Semanal</Rotulo>}>Próximos cultos</TituloSecao>
            <ListaCultos cultos={ctx.cultos} />
          </section>
        )}

        {(frase || c.missao) && (
          <section className="mt-8">
            <div className="relative bg-gradient-to-r from-[#d6c5a4]/40 via-[#f7ebe8] to-[var(--ed-pri-clara)]/60 rounded-xl p-5 shadow-sm overflow-hidden">
              <Quote size={96} className="absolute -right-2 -bottom-6 text-[var(--ed-pri)]/10 pointer-events-none" />
              <p className="font-editorial-titulo italic text-2xl leading-9 text-[#2B1D16] mb-2 relative">
                “{frase && frase.tipo === 'destaque' ? frase.texto : c.missao}”
              </p>
              <Rotulo className="text-[var(--ed-pri-forte)] relative">{ctx.nomeCurto}</Rotulo>
            </div>
          </section>
        )}

        {lideres.length > 0 && (
          <section className="mt-8">
            <TituloSecao cor="#984350">Liderança pastoral</TituloSecao>
            <div className="bg-white rounded-xl p-5 shadow-md flex flex-col gap-4">
              {lideres.map((l, i) => (
                <div key={i} className={i > 0 ? 'pt-4 border-t border-[#f1e6e2]' : ''}>
                  <div className="flex items-center gap-4">
                    <Avatar url={l.foto_url} nome={l.nome} />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xl font-bold text-[#2B1D16] leading-tight truncate">{l.nome}</span>
                      {l.cargo && <Rotulo className="text-[#984350] mt-0.5">{l.cargo}</Rotulo>}
                    </div>
                  </div>
                  {l.mensagem && <p className="mt-3 text-sm leading-relaxed text-[#201a18]">“{l.mensagem}”</p>}
                </div>
              ))}
              {c.historia && (
                <Link href={ctx.rotas.historia} className="text-xs font-bold text-[var(--ed-pri-forte)] flex items-center gap-1 hover:underline">
                  Conheça nossa história <ArrowRight size={15} />
                </Link>
              )}
            </div>
          </section>
        )}

        {ctx.galeria.length > 0 && (
          <section className="mt-8">
            <TituloSecao>Vida em comunidade</TituloSecao>
            <div className="grid grid-cols-2 gap-3">
              {ctx.galeria.slice(0, 4).map(g => (
                <div key={g.id} className="relative rounded-xl overflow-hidden shadow-sm aspect-[4/3] bg-[#f1e6e2]">
                  <img src={g.imagem_url} alt={g.titulo ?? ''} className="w-full h-full object-cover" loading="lazy" />
                  {g.titulo && (
                    <div className="absolute inset-0 bg-gradient-to-t from-[#2B1D16]/80 via-transparent to-transparent flex items-end p-2.5">
                      <span className="text-xs text-white font-semibold">{g.titulo}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <OndeEstamos ctx={ctx} />
      </div>
    </>
  )
}

// ── História ──

type Item =
  | { tipo: 'artigo'; rotulo?: string; blocos: ReturnType<typeof parseTexto> }
  | { tipo: 'destaque'; texto: string }

function Historia({ ctx }: { ctx: Ctx }) {
  const { c } = ctx
  const blocos = c.historia ? parseTexto(c.historia) : []
  const titulo = blocos.find(b => b.tipo === 'titulo' && b.nivel === 1)

  // Agrupa o texto em capítulos: "## Subtítulo" abre um capítulo; parágrafos em negrito viram citações
  const itens: Item[] = []
  for (const b of blocos) {
    if (b === titulo) continue
    if (b.tipo === 'destaque') { itens.push({ tipo: 'destaque', texto: b.texto }); continue }
    if (b.tipo === 'titulo') { itens.push({ tipo: 'artigo', rotulo: b.texto, blocos: [] }); continue }
    const ultimo = itens[itens.length - 1]
    if (ultimo?.tipo === 'artigo') ultimo.blocos.push(b)
    else itens.push({ tipo: 'artigo', blocos: [b] })
  }
  const fechamento = itens[itens.length - 1]?.tipo === 'destaque' ? (itens.pop() as { texto: string }).texto : null
  const imagem = ctx.galeria[0]?.imagem_url || c.capa_url
  const anos = c.ano_fundacao ? new Date().getFullYear() - c.ano_fundacao : null
  let primeiroArtigo = true

  return (
    <>
      <HeroGradiente>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md mb-4">
          <Sun size={16} className="text-[var(--ed-pri-clara)]" />
          <Rotulo className="text-[var(--ed-pri-clara)]">Nossa história{c.ano_fundacao ? ` · desde ${c.ano_fundacao}` : ''}</Rotulo>
        </div>
        <h1 className="font-editorial-titulo text-[30px] leading-[38px] font-bold text-white mb-3">
          {titulo && titulo.tipo === 'titulo' ? titulo.texto : 'Nossa história'}
        </h1>
        {(c.slogan || c.bio) && <p className="text-base text-white/90 max-w-xs leading-relaxed">{c.slogan || c.bio}</p>}
      </HeroGradiente>

      <div className="max-w-2xl mx-auto px-5 py-6 flex flex-col gap-6">
        {anos !== null && anos > 0 && (
          <div className="p-5 rounded-xl bg-[#fdf1ed] shadow-sm flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--ed-pri-clara)] text-[var(--ed-pri-forte)] flex items-center justify-center shrink-0">
              <ScrollText size={26} />
            </div>
            <div className="flex flex-col">
              <Rotulo className="text-[var(--ed-pri-forte)]">Memória &amp; legado</Rotulo>
              <p className="text-base font-medium leading-snug mt-0.5">
                {anos} {anos === 1 ? 'ano' : 'anos'} de caminhada{cidadeUf(c) ? ` em ${c.endereco?.cidade}` : ''}, desde {c.ano_fundacao}.
              </p>
            </div>
          </div>
        )}

        {!c.historia && <p className="text-center text-[#5a4138]">A história da igreja ainda não foi publicada.</p>}

        {itens.map((item, i) => {
          if (item.tipo === 'destaque') {
            return (
              <div key={i} className="relative p-6 rounded-xl bg-[#FBF8F3] shadow-sm overflow-hidden">
                <Quote size={90} className="absolute -right-2 -bottom-5 text-[#e2bfb2]/40 pointer-events-none" />
                <blockquote className="relative font-editorial-titulo italic text-2xl leading-9 text-[#2B1D16]">
                  “<Inline texto={item.texto} />”
                </blockquote>
              </div>
            )
          }
          const comImagem = primeiroArtigo && imagem
          primeiroArtigo = false
          return (
            <article key={i} className="p-6 rounded-xl bg-white shadow-sm flex flex-col gap-4">
              {item.rotulo && (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: i % 2 ? '#984350' : 'var(--ed-pri)' }} />
                  <Rotulo className="text-[#8e7166]">{item.rotulo}</Rotulo>
                </div>
              )}
              {item.blocos.map((b, j) =>
                b.tipo === 'lista' ? (
                  <ul key={j} className="space-y-2">
                    {b.itens.map((it, k) => (
                      <li key={k} className="flex gap-3 text-base leading-relaxed text-[#5a4138]">
                        <span className="mt-2.5 w-1.5 h-1.5 rounded-full shrink-0 bg-[var(--ed-pri)]" /><span><Inline texto={it} /></span>
                      </li>
                    ))}
                  </ul>
                ) : b.tipo === 'titulo' ? null : (
                  <p key={j} className={`text-base leading-relaxed ${j === 0 ? 'text-[#201a18]' : 'text-[#5a4138]'}`}>
                    <Inline texto={b.tipo === 'paragrafo' ? b.texto : ''} />
                  </p>
                )
              )}
              {comImagem && (
                <div className="relative overflow-hidden rounded-lg mt-1">
                  <img src={imagem} alt="" className="w-full h-48 object-cover rounded-lg" loading="lazy" />
                  {cidadeUf(c) && (
                    <div className="absolute inset-0 bg-gradient-to-t from-[#2B1D16]/70 via-transparent to-transparent flex items-end p-3">
                      <p className="text-xs text-white flex items-center gap-1.5"><MapPin size={14} />{[c.endereco?.bairro, cidadeUf(c)].filter(Boolean).join(' · ')}</p>
                    </div>
                  )}
                </div>
              )}
            </article>
          )
        })}

        {c.missao && (
          <div className="p-6 rounded-xl bg-gradient-to-br from-[#f7ebe8] via-[#f1e6e2] to-[#ebe0dc] shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-2 text-[var(--ed-pri-forte)]">
              <HandHeart size={20} /><Rotulo>Nossa missão</Rotulo>
            </div>
            <div className="px-4 py-3 rounded-lg bg-white shadow-sm">
              <p className="text-lg font-bold text-center text-[var(--ed-pri-forte)]">{c.missao}</p>
            </div>
          </div>
        )}

        {(c.lideranca ?? []).filter(l => l.nome).length > 0 && (
          <section className="flex flex-col gap-3">
            <Rotulo className="text-[#8e7166] px-1">Liderança</Rotulo>
            {c.lideranca.filter(l => l.nome).map((l, i) => (
              <div key={i} className="p-5 rounded-xl bg-white shadow-sm">
                <div className="flex items-center gap-4">
                  <Avatar url={l.foto_url} nome={l.nome} />
                  <div className="flex flex-col min-w-0">
                    {l.cargo && <Rotulo className="text-[#984350]">{l.cargo}</Rotulo>}
                    <h2 className="text-xl font-bold leading-tight mt-0.5">{l.nome}</h2>
                  </div>
                </div>
                {l.mensagem && <p className="mt-3 text-sm leading-relaxed text-[#5a4138]">“{l.mensagem}”</p>}
              </div>
            ))}
          </section>
        )}

        <div className="relative overflow-hidden p-6 rounded-xl bg-[#1a1513]/90 text-white shadow-lg flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--ed-pri)]" />
            <Rotulo className="text-[var(--ed-pri-clara)]">{ctx.nomeCurto} · faça parte</Rotulo>
          </div>
          <blockquote className="text-lg leading-relaxed text-[#fff8f6]">
            {fechamento ? <>“<Inline texto={fechamento} />”</> : 'Venha conhecer de perto e fazer parte desta família.'}
          </blockquote>
          <div className="flex flex-col gap-2.5 pt-2">
            <Link href={ctx.cadastro('quer_ser_membro')} className="w-full h-12 rounded-lg bg-white text-[var(--ed-pri-forte)] text-sm font-bold tracking-wider uppercase flex items-center justify-center gap-2 shadow-sm">
              Quero ser membro <ArrowRight size={18} />
            </Link>
            <Link href={ctx.rotas.cultos} className="w-full h-12 rounded-lg bg-white/15 text-white text-sm font-bold tracking-wider uppercase flex items-center justify-center backdrop-blur-md">
              Nossos cultos &amp; endereço
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Cultos & onde estamos ──

function Cultos({ ctx }: { ctx: Ctx }) {
  const { c } = ctx
  const whatsapp = linkWhatsapp(c.contato?.whatsapp)
  const contatos = [
    whatsapp && { href: whatsapp, icone: MessageCircle, label: 'WhatsApp' },
    c.contato?.telefone && { href: `tel:${c.contato.telefone.replace(/\D/g, '')}`, icone: Phone, label: c.contato.telefone },
    c.contato?.email && { href: `mailto:${c.contato.email}`, icone: Mail, label: c.contato.email },
  ].filter(Boolean) as Array<{ href: string; icone: typeof Phone; label: string }>

  return (
    <>
      <HeroGradiente>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md mb-4">
          <Clock size={16} className="text-[var(--ed-pri-clara)]" />
          <Rotulo className="text-[var(--ed-pri-clara)]">Cultos e encontros</Rotulo>
        </div>
        <h1 className="font-editorial-titulo text-[30px] leading-[38px] font-bold text-white mb-3">Venha nos visitar</h1>
        {cidadeUf(c) && <p className="text-base text-white/90">{ctx.nome} · {cidadeUf(c)}</p>}
      </HeroGradiente>

      <div className="max-w-2xl mx-auto px-5 py-6">
        <section>
          <TituloSecao direita={<Rotulo className="text-[var(--ed-pri-forte)]">Semanal</Rotulo>}>Horários</TituloSecao>
          {ctx.cultos.length ? <ListaCultos cultos={ctx.cultos} /> : <p className="text-[#5a4138]">Horários em breve.</p>}
        </section>

        <OndeEstamos ctx={ctx} />

        {contatos.length > 0 && (
          <section className="mt-8">
            <TituloSecao cor="#984350">Fale com a gente</TituloSecao>
            <div className="bg-white rounded-xl shadow-md divide-y divide-[#f1e6e2]">
              {contatos.map(ct => (
                <a key={ct.href} href={ct.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 hover:bg-[#fdf1ed]">
                  <ct.icone size={20} className="text-[var(--ed-pri-forte)]" />
                  <span className="text-sm font-medium text-[#2B1D16] truncate">{ct.label}</span>
                  <ArrowUpRight size={16} className="ml-auto text-[#8e7166]" />
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  )
}

// ── Membros ──

function Membros({ ctx }: { ctx: Ctx }) {
  const { membresia: m } = ctx
  return (
    <>
      <HeroGradiente>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md mb-4">
          <HeartHandshake size={16} className="text-[var(--ed-pri-clara)]" />
          <Rotulo className="text-[var(--ed-pri-clara)]">Membros</Rotulo>
        </div>
        <h1 className="font-editorial-titulo text-[30px] leading-[38px] font-bold text-white mb-3">Faça parte da família {ctx.nomeCurto}</h1>
        <p className="text-base text-white/90 max-w-xs">Cadastro rápido, pelo celular, em poucos minutos.</p>
      </HeroGradiente>

      <div className="max-w-2xl mx-auto px-5 py-6 flex flex-col gap-5">
        {!m.formulario_aberto ? (
          <div className="p-6 rounded-xl bg-white shadow-sm text-center text-[#5a4138]">
            O cadastro está fechado no momento. Procure a secretaria da igreja.
          </div>
        ) : (
          <>
            <article className="p-6 rounded-xl bg-white shadow-md flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[var(--ed-pri-clara)] text-[var(--ed-pri-forte)] flex items-center justify-center"><HeartHandshake size={22} /></div>
                <h2 className="font-editorial-titulo text-[22px] font-semibold text-[#2B1D16]">Quero ser membro</h2>
              </div>
              <ul className="flex flex-col gap-3">
                {CAMINHOS_INGRESSO.map(cam => (
                  <li key={cam} className="p-3 rounded-lg bg-[#fdf1ed]">
                    <p className="text-sm font-bold text-[#2B1D16]">{TEXTOS_PADRAO_INGRESSO[cam].titulo}</p>
                    <p className="text-sm text-[#5a4138] mt-0.5">{textoIngresso(m, cam)}</p>
                  </li>
                ))}
              </ul>
              <Link href={ctx.cadastro('quer_ser_membro')} className="h-12 rounded-xl bg-[var(--ed-pri-forte)] text-white text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                Começar meu cadastro <ArrowRight size={18} />
              </Link>
            </article>

            <article className="p-6 rounded-xl bg-white shadow-md flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#ffd9dc] text-[#984350] flex items-center justify-center"><UserCheck size={22} /></div>
                <h2 className="font-editorial-titulo text-[22px] font-semibold text-[#2B1D16]">Já sou membro</h2>
              </div>
              <p className="text-sm text-[#5a4138]">Atualize seus dados para a secretaria manter o rol de membros em dia.</p>
              <Link href={ctx.cadastro('ja_membro')} className="h-12 rounded-xl border-2 border-[#984350] text-[#984350] text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                Atualizar meu cadastro <ArrowRight size={18} />
              </Link>
            </article>

            {m.curso_nome && (
              <div className="p-5 rounded-xl bg-[#FBF8F3] shadow-sm flex items-start gap-3">
                <Coffee size={22} className="text-[var(--ed-pri-forte)] shrink-0 mt-0.5" />
                <div>
                  <p className="text-base font-bold text-[#2B1D16]">{m.curso_nome}</p>
                  {m.curso_descricao && <p className="text-sm text-[#5a4138] mt-0.5">{m.curso_descricao}</p>}
                </div>
              </div>
            )}
          </>
        )}

        <p className="flex items-start gap-2 text-sm text-[#5a4138]">
          <ShieldCheck size={18} className="shrink-0 mt-0.5 text-green-700" />
          <span>Seus dados são protegidos pela LGPD e usados só pela secretaria da igreja. <Link href={ctx.privacidade} className="underline">Saiba mais</Link></span>
        </p>
      </div>
    </>
  )
}

// ── Partes compartilhadas ──

function Marca({ ctx }: { ctx: Ctx }) {
  if (ctx.c.logo_horizontal_url) {
    // Logo sem fundo pintado de branco por CSS para contrastar com o degradê
    return <img src={ctx.c.logo_horizontal_url} alt={ctx.nome} className="h-12 w-auto mb-5 [filter:brightness(0)_invert(1)] drop-shadow" />
  }
  return <p className="font-editorial-titulo text-[28px] font-bold tracking-wider text-white mb-4 drop-shadow">{ctx.nomeCurto}</p>
}

function BotaoHero({ href, children, destaque, translucido }: { href: string; children: React.ReactNode; destaque?: boolean; translucido?: boolean }) {
  return (
    <Link
      href={href}
      className={`w-full h-12 rounded-xl text-sm font-bold uppercase tracking-wider flex items-center justify-center shadow-md active:scale-95 transition-transform ${translucido ? 'bg-white/85 backdrop-blur-md' : 'bg-white'} ${destaque ? 'text-[var(--ed-pri-escura)]' : 'text-[var(--ed-pri-forte)]'}`}
    >
      {children}
    </Link>
  )
}

function Avatar({ url, nome }: { url: string; nome: string }) {
  return (
    <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 bg-[var(--ed-pri-clara)] flex items-center justify-center shadow-inner">
      {url ? <img src={url} alt={nome} className="w-full h-full object-cover" /> : <UserRound size={30} className="text-[var(--ed-pri-forte)]" />}
    </div>
  )
}

function ListaCultos({ cultos }: { cultos: CultoInfo[] }) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {cultos.map((h, i) => (
        <div key={i} className="bg-[#FBF8F3] rounded-xl p-4 shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className={`w-12 h-12 rounded-xl text-white flex flex-col items-center justify-center shrink-0 shadow-sm ${i % 2 ? 'bg-[#984350]' : 'bg-[var(--ed-pri-forte)]'}`}>
              <span className="text-[11px] font-bold uppercase leading-none">{h.abrev}</span>
              {h.diaDoMes && <span className="font-editorial-titulo text-[22px] leading-none mt-0.5">{h.diaDoMes}</span>}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-lg font-semibold text-[#2B1D16] truncate">{h.nome || 'Culto'}</span>
                {h.publico && <span className={`px-2 py-0.5 rounded text-[11px] font-semibold shrink-0 ${i % 2 ? 'bg-[#ffd9dc] text-[#400011]' : 'bg-[#f3e0bf] text-[#231a06]'}`}>{h.publico}</span>}
              </div>
              <p className="text-sm text-[#5a4138] flex items-center gap-1 mt-0.5">
                <Clock size={15} /> {h.dia}{h.hora ? ` às ${h.hora}` : ''}
              </p>
            </div>
          </div>
          {h.agendaUrl && (
            <a href={h.agendaUrl} target="_blank" rel="noopener noreferrer" aria-label={`Adicionar ${h.nome || 'culto'} à agenda`} title="Adicionar à agenda"
              className="w-10 h-10 rounded-full bg-[#ebe0dc] flex items-center justify-center text-[#2B1D16] hover:bg-[var(--ed-pri-clara)] hover:text-[var(--ed-pri-forte)] shrink-0">
              <CalendarPlus size={19} />
            </a>
          )}
        </div>
      ))}
    </div>
  )
}

function OndeEstamos({ ctx }: { ctx: Ctx }) {
  const { c } = ctx
  if (!ctx.endereco) return null
  const facebook = linkRede(c.redes_sociais?.facebook, 'https://facebook.com/')
  const instagram = linkRede(c.redes_sociais?.instagram, 'https://instagram.com/')
  const youtube = linkRede(c.redes_sociais?.youtube, 'https://youtube.com/@')
  return (
    <section className="mt-8 mb-4">
      <TituloSecao>Onde estamos</TituloSecao>
      <div className="bg-white rounded-xl overflow-hidden shadow-md">
        {ctx.mapaEmbed && (
          <div className="relative w-full h-44 bg-[#f1e6e2]">
            <iframe src={ctx.mapaEmbed} title="Mapa" loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="w-full h-full border-0" />
            {c.endereco?.bairro && (
              <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-full bg-[#1a1513]/75 backdrop-blur-md text-white flex items-center gap-1.5 text-xs font-medium pointer-events-none">
                <MapPin size={14} className="text-[var(--ed-pri)]" fill="currentColor" /> {c.endereco.bairro}
              </div>
            )}
          </div>
        )}
        <div className="p-4 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <House size={22} className="text-[var(--ed-pri-forte)] mt-0.5 shrink-0" />
            <div>
              <p className="text-lg font-semibold text-[#2B1D16]">{ctx.nome}</p>
              <p className="text-sm text-[#5a4138] mt-0.5">{ctx.endereco}</p>
            </div>
          </div>
          <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2">
              {facebook && <RedeBotao href={facebook} label="Facebook"><Facebook size={18} /></RedeBotao>}
              {instagram && <RedeBotao href={instagram} label="Instagram"><Instagram size={18} /></RedeBotao>}
              {youtube && <RedeBotao href={youtube} label="YouTube"><Youtube size={18} /></RedeBotao>}
            </div>
            {ctx.mapa && (
              <a href={ctx.mapa} target="_blank" rel="noopener noreferrer" className="h-10 px-4 rounded-xl bg-[var(--ed-pri-forte)] text-white flex items-center gap-1.5 text-xs font-bold shadow-sm">
                Abrir no mapa <ArrowRight size={15} />
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function RedeBotao({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="h-10 px-3 rounded-xl bg-[#f7ebe8] flex items-center gap-2 text-[#2B1D16] hover:bg-[#f1e6e2] text-xs font-semibold">
      <span className="text-[var(--ed-pri-forte)]">{children}</span>{label}
    </a>
  )
}

function Rodape({ ctx }: { ctx: Ctx }) {
  const { c } = ctx
  return (
    <footer className="max-w-2xl mx-auto px-5 py-6 text-center">
      <p className="text-sm text-[#5a4138]">{ctx.nome}</p>
      <p className="text-xs text-[#8e7166] mt-1">
        {[c.denominacao, c.ano_fundacao && `desde ${c.ano_fundacao}`].filter(Boolean).join(' · ')}
        {' · '}<Link href={ctx.privacidade} className="underline">Privacidade</Link>
      </p>
    </footer>
  )
}
