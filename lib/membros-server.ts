// Funções de servidor do módulo Igreja (membros). Usam o service client
// (bypassa RLS) — só chamar depois de validar host/sessão/role/módulo.

import { createHash } from 'crypto'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getApiContext } from '@/lib/org'
import { orgTemModulo } from '@/lib/modulos'
import { CONTENT_TYPE_WEBP, ehImagemRaster, paraWebp } from '@/lib/imagem-server'
import {
  BUCKET_MEMBROS, MEMBRESIA_CONFIG_PADRAO, type MembresiaConfigPublica,
} from '@/lib/membros'
import {
  CONSENTIMENTO_MEMBRO_VERSAO, textoCanonicoComunicacoes, textoCanonicoConsentimentoMembro,
} from '@/lib/termos/content-membro'
import type { Consentimento, MembresiaConfig, Organization, Profile, UserRole } from '@/types'

// Rotas de API do painel: exige sessão, permissão e módulo 'igreja' na licença da org efetiva
export async function autorizarMembros(
  permissao: (role: UserRole) => boolean,
): Promise<{ ok: true; profile: Profile; org: Organization } | { ok: false; res: NextResponse }> {
  const ctx = await getApiContext()
  if (!ctx || !permissao(ctx.profile.role)) {
    return { ok: false, res: NextResponse.json({ error: 'Não autorizado' }, { status: 403 }) }
  }
  if (!ctx.org || !orgTemModulo(ctx.org, 'igreja')) {
    return { ok: false, res: NextResponse.json({ error: 'Módulo Igreja não está disponível nesta licença' }, { status: 403 }) }
  }
  return { ok: true, profile: ctx.profile, org: ctx.org }
}

export async function getMembresiaConfig(orgId: string): Promise<MembresiaConfigPublica & Partial<MembresiaConfig>> {
  const supabase = await createServiceClient()
  const { data } = await supabase.from('membresia_config').select('*').eq('org_id', orgId).maybeSingle()
  return { ...MEMBRESIA_CONFIG_PADRAO, ...(data ?? {}) }
}

// URLs assinadas (curta duração) para arquivos do bucket privado. Retorna { path: url }.
export async function assinarUrls(paths: Array<string | null | undefined>, expiresIn = 60 * 60): Promise<Record<string, string>> {
  const validos = [...new Set(paths.filter((p): p is string => !!p))]
  if (!validos.length) return {}
  const supabase = await createServiceClient()
  const { data } = await supabase.storage.from(BUCKET_MEMBROS).createSignedUrls(validos, expiresIn)
  const mapa: Record<string, string> = {}
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) mapa[item.path] = item.signedUrl
  }
  return mapa
}

export async function removerArquivos(paths: Array<string | null | undefined>) {
  const validos = paths.filter((p): p is string => !!p)
  if (!validos.length) return
  const supabase = await createServiceClient()
  await supabase.storage.from(BUCKET_MEMBROS).remove(validos)
}

const EXT_POR_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
}

// Sobe um arquivo para {org_id}/{membro_id}/{prefixo}-{ts}.{ext} e retorna o path.
// Imagens são sempre gravadas em WebP (foto ~800px, carta ~2000px); PDF segue como está.
export async function enviarArquivo(orgId: string, membroId: string, prefixo: 'foto' | 'carta', file: File): Promise<string> {
  const imagem = ehImagemRaster(file.type)
  const conteudo = imagem
    ? await paraWebp(file, prefixo === 'foto' ? { maxLado: 800, qualidade: 82 } : { maxLado: 2000, qualidade: 80 })
    : Buffer.from(await file.arrayBuffer())
  const contentType = imagem ? CONTENT_TYPE_WEBP : file.type
  const ext = EXT_POR_MIME[contentType] ?? 'bin'
  const path = `${orgId}/${membroId}/${prefixo}-${Date.now()}.${ext}`
  const supabase = await createServiceClient()
  const { error } = await supabase.storage
    .from(BUCKET_MEMBROS)
    .upload(path, conteudo, { contentType, upsert: false })
  if (error) throw error
  return path
}

// Membro já existente com o mesmo CPF na org (ignora recusados e o próprio registro)
export async function encontrarDuplicado(orgId: string, cpf: string | null, excetoId?: string): Promise<string | null> {
  if (!cpf) return null
  const supabase = await createServiceClient()
  let query = supabase
    .from('membros')
    .select('id')
    .eq('org_id', orgId)
    .eq('cpf', cpf)
    .neq('situacao', 'recusado')
    .order('created_at', { ascending: true })
    .limit(1)
  if (excetoId) query = query.neq('id', excetoId)
  const { data } = await query
  return data?.[0]?.id ?? null
}

export function getClientIp(headers: Headers): string | null {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip') || null
}

const sha256 = (texto: string) => createHash('sha256').update(texto, 'utf8').digest('hex')

// Grava a prova de consentimento LGPD (cadastro + comunicações, se aceito)
export async function registrarConsentimentos(params: {
  orgId: string
  membroId: string
  igreja: string
  contato: string | null
  coletadoPor: Consentimento['coletado_por']
  comunicacoes: boolean
  ip: string | null
  userAgent: string | null
}) {
  const { orgId, membroId, igreja, contato, coletadoPor, comunicacoes, ip, userAgent } = params
  const base = {
    org_id: orgId,
    membro_id: membroId,
    versao: CONSENTIMENTO_MEMBRO_VERSAO,
    coletado_por: coletadoPor,
    ip,
    user_agent: userAgent,
  }
  const linhas = [
    { ...base, finalidade: 'cadastro_membro', texto_hash: sha256(textoCanonicoConsentimentoMembro({ igreja, contato })) },
  ]
  if (comunicacoes) {
    linhas.push({ ...base, finalidade: 'comunicacoes', texto_hash: sha256(textoCanonicoComunicacoes({ igreja })) })
  }
  const supabase = await createServiceClient()
  const { error } = await supabase.from('consentimentos').insert(linhas)
  if (error) throw error
}
