import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { resolveOrgFromHost } from '@/lib/tenant'

export async function POST(request: Request) {
  // A org vem SEMPRE do host da requisição — nunca do corpo enviado pelo navegador
  const host = request.headers.get('host') || ''
  const tenant = await resolveOrgFromHost(host)
  if (!tenant) {
    return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 })
  }

  const body = await request.json()
  const { tipo, nome, email, telefone, data_nascimento, responsavel_nome, responsavel_telefone, mensagem } = body

  if (!nome) {
    return NextResponse.json({ error: 'Dados obrigatórios faltando' }, { status: 400 })
  }

  const supabase = await createClient()

  const { error } = await supabase.from('solicitacoes_admissao').insert({
    org_id: tenant.org.id,
    tipo: tipo === 'voluntario' ? 'voluntario' : 'aluno',
    nome,
    email: email || null,
    telefone: telefone || null,
    dados: { data_nascimento, responsavel_nome, responsavel_telefone, mensagem },
    status: 'pendente',
  })

  if (error) {
    console.error('[public/solicitacoes POST]', error)
    return NextResponse.json({ error: 'Não foi possível enviar agora. Tente novamente.' }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 201 })
}
