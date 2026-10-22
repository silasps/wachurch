import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'
import ConteudoForm from './conteudo-form'
import { getCurrentOrg } from '@/lib/org'
import type { SiteConfig } from '@/types'

export default async function ConteudoPage() {
  const { profile } = await requireRole(['admin', 'superadmin'])
  const supabase = await createClient()

  const { data: config } = await supabase
    .from('site_config')
    .select('*')
    .eq('org_id', profile.org_id)
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
