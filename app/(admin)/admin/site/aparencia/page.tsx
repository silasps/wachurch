import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'
import AparenciaForm from './aparencia-form'
import { getCurrentOrg } from '@/lib/org'
import type { SiteConfig } from '@/types'

export default async function AparenciaPage() {
  const { profile } = await requireRole(['admin', 'superadmin'])
  const supabase = await createClient()

  const [{ data: config }, { data: org }] = await Promise.all([
    supabase.from('site_config').select('*').eq('org_id', profile.org_id).single(),
    supabase.from('organizations').select('slug').eq('id', profile.org_id).single(),
  ])

  const subdomain = org?.slug ? `${org.slug}.ostricksocial.com.br` : ''

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl">
      <div className="mb-6">
        <a href="/admin/site" className="text-sm text-gray-400 hover:text-gray-600 mb-3 inline-block">← Site Público</a>
        <h1 className="text-2xl font-bold text-gray-900">Aparência</h1>
        <p className="text-gray-500 text-sm mt-1">Escolha o template, as cores e o logo do seu site.</p>
      </div>
      <AparenciaForm config={config as SiteConfig | null} subdomain={subdomain} ehIgreja={(await getCurrentOrg(profile))?.tipo === 'igreja'} />
    </div>
  )
}
