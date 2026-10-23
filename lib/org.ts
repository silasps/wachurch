import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { areasDoUsuario, COOKIE_AREA } from '@/lib/modulos'
import type { Modulo, Organization, Profile } from '@/types'

// org_id "efetivo" do usuário: o do perfil, ou o da org que o superadmin está impersonando
export async function resolveOrgId(profile: Profile): Promise<string | null> {
  if (profile.role === 'superadmin') {
    const cookieStore = await cookies()
    return cookieStore.get('sa_imp_org_id')?.value ?? null
  }
  return profile.org_id
}

const getOrgById = cache(async (orgId: string): Promise<Organization | null> => {
  const supabase = await createServiceClient()
  const { data } = await supabase.from('organizations').select('*').eq('id', orgId).maybeSingle()
  return (data as Organization | null) ?? null
})

// Organização em que o usuário está trabalhando (respeita impersonação do superadmin)
export async function getCurrentOrg(profile: Profile): Promise<Organization | null> {
  const orgId = await resolveOrgId(profile)
  return orgId ? getOrgById(orgId) : null
}

// Para páginas: redireciona ao dashboard se o módulo não estiver na licença da org
export async function requireModulo(profile: Profile, modulo: Modulo): Promise<Organization> {
  const org = await getCurrentOrg(profile)
  if (!org || !areasDoUsuario(profile, org).includes(modulo)) redirect('/admin')
  return org
}

// Área ativa no painel: a escolhida no seletor (cookie), se permitida; senão a primeira disponível
export async function getAreaAtiva(profile: Profile, org: Organization | null): Promise<Modulo | null> {
  const areas = areasDoUsuario(profile, org)
  const escolhida = (await cookies()).get(COOKIE_AREA)?.value as Modulo | undefined
  return escolhida && areas.includes(escolhida) ? escolhida : areas[0] ?? null
}

// Para rotas de API: sessão + org efetiva (null quando não autenticado)
export async function getApiContext(): Promise<{ profile: Profile; org: Organization | null } | null> {
  const session = await getSession()
  if (!session) return null
  const org = await getCurrentOrg(session.profile)
  return { profile: session.profile, org }
}

// Para rotas de API: true se a org efetiva do usuário tem o módulo licenciado
export async function temModulo(profile: Profile, modulo: Modulo): Promise<boolean> {
  return areasDoUsuario(profile, await getCurrentOrg(profile)).includes(modulo)
}
