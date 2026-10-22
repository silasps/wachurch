import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { SiteConfig, SitePost } from '@/types'
import { coresDoSite } from '@/lib/cores'

interface SiteRendererProps {
  siteConfig: SiteConfig
  posts: SitePost[]
  orgNome: string
  previewMode?: boolean
  /** Org com módulo Igreja: mostra o convite para o cadastro de membros (/cadastro) */
  cadastroMembros?: boolean
}

const CATEGORIA_LABEL: Record<string, string> = {
  projeto: 'Projeto',
  noticia: 'Notícia',
  galeria: 'Galeria',
}

export default function SiteRenderer({ siteConfig, posts, orgNome, previewMode, cadastroMembros }: SiteRendererProps) {
  const colors = coresDoSite(siteConfig)

  const projetosPosts = posts.filter(p =>
    siteConfig.secoes_ativas.includes('projetos') &&
    (p.categoria === 'projeto' || p.categoria === 'noticia')
  )

  return (
    <>
      <style>{`
        :root {
          --color-primary: ${colors.primary};
          --color-primary-light: ${colors.secondary};
        }
      `}</style>

      {previewMode && (
        <div className="fixed top-0 inset-x-0 z-50 bg-gray-900 text-white text-xs flex items-center justify-between px-4 py-2.5 gap-3">
          <span className="font-medium">Pré-visualização — isso é como os visitantes veem o site</span>
          <Link href="/admin/site" className="flex items-center gap-1.5 text-gray-300 hover:text-white transition">
            <ArrowLeft size={13} /> Voltar ao painel
          </Link>
        </div>
      )}

      <div className={`min-h-screen${previewMode ? ' pt-9' : ''}`}>
        {/* Hero */}
        <section
          className="relative flex items-center justify-center min-h-[80vh] text-white px-6"
          style={{ backgroundColor: colors.primary }}
        >
          {siteConfig.hero_imagem_url && (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-20"
              style={{ backgroundImage: `url(${siteConfig.hero_imagem_url})` }}
            />
          )}
          <div className="relative text-center max-w-3xl">
            {siteConfig.logo_url && (
              <img
                src={siteConfig.logo_url}
                alt={orgNome}
                className="h-20 w-auto mx-auto mb-8 object-contain"
              />
            )}
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              {siteConfig.hero_titulo || orgNome}
            </h1>
            {siteConfig.hero_subtitulo && (
              <p className="text-xl md:text-2xl text-white/90 mb-8">
                {siteConfig.hero_subtitulo}
              </p>
            )}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {siteConfig.hero_cta_texto && (
                <a
                  href="#sobre"
                  className="inline-block px-8 py-3 bg-white rounded-full font-semibold transition hover:bg-white/90"
                  style={{ color: colors.primary }}
                >
                  {siteConfig.hero_cta_texto}
                </a>
              )}
              {cadastroMembros && (
                <a
                  href="/cadastro"
                  className="inline-block px-8 py-3 rounded-full font-semibold border-2 border-white text-white transition hover:bg-white/10"
                >
                  Cadastro de membros
                </a>
              )}
            </div>
          </div>
        </section>

        {/* Sobre */}
        {siteConfig.secoes_ativas.includes('sobre') && siteConfig.sobre_texto && (
          <section id="sobre" className="py-20 px-6 max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  {siteConfig.sobre_titulo || 'Quem Somos'}
                </h2>
                <p className="text-gray-600 text-lg leading-relaxed whitespace-pre-line">
                  {siteConfig.sobre_texto}
                </p>
                {siteConfig.missao && (
                  <div
                    className="mt-6 p-4 rounded-xl border-l-4 bg-gray-50"
                    style={{ borderColor: colors.primary }}
                  >
                    <p className="text-sm font-semibold text-gray-500 mb-1">Nossa Missão</p>
                    <p className="text-gray-700">{siteConfig.missao}</p>
                  </div>
                )}
              </div>
              {siteConfig.sobre_imagem_url && (
                <img
                  src={siteConfig.sobre_imagem_url}
                  alt="Sobre nós"
                  className="w-full rounded-2xl object-cover shadow-lg aspect-square"
                />
              )}
            </div>
          </section>
        )}

        {/* Projetos e Notícias */}
        {projetosPosts.length > 0 && (
          <section id="projetos" className="py-20 px-6 bg-gray-50">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-bold text-gray-900 mb-10 text-center">
                Projetos e Notícias
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {projetosPosts.map(post => (
                  <div key={post.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                    {post.imagem_url && (
                      <img
                        src={post.imagem_url}
                        alt={post.titulo}
                        className="w-full h-44 object-cover"
                      />
                    )}
                    <div className="p-5">
                      <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: `${colors.secondary}40`, color: colors.primary }}
                      >
                        {CATEGORIA_LABEL[post.categoria] ?? post.categoria}
                      </span>
                      <h3 className="mt-3 font-bold text-gray-900 text-base leading-snug">
                        {post.titulo}
                      </h3>
                      {post.conteudo && (
                        <p className="mt-2 text-sm text-gray-500 line-clamp-3">
                          {post.conteudo}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Cadastro de membros (módulo Igreja) */}
        {cadastroMembros && (
          <section id="membros" className="py-20 px-6 bg-gray-50">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Faça parte da nossa igreja</h2>
              <p className="text-gray-600 mb-8">
                Já é membro ou quer se tornar membro? Faça seu cadastro em poucos minutos, pelo celular.
              </p>
              <a
                href="/cadastro"
                className="inline-block px-8 py-3 rounded-full font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: colors.primary }}
              >
                Fazer meu cadastro
              </a>
            </div>
          </section>
        )}

        {/* Faca Parte / Voluntariado */}
        {siteConfig.secoes_ativas.includes('voluntariado') && (
          <section id="voluntariado" className="py-20 px-6">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Faça Parte</h2>
              <p className="text-gray-600 mb-8">
                Quer contribuir com nossa missão? Entre em contato ou candidate-se como voluntário.
              </p>
              <a
                href="#contato"
                className="inline-block px-8 py-3 rounded-full font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: colors.primary }}
              >
                Quero me envolver
              </a>
            </div>
          </section>
        )}

        {/* Contato */}
        {siteConfig.secoes_ativas.includes('contato') && (
          <footer
            id="contato"
            className="py-16 px-6 text-white text-center"
            style={{ backgroundColor: colors.primary }}
          >
            <h2 className="text-2xl font-bold mb-6">Entre em Contato</h2>
            <div className="flex flex-wrap justify-center gap-6 text-white/80">
              {siteConfig.contato?.email && (
                <a href={`mailto:${siteConfig.contato.email}`} className="hover:text-white">
                  {siteConfig.contato.email}
                </a>
              )}
              {siteConfig.contato?.telefone && (
                <span>{siteConfig.contato.telefone}</span>
              )}
              {siteConfig.contato?.endereco && (
                <span>{siteConfig.contato.endereco}</span>
              )}
            </div>
            <div className="flex justify-center gap-4 mt-6">
              {siteConfig.redes_sociais?.instagram && (
                <a href={siteConfig.redes_sociais.instagram} target="_blank" rel="noreferrer"
                   className="text-white/70 hover:text-white text-sm">
                  Instagram
                </a>
              )}
              {siteConfig.redes_sociais?.facebook && (
                <a href={siteConfig.redes_sociais.facebook} target="_blank" rel="noreferrer"
                   className="text-white/70 hover:text-white text-sm">
                  Facebook
                </a>
              )}
              {siteConfig.redes_sociais?.youtube && (
                <a href={siteConfig.redes_sociais.youtube} target="_blank" rel="noreferrer"
                   className="text-white/70 hover:text-white text-sm">
                  YouTube
                </a>
              )}
            </div>
            <p className="mt-8 text-white/40 text-xs">Powered by Ostrick Social</p>
          </footer>
        )}
      </div>
    </>
  )
}
