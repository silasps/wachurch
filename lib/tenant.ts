import { createServerClient } from '@supabase/ssr'
import type { Organization, SiteConfig } from '@/types'

// Extrai o slug do subdomínio ou retorna null para domínio raiz
export function getSlugFromHost(host: string): string | null {
  // Remove porta
  const hostname = host.split(':')[0]

  // Domínios raiz da plataforma (sem tenant)
  const platformDomains = [
    'localhost',
    'ostricksocial.com.br',
    'www.ostricksocial.com.br',
  ]

  if (platformDomains.includes(hostname)) return null

  // Subdomínio: atitude.ostricksocial.com.br → 'atitude'
  if (hostname.endsWith('.ostricksocial.com.br')) {
    return hostname.replace('.ostricksocial.com.br', '')
  }

  // Dev: atitude.localhost → 'atitude'
  if (hostname.endsWith('.localhost')) {
    return hostname.replace('.localhost', '')
  }

  // Domínio customizado — retorna o hostname completo para busca na tabela
  return hostname
}

// Resolve o org_id a partir do host (subdomínio ou domínio customizado)
// Usa anon key porque é chamado no middleware antes de auth
export async function resolveOrgFromHost(
  host: string
): Promise<{ org: Organization; fromCustomDomain: boolean } | null> {
  const slug = getSlugFromHost(host)
  if (!slug) return null

  // Cliente sem cookies (middleware não tem acesso a cookies de forma assíncrona no middleware)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  // Tenta por slug primeiro
  const { data: orgBySlug } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', slug)
    .eq('ativo', true)
    .single()

  if (orgBySlug) return { org: orgBySlug as Organization, fromCustomDomain: false }

  // Tenta por domínio customizado
  const { data: customDomain } = await supabase
    .from('custom_domains')
    .select('org_id, organizations(*)')
    .eq('domain', slug)
    .eq('verificado', true)
    .single()

  if (customDomain?.organizations) {
    const org = (customDomain.organizations as unknown as Organization)
    if (org.ativo) return { org, fromCustomDomain: true }
  }

  return null
}

// Busca site_config de uma org (para SSR de páginas públicas)
export async function getSiteConfig(
  orgId: string
): Promise<SiteConfig | null> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  const { data } = await supabase
    .from('site_config')
    .select('*')
    .eq('org_id', orgId)
    .single()

  return data as SiteConfig | null
}

// URL pública (subdomínio) de uma org — usada quando a página é vista fora do host do tenant (ex.: /s/[slug])
export function urlPublicaOrg(slug: string, host: string): string {
  if (host.includes('localhost')) {
    const porta = host.includes(':') ? `:${host.split(':')[1]}` : ''
    return `http://${slug}.localhost${porta}`
  }
  return `https://${slug}.ostricksocial.com.br`
}
