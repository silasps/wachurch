import { createServerClient } from '@supabase/ssr'
import { getSiteConfig, getOrgBySlug } from '@/lib/tenant'
import { LandingPage } from '@/app/(public)/_components/landing-page'
import SiteRenderer from '@/components/public-site/site-renderer'
import IgrejaPerfil from '@/components/public-site/igreja-perfil'
import { orgTemModulo } from '@/lib/modulos'
import type { SitePost } from '@/types'
import { notFound } from 'next/navigation'

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

export default async function PublicSiteBySlug({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const org = await getOrgBySlug(slug)

  if (!org) notFound()

  const siteConfig = await getSiteConfig(org.id)

  if (!siteConfig?.publicado) {
    return <LandingPage />
  }

  const posts = await getPublishedPosts(org.id)

  if (org.tipo === 'igreja') {
    return (
      <IgrejaPerfil
        siteConfig={siteConfig}
        posts={posts}
        orgNome={org.nome}
        temProjetoSocial={orgTemModulo(org, 'social')}
        baseUrl={`/s/${org.slug}`}
      />
    )
  }

  return (
    <SiteRenderer
      siteConfig={siteConfig}
      posts={posts}
      orgNome={org.nome}
    />
  )
}
