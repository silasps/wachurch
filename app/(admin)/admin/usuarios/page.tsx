import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'
import type { Profile } from '@/types'
import UsuariosList from './usuarios-list'

export default async function UsuariosPage() {
  const { profile } = await requireRole(['admin', 'superadmin'])
  const supabase = await createClient()

  const { data: usuarios } = await supabase
    .from('profiles')
    .select('*')
    .eq('org_id', profile.org_id)
    .in('role', ['admin', 'funcionario', 'professor'])
    .order('nome')

  return <UsuariosList usuarios={(usuarios ?? []) as Profile[]} />
}
