import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import { requireModulo } from '@/lib/org'
import { createServiceClient } from '@/lib/supabase-server'
import type { SiteConfig } from '@/types'
import IgrejaPerfilForm from './igreja-perfil-form'

export default async function IgrejaPerfilPage() {
  const { profile } = await requireRole(['admin', 'superadmin'])
  const org = await requireModulo(profile, 'igreja')
  const supabase = await createServiceClient()
  const { data } = await supabase.from('site_config').select('*').eq('org_id', org.id).maybeSingle()

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/admin/site" className="text-sm text-gray-400 hover:text-gray-600 mb-3 inline-block">← Site Público</Link>
        <h1 className="text-2xl font-bold text-gray-900">Perfil da igreja</h1>
        <p className="text-gray-500 text-sm mt-1">Informações da página pública: capa, história, horários de culto, endereço e liderança.</p>
      </div>
      <IgrejaPerfilForm config={data as SiteConfig | null} />
    </div>
  )
}
