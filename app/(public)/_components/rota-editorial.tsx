import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { getOrgBySlug, getSiteConfig, resolveOrgFromHost } from '@/lib/tenant'
import { orgTemModulo } from '@/lib/modulos'
import PaginaEditorial from '@/components/public-site/editorial/paginas'
import type { PaginaEditorialId } from '@/components/public-site/editorial/shell'

// Páginas internas do layout editorial (História, Cultos, Membros).
// Se a igreja não usa o layout editorial (ou o site não está publicado), volta para a página inicial.

export async function RotaEditorialHost({ pagina }: { pagina: PaginaEditorialId }) {
  const tenant = await resolveOrgFromHost((await headers()).get('host') || '')
  if (!tenant || !orgTemModulo(tenant.org, 'igreja')) notFound()
  const config = await getSiteConfig(tenant.org.id)
  if (!config?.publicado || config.template_id !== 'editorial') redirect('/')
  return <PaginaEditorial org={tenant.org} pagina={pagina} basePath="" />
}

export async function RotaEditorialSlug({ slug, pagina }: { slug: string; pagina: PaginaEditorialId }) {
  const org = await getOrgBySlug(slug)
  if (!org || !orgTemModulo(org, 'igreja')) notFound()
  const config = await getSiteConfig(org.id)
  if (!config?.publicado || config.template_id !== 'editorial') redirect(`/s/${slug}`)
  return <PaginaEditorial org={org} pagina={pagina} basePath={`/s/${slug}`} />
}
