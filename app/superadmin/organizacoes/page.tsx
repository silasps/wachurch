import { createServiceClient } from '@/lib/supabase-server'
import type { Organization } from '@/types'
import OrganizacoesList from './organizacoes-list'

export default async function OrganizacoesPage() {
  const supabase = await createServiceClient()

  const { data: orgs } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false })

  return <OrganizacoesList orgs={(orgs ?? []) as Organization[]} />
}
