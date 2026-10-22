import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { canGerenciarMembros, canVerMembros } from '@/lib/rbac'
import { validarDadosMembro } from '@/lib/membros-validacao'
import {
  autorizarMembros, encontrarDuplicado, getClientIp, getMembresiaConfig, registrarConsentimentoComunicacoes, removerArquivos,
} from '@/lib/membros-server'
import { contatoPrivacidade } from '@/lib/membros'
import type { Membro, MembroSituacao } from '@/types'

interface Params { params: Promise<{ id: string }> }

const ISO_DATA = /^\d{4}-\d{2}-\d{2}$/
const hoje = () => new Date().toISOString().slice(0, 10)

// Transições de situação permitidas por ação
const ACOES: Record<string, { de: MembroSituacao[]; para: (m: Membro) => MembroSituacao }> = {
  confirmar: { de: ['pendente'], para: () => 'ativo' },
  receber:   { de: ['candidato'], para: () => 'ativo' },
  recusar:   { de: ['pendente', 'candidato'], para: () => 'recusado' },
  inativar:  { de: ['ativo'], para: () => 'inativo' },
  reativar:  { de: ['inativo'], para: () => 'ativo' },
  reabrir:   { de: ['recusado'], para: m => (m.tipo_cadastro === 'quer_ser_membro' ? 'candidato' : 'pendente') },
}

async function carregar(orgId: string, id: string) {
  const supabase = await createServiceClient()
  const { data } = await supabase.from('membros').select('*').eq('id', id).eq('org_id', orgId).maybeSingle()
  return data as Membro | null
}

