import type { Modulo, Organization, OrgTipo, Profile } from '@/types'

// Módulos que uma licença pode liberar.
// Comum a todas as contas (sem módulo): dashboard, usuários, financeiro, site, configurações.
export const MODULO_LABELS: Record<Modulo, string> = {
  igreja: 'Igreja',
  social: 'Projeto Social',
}

export const ORG_TIPO_LABELS: Record<OrgTipo, string> = {
  igreja: 'Igreja',
  projeto_social: 'Projeto Social',
}

// Catálogo de licenças vendidas. tipo + modulos são gravados em organizations.
export type LicencaId = 'igreja' | 'igreja_social' | 'social'

export const LICENCAS: Record<LicencaId, { label: string; tipo: OrgTipo; modulos: Modulo[] }> = {
  igreja:        { label: 'Igreja',                  tipo: 'igreja',         modulos: ['igreja'] },
  igreja_social: { label: 'Igreja + Projeto Social', tipo: 'igreja',         modulos: ['igreja', 'social'] },
  social:        { label: 'Projeto Social',          tipo: 'projeto_social', modulos: ['social'] },
}

export function isLicencaId(value: unknown): value is LicencaId {
  return typeof value === 'string' && value in LICENCAS
}

// Descobre a licença a partir do que está gravado na org
export function getLicencaId(org: Pick<Organization, 'tipo' | 'modulos'>): LicencaId {
  if (org.tipo === 'igreja') return org.modulos?.includes('social') ? 'igreja_social' : 'igreja'
  return 'social'
}

// Faixa de cobrança (organizations.plano) — independente dos módulos
export const PLANOS = [
  { value: 'free',         label: 'Free' },
  { value: 'basico',       label: 'Básico' },
  { value: 'profissional', label: 'Profissional' },
  { value: 'enterprise',   label: 'Enterprise' },
] as const

// Módulos da org. Sem a coluna (migration 0009 ainda não aplicada) a org é tratada como
// projeto social — assim um deploy antes da migration não tira o acesso das orgs atuais.
export function modulosDaOrg(org: Pick<Organization, 'modulos'> | null | undefined): Modulo[] {
  if (!org) return []
  return org.modulos ?? ['social']
}

export function orgTemModulo(org: Pick<Organization, 'modulos'> | null | undefined, modulo: Modulo): boolean {
  return modulosDaOrg(org).includes(modulo)
}

// Como a conta se refere a si mesma nos textos do painel ("da igreja" / "da organização")
export function nomeDoTipo(tipo: OrgTipo | null | undefined): string {
  return tipo === 'igreja' ? 'igreja' : 'organização'
}

// Áreas que o usuário acessa nesta org: módulos da licença ∩ profile.areas (null = todas).
// Superadmin (inclusive simulando acesso) vê todas as áreas da org.
export function areasDoUsuario(
  profile: Pick<Profile, 'role' | 'areas'>,
  org: Pick<Organization, 'modulos'> | null | undefined,
): Modulo[] {
  const daOrg = modulosDaOrg(org)
  if (profile.role === 'superadmin' || !profile.areas) return daOrg
  return daOrg.filter(m => profile.areas!.includes(m))
}

export const AREA_LABELS: Record<Modulo, string> = { igreja: 'Igreja', social: 'Projeto Social' }

// Cookie com a área escolhida no seletor do painel (quando o usuário acessa as duas)
export const COOKIE_AREA = 'os_area'
