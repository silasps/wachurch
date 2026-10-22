import { requireRole } from '@/lib/auth'
import { headers, cookies } from 'next/headers'
import { resolveOrgFromHost, getSiteConfig } from '@/lib/tenant'
import { createServiceClient } from '@/lib/supabase-server'
import AdminSidebar from './admin-sidebar'
import ImpersonationBanner from '@/components/superadmin/impersonation-banner'
import { RolePreviewBanner } from '@/components/admin/role-preview-banner'
import { RolePreviewDropdown } from '@/components/admin/role-preview-dropdown'
import { MelhoriaFab } from '@/components/melhoria-fab'
import { getCurrentOrg } from '@/lib/org'
import { modulosDaOrg } from '@/lib/modulos'
import type { UserRole } from '@/types'
import { coresDoSite } from '@/lib/cores'

const PREVIEWABLE: UserRole[] = ['admin', 'funcionario']

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole(['admin', 'funcionario', 'superadmin'])

  const cookieStore = await cookies()
  const impOrgId = cookieStore.get('sa_imp_org_id')?.value
  const isImpersonating = !!impOrgId && profile.role === 'superadmin'

  const previewCookie = cookieStore.get('os_admin_preview_role')?.value ?? null
  const previewRole: UserRole | null =
    profile.role === 'superadmin' && previewCookie && PREVIEWABLE.includes(previewCookie as UserRole)
      ? (previewCookie as UserRole)
      : null
  const effectiveRole: UserRole = previewRole ?? profile.role

  // Módulos da licença da org efetiva (a do perfil ou a impersonada)
  const currentOrg = await getCurrentOrg(profile)
  const modulos = modulosDaOrg(currentOrg)

  let orgName = 'Ostrick Social'
  let logoUrl: string | null = null
  let colors = coresDoSite(null)
  let impOrgNome = ''

  if (isImpersonating) {
    const supabase = await createServiceClient()
    const { data: org } = await supabase.from('organizations').select('*').eq('id', impOrgId).single()
    if (org) {
      const siteConfig = await getSiteConfig(org.id)
      orgName = siteConfig?.hero_titulo || org.nome
      logoUrl = siteConfig?.logo_url || null
      colors = coresDoSite(siteConfig)
      impOrgNome = org.nome
    }
  } else {
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost'
    const tenantResult = await resolveOrgFromHost(host)
    // Sem tenant no host (ex.: *.vercel.app), a marca vem da org do usuário logado
    const orgDaMarca = tenantResult?.org ?? currentOrg
    const siteConfig = orgDaMarca ? await getSiteConfig(orgDaMarca.id) : null
    orgName = siteConfig?.hero_titulo || orgDaMarca?.nome || 'Ostrick Social'
    logoUrl = siteConfig?.logo_url || null
    colors = coresDoSite(siteConfig)
  }

  // Banners fixos aparecem quando preview ou impersonação está ativa
  const showPreviewBanner = !!previewRole
  const showImpBanner = isImpersonating

  // Padding do conteúdo para não ficar atrás dos banners fixos
  const bannerPt = showPreviewBanner || showImpBanner ? 'pt-8' : 'pt-0'

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      {/* ── Banners fixos (aparecem sobre tudo, z-50) ── */}
      {showPreviewBanner && <RolePreviewBanner previewRole={previewRole!} />}
      {showImpBanner && <ImpersonationBanner orgNome={impOrgNome} />}

      {/* ── Topbar full-width — superadmin, desktop, sem banner ativo ── */}
      {profile.role === 'superadmin' && !showPreviewBanner && !showImpBanner && (
        <header className="hidden lg:flex shrink-0 sticky top-0 z-30 bg-white border-b border-gray-100 h-12 items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            {logoUrl ? (
              <img src={logoUrl} alt={orgName} className="h-6 w-6 object-contain rounded" />
            ) : (
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                style={{ backgroundColor: colors.primary }}
              >
                {orgName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm font-semibold text-gray-700 truncate">{orgName}</span>
          </div>
          <RolePreviewDropdown currentPreview={previewRole} />
        </header>
      )}

      {/* ── Corpo: sidebar + conteúdo ── */}
      <div className="flex flex-1 min-h-0">
        <AdminSidebar
          orgName={orgName}
          logoUrl={logoUrl}
          primaryColor={colors.primary}
          userNome={profile.nome}
          userRole={profile.role}
          effectiveRole={effectiveRole}
          modulos={modulos}
        />
        <main className={`flex-1 overflow-auto pb-16 lg:pb-0 min-w-0 ${bannerPt}`}>
          {children}
        </main>
      </div>

      <MelhoriaFab />
    </div>
  )
}
