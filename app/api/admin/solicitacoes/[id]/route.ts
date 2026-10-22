import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { temModulo } from '@/lib/org'
import { getSession, isAdmin } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || (!isAdmin(session.profile.role) && session.profile.role !== 'funcionario')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }
  if (!(await temModulo(session.profile, 'social'))) {
    return NextResponse.json({ error: 'Módulo Projeto Social não está disponível nesta licença' }, { status: 403 })
  }

  const { id } = await params
  const { acao } = await request.json()

  if (!['aprovar', 'recusar'].includes(acao)) {
    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  }

  const supabase = await createClient()

  const novoStatus = acao === 'aprovar' ? 'aprovada' : 'recusada'

  const { data: solicitacao, error: fetchError } = await supabase
    .from('solicitacoes_admissao')
    .select('*')
    .eq('id', id)
    .eq('org_id', session.profile.org_id)
    .single()

  if (fetchError || !solicitacao) {
    return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 })
  }

  const { error: updateError } = await supabase
    .from('solicitacoes_admissao')
    .update({ status: novoStatus })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Se aprovado, cria o aluno automaticamente
  if (acao === 'aprovar') {
    await supabase.from('alunos').insert({
      org_id: session.profile.org_id,
      nome: solicitacao.nome,
      telefone: solicitacao.telefone || null,
      status: 'aguardando',
      data_admissao: new Date().toISOString().split('T')[0],
      observacoes: solicitacao.email ? `Email: ${solicitacao.email}` : null,
    })
  }

  return NextResponse.json({ success: true })
}
