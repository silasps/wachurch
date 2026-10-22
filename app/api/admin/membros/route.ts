import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { canGerenciarMembros } from '@/lib/rbac'
import { CARTA_MAX_BYTES, CARTA_MIME, FOTO_MAX_BYTES, FOTO_MIME, contatoPrivacidade } from '@/lib/membros'
import { validarDadosMembro } from '@/lib/membros-validacao'
import {
  autorizarMembros, encontrarDuplicado, enviarArquivo, getClientIp, getMembresiaConfig,
  registrarConsentimentos, removerArquivos,
} from '@/lib/membros-server'

// Cadastro feito pela secretaria (ex.: pessoa sem celular, ficha em papel).
// Multipart: campos + foto? + carta?. Exige registro de consentimento presencial.
export async function POST(request: Request) {
  const auth = await autorizarMembros(canGerenciarMembros)
  if (!auth.ok) return auth.res
  const { profile, org } = auth

  const form = await request.formData()
  const entrada = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === 'string'))
  const { dados, erros } = validarDadosMembro(entrada, { estrito: false })

  const situacao = String(form.get('situacao') ?? 'ativo')
  if (!['pendente', 'candidato', 'ativo'].includes(situacao)) erros.situacao = 'Situação inválida.'
  if (form.get('consentimento_presencial') !== 'true') {
    erros.consentimento_presencial = 'Confirme que o consentimento foi coletado (ficha assinada ou autorização verbal registrada).'
  }

  const foto = form.get('foto')
  const fotoFile = foto instanceof File && foto.size > 0 ? foto : null
  if (fotoFile && (!FOTO_MIME.includes(fotoFile.type) || fotoFile.size > FOTO_MAX_BYTES)) erros.foto = 'Foto inválida (até 2 MB).'
  const carta = form.get('carta')
  const cartaFile = carta instanceof File && carta.size > 0 ? carta : null
  if (cartaFile && (!CARTA_MIME.includes(cartaFile.type) || cartaFile.size > CARTA_MAX_BYTES)) erros.carta = 'Carta inválida (foto ou PDF até 3,5 MB).'

  if (Object.keys(erros).length) {
    return NextResponse.json({ error: Object.values(erros)[0], erros }, { status: 400 })
  }

  const duplicado = await encontrarDuplicado(org.id, dados.cpf)
  if (duplicado) {
    return NextResponse.json({ error: 'Já existe um cadastro com este CPF. Procure pelo CPF na lista.' }, { status: 409 })
  }

  const ativo = situacao === 'ativo'
  const supabase = await createServiceClient()
  const { data: membro, error } = await supabase
    .from('membros')
    .insert({
      ...dados,
      tipo_cadastro: situacao === 'candidato' ? 'quer_ser_membro' : dados.tipo_cadastro,
      org_id: org.id,
      situacao,
      origem: 'secretaria',
      observacoes_internas: String(form.get('observacoes_internas') ?? '').trim().slice(0, 2000) || null,
      carta_recebida: form.get('carta_recebida') === 'true' || !!cartaFile,
      aprovado_por: ativo ? profile.id : null,
      aprovado_em: ativo ? new Date().toISOString() : null,
    })
    .select('id')
    .single()

  if (error || !membro) {
    console.error('[admin/membros POST]', error)
    return NextResponse.json({ error: 'Não foi possível salvar o cadastro.' }, { status: 500 })
  }

  const enviados: string[] = []
  try {
    const update: Record<string, string> = {}
    if (fotoFile) enviados.push(update.foto_path = await enviarArquivo(org.id, membro.id, 'foto', fotoFile))
    if (cartaFile) enviados.push(update.carta_path = await enviarArquivo(org.id, membro.id, 'carta', cartaFile))
    if (Object.keys(update).length) {
      const { error: upErr } = await supabase.from('membros').update(update).eq('id', membro.id)
      if (upErr) throw upErr
    }
    const config = await getMembresiaConfig(org.id)
    await registrarConsentimentos({
      orgId: org.id,
      membroId: membro.id,
      igreja: org.nome,
      contato: contatoPrivacidade(config, org),
      coletadoPor: 'secretaria_presencial',
      comunicacoes: dados.aceita_comunicacoes,
      ip: getClientIp(request.headers),
      userAgent: request.headers.get('user-agent'),
    })
  } catch (err) {
    console.error('[admin/membros POST] arquivos/consentimento', err)
    await removerArquivos(enviados)
    await supabase.from('membros').delete().eq('id', membro.id)
    return NextResponse.json({ error: 'Não foi possível salvar os arquivos. Tente novamente.' }, { status: 500 })
  }

  return NextResponse.json({ id: membro.id }, { status: 201 })
}
