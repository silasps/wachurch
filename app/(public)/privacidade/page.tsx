import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { resolveOrgFromHost } from '@/lib/tenant'
import { orgTemModulo } from '@/lib/modulos'
import PrivacidadeView from './privacidade-view'

export const metadata: Metadata = { title: 'Aviso de privacidade' }

export default async function PrivacidadePage() {
  const host = (await headers()).get('host') || 'localhost'
  const tenant = await resolveOrgFromHost(host)
  if (!tenant || !orgTemModulo(tenant.org, 'igreja')) notFound()
  return <PrivacidadeView org={tenant.org} />
}
