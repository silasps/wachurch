import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'
import type { Profile, Turma } from '@/types'
import TurmasList from './turmas-list'

export default async function TurmasPage() {
  const { profile } = await requireRole(['admin', 'funcionario', 'superadmin'])
  const supabase = await createClient()

  const { data: turmas } = await supabase
    .from('turmas')
    .select(`*, professor:profiles!professor_id(nome), _count:matriculas(count)`)
    .eq('org_id', profile.org_id)
    .order('nome')

  // Contagem de matriculas por turma
  const turmaIds = (turmas || []).map((t: Turma) => t.id)
  const { data: counts } = await supabase
    .from('matriculas')
    .select('turma_id')
    .in('turma_id', turmaIds)
    .eq('status', 'ativa')

  const countByTurma = (counts || []).reduce((acc: Record<string, number>, m: { turma_id: string }) => {
    acc[m.turma_id] = (acc[m.turma_id] || 0) + 1
    return acc
  }, {})

  const { data: professores } = await supabase
    .from('profiles')
    .select('id, nome')
    .eq('org_id', profile.org_id)
    .eq('role', 'professor')
    .eq('ativo', true)
    .order('nome')

  return (
    <TurmasList
      turmas={(turmas ?? []) as (Turma & { professor?: { nome: string } })[]}
      countByTurma={countByTurma}
      professores={(professores ?? []) as Pick<Profile, 'id' | 'nome'>[]}
    />
  )
}
