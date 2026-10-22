import { headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { resolveOrgFromHost, getSiteConfig } from '@/lib/tenant'
import { LandingPage } from './_components/landing-page'
import SiteRenderer from '@/components/public-site/site-renderer'
import IgrejaPerfil from '@/components/public-site/igreja-perfil'
import { orgTemModulo } from '@/lib/modulos'
import type { SitePost } from '@/types'

async function getPublishedPosts(orgId: string): Promise<SitePost[]> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
  const { data } = await supabase
    .from('site_posts')
    .select('*')
    .eq('org_id', orgId)
    .eq('publicado', true)
    .order('ordem', { ascending: true })
    .order('created_at', { ascending: false })
  return (data ?? []) as SitePost[]
}

export default async function PublicHomePage() {
  const headersList = await headers()
  const host = headersList.get('host') || 'localhost'
  const tenantSlug = headersList.get('x-tenant-slug')

  const tenantResult = tenantSlug ? await resolveOrgFromHost(host) : null
  const siteConfig = tenantResult ? await getSiteConfig(tenantResult.org.id) : null

  if (!tenantResult || !siteConfig?.publicado) {
    return <LandingPage />
  }

  const posts = await getPublishedPosts(tenantResult.org.id)

  if (tenantResult.org.tipo === 'igreja') {
    return (
      <IgrejaPerfil
        siteConfig={siteConfig}
        posts={posts}
        orgNome={tenantResult.org.nome}
        temProjetoSocial={orgTemModulo(tenantResult.org, 'social')}
      />
    )
  }

  return (
    <SiteRenderer
      siteConfig={siteConfig}
      posts={posts}
      orgNome={tenantResult.org.nome}
      cadastroMembros={orgTemModulo(tenantResult.org, 'igreja')}
    />
  )
}
