import { requireRole } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCurrentOrg } from '@/lib/org'
import { orgTemModulo } from '@/lib/modulos'
import { resolveOrgFromHost, getSiteConfig } from '@/lib/tenant'
import ProfessorSidebar from './professor-sidebar'
import { coresDoSite } from '@/lib/cores'

export default async function ProfessorLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole(['professor', 'admin', 'superadmin'])

  // Painel do professor pertence ao módulo Projeto Social
  const currentOrg = await getCurrentOrg(profile)
  if (currentOrg && !orgTemModulo(currentOrg, 'social')) redirect('/acesso-negado')

  const headersList = await headers()
  const host = headersList.get('host') || 'localhost'

  const tenantResult = await resolveOrgFromHost(host)
  const siteConfig = tenantResult ? await getSiteConfig(tenantResult.org.id) : null

  const orgName = siteConfig?.hero_titulo || tenantResult?.org.nome || 'Ostrick Social'
  const logoUrl = siteConfig?.logo_url || null
  const colors = coresDoSite(siteConfig)

  return (
    <div className="min-h-screen flex bg-gray-50">
      <ProfessorSidebar
        orgName={orgName}
        logoUrl={logoUrl}
        primaryColor={colors.primary}
        userNome={profile.nome}
      />
      <main className="flex-1 overflow-auto pb-16 lg:pb-0 min-w-0">{children}</main>
    </div>
  )
}
