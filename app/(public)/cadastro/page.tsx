import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { resolveOrgFromHost } from '@/lib/tenant'
import { orgTemModulo } from '@/lib/modulos'
import CadastroView from './cadastro-view'

async function getTenantIgreja() {
  const host = (await headers()).get('host') || 'localhost'
  const tenant = await resolveOrgFromHost(host)
  if (!tenant || !orgTemModulo(tenant.org, 'igreja')) return null
  return tenant.org
}

export async function generateMetadata(): Promise<Metadata> {
  const org = await getTenantIgreja()
  return {
    title: org ? `Cadastro de membros · ${org.nome}` : 'Cadastro de membros',
    robots: { index: false },
  }
}

export default async function CadastroMembroPage() {
  const org = await getTenantIgreja()
  if (!org) notFound()
  return <CadastroView org={org} />
}