// Provas de consentimento LGPD do cadastro (exibidas no detalhe)
export async function GET(_request: Request, { params }: Params) {
  const auth = await autorizarMembros(canVerMembros)
  if (!auth.ok) return auth.res
  const { org } = auth
  const { id } = await params

  const supabase = await createServiceClient()
  const { data } = await supabase
    .from('consentimentos')
    .select('id, finalidade, versao, coletado_por, created_at, revogado_em')
    .eq('membro_id', id)
    .eq('org_id', org.id)
    .order('created_at', { ascending: false })
  return NextResponse.json({ consentimentos: data ?? [] })
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await autorizarMembros(canGerenciarMembros)
  if (!auth.ok) return auth.res
  const { profile, org } = auth
  const { id } = await params

  const membro = await carregar(org.id, id)
  if (!membro) return NextResponse.json({ error: 'Cadastro não encontrado' }, { status: 404 })

  const body = await request.json()
  const acao = String(body.acao ?? '')
  const update: Record<string, unknown> = {}

  if (acao === 'editar') {
    const { dados, erros } = validarDadosMembro({ ...body, tipo_cadastro: membro.tipo_cadastro }, { estrito: false })
    if (Object.keys(erros).length) {
      return NextResponse.json({ error: Object.values(erros)[0], erros }, { status: 400 })
    }
    if (dados.cpf && dados.cpf !== membro.cpf) {
      const dup = await encontrarDuplicado(org.id, dados.cpf, membro.id)
      if (dup) return NextResponse.json({ error: 'Já existe outro cadastro com este CPF.' }, { status: 409 })
    }
    Object.assign(update, dados, {
      observacoes_internas: typeof body.observacoes_internas === 'string' ? body.observacoes_internas.trim().slice(0, 2000) || null : membro.observacoes_internas,
      carta_recebida: body.carta_recebida === undefined ? membro.carta_recebida : !!body.carta_recebida,
      data_batismo: ISO_DATA.test(body.data_batismo ?? '') ? body.data_batismo : null,
      data_recepcao: ISO_DATA.test(body.data_recepcao ?? '') ? body.data_recepcao : null,
    })
    // Consentimento de comunicações só muda pela ação 'comunicacoes' (registra revogação/novo consentimento)
    update.aceita_comunicacoes = membro.aceita_comunicacoes
    if (body.carta_entrega_presencial === undefined) update.carta_entrega_presencial = membro.carta_entrega_presencial
    // Corrigir o CPF resolve a suspeita de duplicidade
    if (dados.cpf !== membro.cpf) update.possivel_duplicado_de = await encontrarDuplicado(org.id, dados.cpf, membro.id)
  } else if (acao === 'checklist') {
    // Acompanhamento do candidato: curso, carta e batismo
    if (body.fez_curso_integracao !== undefined) update.fez_curso_integracao = body.fez_curso_integracao === null ? null : !!body.fez_curso_integracao
    if (body.carta_recebida !== undefined) update.carta_recebida = !!body.carta_recebida
    if (body.data_batismo !== undefined) update.data_batismo = ISO_DATA.test(body.data_batismo ?? '') ? body.data_batismo : null
  } else if (acao === 'comunicacoes') {
    // Só a pedido do titular. Desligar = revogação (LGPD art. 18, IX); religar = novo consentimento registrado
    const aceita = body.aceita === true
    update.aceita_comunicacoes = aceita
    const supabase = await createServiceClient()
    if (aceita && !membro.aceita_comunicacoes) {
      const config = await getMembresiaConfig(org.id)
      await registrarConsentimentoComunicacoes({
        orgId: org.id, membroId: id, igreja: org.nome, contato: contatoPrivacidade(config, org),
        ip: getClientIp(request.headers), userAgent: request.headers.get('user-agent'),
      })
    } else if (!aceita) {
      await supabase
        .from('consentimentos')
        .update({ revogado_em: new Date().toISOString() })
        .eq('membro_id', id)
        .eq('finalidade', 'comunicacoes')
        .is('revogado_em', null)
    }
  } else if (acao in ACOES) {
    const regra = ACOES[acao]
    if (!regra.de.includes(membro.situacao)) {
      return NextResponse.json({ error: 'Esta ação não se aplica à situação atual do cadastro.' }, { status: 409 })
    }
    update.situacao = regra.para(membro)
    if (acao === 'confirmar' || acao === 'receber') {
      update.aprovado_por = profile.id
      update.aprovado_em = new Date().toISOString()
    }
    if (acao === 'receber') {
      update.data_recepcao = ISO_DATA.test(body.data_recepcao ?? '') ? body.data_recepcao : hoje()
      if (ISO_DATA.test(body.data_batismo ?? '')) update.data_batismo = body.data_batismo
    }
    if (acao === 'inativar') {
      const motivo = String(body.motivo ?? '').trim().slice(0, 300)
      if (!motivo) return NextResponse.json({ error: 'Informe o motivo.' }, { status: 400 })
      update.motivo_inativacao = motivo
    }
    if (acao === 'reativar') update.motivo_inativacao = null
  } else {
    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  }

  const supabase = await createServiceClient()
  const { error } = await supabase.from('membros').update(update).eq('id', id).eq('org_id', org.id)
  if (error) {
    console.error('[admin/membros PATCH]', error)
    return NextResponse.json({ error: 'Não foi possível salvar.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

// Exclusão definitiva (ex.: pedido do titular — LGPD art. 18, VI). Apaga também os arquivos.
export async function DELETE(_request: Request, { params }: Params) {
  const auth = await autorizarMembros(canGerenciarMembros)
  if (!auth.ok) return auth.res
  const { org } = auth
  const { id } = await params

  const membro = await carregar(org.id, id)
  if (!membro) return NextResponse.json({ error: 'Cadastro não encontrado' }, { status: 404 })

  const supabase = await createServiceClient()
  const { data: arquivos } = await supabase.storage.from('membros-arquivos').list(`${org.id}/${id}`)
  await removerArquivos([
    membro.foto_path,
    membro.carta_path,
    ...(arquivos ?? []).map(a => `${org.id}/${id}/${a.name}`),
  ])

  const { error } = await supabase.from('membros').delete().eq('id', id).eq('org_id', org.id)
  if (error) {
    console.error('[admin/membros DELETE]', error)
    return NextResponse.json({ error: 'Não foi possível excluir.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
