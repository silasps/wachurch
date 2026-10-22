import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { resolveOrgFromHost } from '@/lib/tenant'
import { orgTemModulo } from '@/lib/modulos'
import {
  CARTA_MAX_BYTES, CARTA_MIME, FOTO_MAX_BYTES, FOTO_MIME, contatoPrivacidade, cursoSeAplica,
} from '@/lib/membros'
import { validarDadosMembro } from '@/lib/membros-validacao'
import {
  encontrarDuplicado, enviarArquivo, getClientIp, getMembresiaConfig, registrarConsentimentos, removerArquivos,
} from '@/lib/membros-server'

// Formulário público de cadastro de membros (multipart: campos + foto + carta).
// Grava com service_role DEPOIS de resolver a org pelo host — não existe policy anônima
// em `membros` (dado sensível pela LGPD). A resposta é a mesma havendo ou não CPF repetido,
// para não revelar quem já é membro.
export async function POST(request: Request) {
  const host = request.headers.get('host') || ''
  const tenant = await resolveOrgFromHost(host)
  if (!tenant || !orgTemModulo(tenant.org, 'igreja')) {
    return NextResponse.json({ error: 'Igreja não encontrada.' }, { status: 404 })
  }
  const org = tenant.org

  const config = await getMembresiaConfig(org.id)
  if (!config.formulario_aberto) {
    return NextResponse.json({ error: 'O cadastro está fechado no momento.' }, { status: 403 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Não foi possível ler o envio. Os arquivos podem estar grandes demais.' }, { status: 400 })
  }

  // Honeypot: campo invisível que só robôs preenchem — finge sucesso sem gravar
  if (String(form.get('website') ?? '').trim()) {
    return NextResponse.json({ success: true }, { status: 201 })
  }

  const entrada = Object.fromEntries(
    [...form.entries()].filter(([, v]) => typeof v === 'string')
  )
  const { dados, erros, idade } = validarDadosMembro(entrada, { estrito: true })

  if (form.get('consentimento') !== 'true') {
    erros.consentimento = 'É preciso autorizar o uso dos dados para enviar o cadastro.'
  }

  const queroSer = dados.tipo_cadastro === 'quer_ser_membro'
  if (queroSer && cursoSeAplica(config, dados.forma_ingresso) && dados.fez_curso_integracao === null) {
    erros.fez_curso_integracao = `Responda se você já participou do ${config.curso_nome}.`
  }
  if (!(queroSer && cursoSeAplica(config, dados.forma_ingresso))) dados.fez_curso_integracao = null

  const foto = form.get('foto')
  const fotoFile = foto instanceof File && foto.size > 0 ? foto : null
  if (fotoFile && (!FOTO_MIME.includes(fotoFile.type) || fotoFile.size > FOTO_MAX_BYTES)) {
    erros.foto = 'A foto precisa ser uma imagem de até 2 MB.'
  }

  const carta = form.get('carta')
  const ehTransferencia = queroSer && dados.forma_ingresso === 'transferencia'
  const cartaFile = ehTransferencia && carta instanceof File && carta.size > 0 ? carta : null
  if (cartaFile && (!CARTA_MIME.includes(cartaFile.type) || cartaFile.size > CARTA_MAX_BYTES)) {
    erros.carta = 'A carta precisa ser uma foto ou PDF de até 3,5 MB.'
  }
  if (!ehTransferencia) dados.carta_entrega_presencial = false
  if (ehTransferencia && !cartaFile && !dados.carta_entrega_presencial) {
    erros.carta = 'Envie a carta ou marque que vai entregá-la pessoalmente.'
  }

  if (Object.keys(erros).length) {
    return NextResponse.json({ error: Object.values(erros)[0], erros }, { status: 400 })
  }

  // Histórico só faz sentido para quem já é membro
  if (queroSer) {
    dados.ano_batismo = null
    dados.membro_desde_ano = null
  }
  if (idade !== null && idade >= 18) {
    dados.responsavel_nome = null
    dados.responsavel_celular = null
  }

  const supabase = await createServiceClient()
  const possivelDuplicado = await encontrarDuplicado(org.id, dados.cpf)

  const { data: membro, error } = await supabase
    .from('membros')
    .insert({
      ...dados,
      org_id: org.id,
      situacao: queroSer ? 'candidato' : 'pendente',
      origem: 'formulario_publico',
      possivel_duplicado_de: possivelDuplicado,
    })
    .select('id')
    .single()

  if (error || !membro) {
    console.error('[public/membros POST] insert', error)
    return NextResponse.json({ error: 'Não foi possível enviar agora. Tente novamente em instantes.' }, { status: 500 })
  }

  const enviados: string[] = []
  try {
    const update: Record<string, string> = {}
    if (fotoFile) {
      update.foto_path = await enviarArquivo(org.id, membro.id, 'foto', fotoFile)
      enviados.push(update.foto_path)
    }
    if (cartaFile) {
      update.carta_path = await enviarArquivo(org.id, membro.id, 'carta', cartaFile)
      enviados.push(update.carta_path)
    }
    if (Object.keys(update).length) {
      const { error: upErr } = await supabase.from('membros').update(update).eq('id', membro.id)
      if (upErr) throw upErr
    }

    await registrarConsentimentos({
      orgId: org.id,
      membroId: membro.id,
      igreja: org.nome,
      contato: contatoPrivacidade(config, org),
      coletadoPor: idade !== null && idade < 18 ? 'responsavel' : 'titular',
      comunicacoes: dados.aceita_comunicacoes,
      ip: getClientIp(request.headers),
      userAgent: request.headers.get('user-agent'),
    })
  } catch (err) {
    // Desfaz tudo para a pessoa poder tentar de novo sem deixar cadastro pela metade
    console.error('[public/membros POST] arquivos/consentimento', err)
    await removerArquivos(enviados)
    await supabase.from('membros').delete().eq('id', membro.id)
    return NextResponse.json({ error: 'Não foi possível enviar os arquivos. Tente novamente.' }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 201 })
}
