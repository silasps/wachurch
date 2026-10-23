import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getOrgBySlug } from '@/lib/tenant'
import { orgTemModulo } from '@/lib/modulos'
import CadastroView from '@/app/(public)/cadastro/cadastro-view'

// Cadastro de membros por caminho — funciona em qualquer host (ex.: *.vercel.app, antes do DNS curinga)
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const org = await getOrgBySlug((await params).slug)
  return { title: org ? `Cadastro de membros · ${org.nome}` : 'Cadastro de membros', robots: { index: false } }
}

export default async function CadastroPorSlugPage({ params, searchParams }: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ tipo?: string }>
}) {
  const { slug } = await params
  const org = await getOrgBySlug(slug)
  if (!org || !orgTemModulo(org, 'igreja')) notFound()
  return <CadastroView org={org} basePath={`/s/${slug}`} tipo={(await searchParams).tipo} />
}
