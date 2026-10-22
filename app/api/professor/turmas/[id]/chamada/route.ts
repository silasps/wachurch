import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { temModulo } from '@/lib/org'
import { getSession } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || !['professor', 'admin', 'superadmin'].includes(session.profile.role)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }
  if (!(await temModulo(session.profile, 'social'))) {
    return NextResponse.json({ error: 'Módulo Projeto Social não está disponível nesta licença' }, { status: 403 })
  }

  const { id: turmaId } = await params
  const { data, hora_inicio, hora_fim, conteudo, presencas } = await request.json()

  if (!data || !presencas) {
    return NextResponse.json({ error: 'Data e presenças são obrigatórias' }, { status: 400 })
  }

  const supabase = await createClient()

  // Cria o encontro
  const { data: encontro, error: encontroError } = await supabase
    .from('encontros')
    .insert({
      org_id: session.profile.org_id,
      turma_id: turmaId,
      data,
      hora_inicio: hora_inicio || null,
      hora_fim: hora_fim || null,
      conteudo: conteudo || null,
    })
    .select()
    .single()

  if (encontroError) {
    return NextResponse.json({ error: encontroError.message }, { status: 500 })
  }

  // Insere as presenças
  const presencasData = Object.entries(presencas as Record<string, boolean>).map(
    ([aluno_id, presente]) => ({
      org_id: session.profile.org_id,
      encontro_id: encontro.id,
      aluno_id,
      presente,
    })
  )

  if (presencasData.length > 0) {
    const { error: presencaError } = await supabase
      .from('presencas')
      .insert(presencasData)

    if (presencaError) {
      return NextResponse.json({ error: presencaError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ encontro }, { status: 201 })
}
