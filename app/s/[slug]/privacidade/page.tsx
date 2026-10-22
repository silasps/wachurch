import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getOrgBySlug } from '@/lib/tenant'
import { orgTemModulo } from '@/lib/modulos'
import PrivacidadeView from '@/app/(public)/privacidade/privacidade-view'

export const metadata: Metadata = { title: 'Aviso de privacidade' }

export default async function PrivacidadePorSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const org = await getOrgBySlug(slug)
  if (!org || !orgTemModulo(org, 'igreja')) notFound()
  return <PrivacidadeView org={org} basePath={`/s/${slug}`} />
}
