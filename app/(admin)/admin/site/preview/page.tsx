import { requireRole } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { resolveOrgId } from '@/lib/org'
import { getSiteConfig } from '@/lib/tenant'
import Link from 'next/link'
import SiteRenderer from '@/components/public-site/site-renderer'
import IgrejaPerfil from '@/components/public-site/igreja-perfil'
import PaginaEditorial from '@/components/public-site/editorial/paginas'
import { orgTemModulo } from '@/lib/modulos'
import type { Organization, SiteConfig, SitePost } from '@/types'

export default async function SitePreviewPage() {
  const { profile } = await requireRole(['admin', 'superadmin'])
  // Org efetiva (a do perfil ou a simulada pelo superadmin) — service client com filtro explícito por org
  const orgId = await resolveOrgId(profile)
  const supabase = await createServiceClient()

  const [siteConfig, postsResult] = await Promise.all([
    getSiteConfig(orgId ?? ''),
    supabase
      .from('site_posts')
      .select('*')
      .eq('org_id', orgId)
      .eq('publicado', true)
      .order('ordem', { ascending: true })
      .order('created_at', { ascending: false }),
  ])

  // Buscar nome da org
  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single()

  if (!siteConfig) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <p className="text-gray-400 text-4xl mb-4">🎨</p>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Site ainda não configurado</h2>
        <p className="text-sm text-gray-500 mb-6 max-w-xs">
          Configure a aparência do site antes de visualizá-lo.
        </p>
        <Link
          href="/admin/site/aparencia"
          className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 transition"
        >
          Configurar aparência →
        </Link>
      </div>
    )
  }

  const posts = (postsResult.data ?? []) as SitePost[]

  if (org?.tipo === 'igreja' && siteConfig.template_id === 'editorial') {
    // Links internos por caminho (/s/<slug>/…) — o painel não roda no host da igreja
    return <PaginaEditorial org={org as Organization} pagina="inicio" basePath={`/s/${org.slug}`} previewMode />
  }

  if (org?.tipo === 'igreja') {
    return (
      <IgrejaPerfil
        siteConfig={siteConfig as SiteConfig}
        posts={posts}
        orgNome={org.nome ?? ''}
        temProjetoSocial={orgTemModulo(org, 'social')}
        previewMode
      />
    )
  }

  return (
    <SiteRenderer
      siteConfig={siteConfig as SiteConfig}
      posts={posts}
      orgNome={org?.nome ?? ''}
      cadastroMembros={orgTemModulo(org, 'igreja')}
      previewMode
    />
  )
}
