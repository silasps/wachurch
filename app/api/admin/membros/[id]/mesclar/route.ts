import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { canGerenciarMembros } from '@/lib/rbac'
import { autorizarMembros, removerArquivos } from '@/lib/membros-server'
import type { Membro } from '@/types'

interface Params { params: Promise<{ id: string }> }

// Dados pessoais/de contato que o novo envio atualiza no cadastro existente.
// Situação, ingresso e campos internos do cadastro existente são preservados.
const CAMPOS_ATUALIZAVEIS = [
  'nome', 'data_nascimento', 'sexo', 'estado_civil', 'celular', 'celular_whatsapp', 'email',
  'ano_batismo', 'membro_desde_ano', 'responsavel_nome', 'responsavel_celular',
] as const

// Mescla um envio marcado como "possível duplicado" no cadastro existente (mesmo CPF):
// copia os dados preenchidos, troca a foto se veio uma nova, move os consentimentos e
// apaga o envio duplicado.
export async function POST(_request: Request, { params }: Params) {
  const auth = await autorizarMembros(canGerenciarMembros)
  if (!auth.ok) return auth.res
  const { org } = auth
  const { id } = await params

  const supabase = await createServiceClient()
  const { data: novo } = await supabase.from('membros').select('*').eq('id', id).eq('org_id', org.id).maybeSingle()
  if (!novo?.possivel_duplicado_de) {
    return NextResponse.json({ error: 'Este cadastro não está marcado como duplicado.' }, { status: 400 })
  }
  const { data: existente } = await supabase
    .from('membros').select('*').eq('id', novo.possivel_duplicado_de).eq('org_id', org.id).maybeSingle()
  if (!existente) {
    return NextResponse.json({ error: 'O cadastro original não existe mais.' }, { status: 404 })
  }

  const n = novo as Membro
  const e = existente as Membro
  const update: Record<string, unknown> = {}
  for (const campo of CAMPOS_ATUALIZAVEIS) {
    if (n[campo] !== null && n[campo] !== '') update[campo] = n[campo]
  }
  if (Object.keys(n.endereco ?? {}).length) update.endereco = n.endereco
  if (n.aceita_comunicacoes) update.aceita_comunicacoes = true
  const fotoAntiga = n.foto_path ? e.foto_path : null
  if (n.foto_path) update.foto_path = n.foto_path

  const { error } = await supabase.from('membros').update(update).eq('id', e.id)
  if (error) {
    console.error('[admin/membros mesclar] update', error)
    return NextResponse.json({ error: 'Não foi possível mesclar.' }, { status: 500 })
  }

  // Mantém a prova de consentimento do envio novo no cadastro existente
  await supabase.from('consentimentos').update({ membro_id: e.id }).eq('membro_id', n.id)

  // A foto nova continua no caminho do envio duplicado (só a referência muda)
  await removerArquivos([fotoAntiga, n.carta_path])
  await supabase.from('membros').delete().eq('id', n.id)

  return NextResponse.json({ ok: true, id: e.id })
}
