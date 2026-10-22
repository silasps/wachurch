import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { canConfigurarMembresia } from '@/lib/rbac'
import { CAMINHOS_INGRESSO } from '@/lib/membros'
import { autorizarMembros } from '@/lib/membros-server'

const texto = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) || null : null)

// Configuração do formulário público de membros (só admin)
export async function PUT(request: Request) {
  const auth = await autorizarMembros(canConfigurarMembresia)
  if (!auth.ok) return auth.res
  const { org } = auth

  const body = await request.json()
  const caminhos = Array.isArray(body.curso_caminhos)
    ? body.curso_caminhos.filter((c: unknown) => CAMINHOS_INGRESSO.includes(c as never))
    : ['batismo']

  const supabase = await createServiceClient()
  const { error } = await supabase.from('membresia_config').upsert({
    org_id: org.id,
    formulario_aberto: body.formulario_aberto !== false,
    curso_nome: texto(body.curso_nome, 80),
    curso_descricao: texto(body.curso_descricao, 300),
    curso_caminhos: caminhos,
    texto_aclamacao: texto(body.texto_aclamacao, 500),
    texto_transferencia: texto(body.texto_transferencia, 500),
    texto_batismo: texto(body.texto_batismo, 500),
    contato_privacidade: texto(body.contato_privacidade, 150),
    mensagem_sucesso: texto(body.mensagem_sucesso, 500),
  }, { onConflict: 'org_id' })

  if (error) {
    console.error('[admin/membresia-config PUT]', error)
    return NextResponse.json({ error: 'Não foi possível salvar.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
