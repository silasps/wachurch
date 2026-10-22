import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'
import type { Aluno } from '@/types'
import AlunosList from './alunos-list'

export default async function AlunosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>
}) {
  const params = await searchParams
  const { profile } = await requireRole(['admin', 'funcionario', 'superadmin'])
  const supabase = await createClient()

  let query = supabase
    .from('alunos')
    .select('*')
    .eq('org_id', profile.org_id)
    .order('nome')

  if (params.status) query = query.eq('status', params.status)
  if (params.q) query = query.ilike('nome', `%${params.q}%`)

  const { data: alunos } = await query

  return <AlunosList alunos={(alunos ?? []) as Aluno[]} status={params.status} />
}
