import { requireRole } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { resolveOrgId } from '@/lib/org'
import ConteudoForm from './conteudo-form'
import { getCurrentOrg } from '@/lib/org'
import type { SiteConfig } from '@/types'

export default async function ConteudoPage() {
  const { profile } = await requireRole(['admin', 'superadmin'])
  // Org efetiva (a do perfil ou a simulada pelo superadmin) — service client com filtro explícito por org
  const orgId = await resolveOrgId(profile)
  const supabase = await createServiceClient()

  const { data: config } = await supabase
    .from('site_config')
    .select('*')
    .eq('org_id', orgId)
    .single()

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl">
      <div className="mb-6">
        <a href="/admin/site" className="text-sm text-gray-400 hover:text-gray-600 mb-3 inline-block">← Site Público</a>
        <h1 className="text-2xl font-bold text-gray-900">Conteúdo do site</h1>
        <p className="text-gray-500 text-sm mt-1">Edite os textos que aparecem no site público.</p>
      </div>
      <ConteudoForm config={config as SiteConfig | null} ehIgreja={(await getCurrentOrg(profile))?.tipo === 'igreja'} />
    </div>
  )
}
