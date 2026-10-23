import { requireRole } from '@/lib/auth'
import { getCurrentOrg } from '@/lib/org'
import { createServiceClient } from '@/lib/supabase-server'
import { modulosDaOrg } from '@/lib/modulos'
import type { Profile } from '@/types'
import UsuariosList from './usuarios-list'

export default async function UsuariosPage() {
  const { profile } = await requireRole(['admin', 'superadmin'])
  const org = await getCurrentOrg(profile)
  // Service client: a org efetiva pode ser a impersonada pelo superadmin (filtro por org_id explícito)
  const supabase = await createServiceClient()

  const { data: usuarios } = org
    ? await supabase
        .from('profiles')
        .select('*')
        .eq('org_id', org.id)
        .in('role', ['admin', 'funcionario', 'professor'])
        .order('nome')
    : { data: [] }

  return (
    <UsuariosList
      usuarios={(usuarios ?? []) as Profile[]}
      modulosOrg={modulosDaOrg(org)}
      meuId={profile.id}
    />
  )
}
