import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { temModulo } from '@/lib/org'
import { getSession, isAdmin } from '@/lib/auth'

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || !isAdmin(session.profile.role)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }
  if (!(await temModulo(session.profile, 'social'))) {
    return NextResponse.json({ error: 'Módulo Projeto Social não está disponível nesta licença' }, { status: 403 })
  }

  const body = await request.json()
  const { nome, descricao, professor_id, capacidade, status, horario } = body

  if (!nome) {
    return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data, error } = await supabase.from('turmas').insert({
    org_id: session.profile.org_id,
    nome,
    descricao: descricao || null,
    professor_id: professor_id || null,
    capacidade: capacidade || null,
    status: status || 'ativa',
    horario: horario || [],
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ turma: data }, { status: 201 })
}
