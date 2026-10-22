import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { canGerenciarMembros } from '@/lib/rbac'
import { CARTA_MAX_BYTES, CARTA_MIME, FOTO_MAX_BYTES, FOTO_MIME } from '@/lib/membros'
import { autorizarMembros, enviarArquivo, removerArquivos } from '@/lib/membros-server'

interface Params { params: Promise<{ id: string }> }

const COLUNA = { foto: 'foto_path', carta: 'carta_path' } as const
type TipoArquivo = keyof typeof COLUNA

async function carregar(orgId: string, id: string) {
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from('membros')
    .select('id, foto_path, carta_path')
    .eq('id', id)
    .eq('org_id', orgId)
    .maybeSingle()
  return data as { id: string; foto_path: string | null; carta_path: string | null } | null
}

// Troca a foto ou a carta (multipart: tipo=foto|carta, file)
export async function POST(request: Request, { params }: Params) {
  const auth = await autorizarMembros(canGerenciarMembros)
  if (!auth.ok) return auth.res
  const { org } = auth
  const { id } = await params

  const membro = await carregar(org.id, id)
  if (!membro) return NextResponse.json({ error: 'Cadastro não encontrado' }, { status: 404 })

  const form = await request.formData()
  const tipo = String(form.get('tipo')) as TipoArquivo
  const file = form.get('file')
  if (!(tipo in COLUNA) || !(file instanceof File) || !file.size) {
    return NextResponse.json({ error: 'Arquivo inválido' }, { status: 400 })
  }
  const [mimes, max] = tipo === 'foto' ? [FOTO_MIME, FOTO_MAX_BYTES] : [CARTA_MIME, CARTA_MAX_BYTES]
  if (!mimes.includes(file.type) || file.size > max) {
    return NextResponse.json({ error: tipo === 'foto' ? 'Foto inválida (até 2 MB).' : 'Carta inválida (foto ou PDF até 3,5 MB).' }, { status: 400 })
  }

  const path = await enviarArquivo(org.id, id, tipo, file)
  const update: Record<string, unknown> = { [COLUNA[tipo]]: path }
  if (tipo === 'carta') update.carta_recebida = true

  const supabase = await createServiceClient()
  const { error } = await supabase.from('membros').update(update).eq('id', id).eq('org_id', org.id)
  if (error) {
    await removerArquivos([path])
    return NextResponse.json({ error: 'Não foi possível salvar o arquivo.' }, { status: 500 })
  }
  await removerArquivos([membro[COLUNA[tipo]]])
  return NextResponse.json({ ok: true })
}

// Remove a foto ou a carta (?tipo=foto|carta)
export async function DELETE(request: Request, { params }: Params) {
  const auth = await autorizarMembros(canGerenciarMembros)
  if (!auth.ok) return auth.res
  const { org } = auth
  const { id } = await params

  const tipo = new URL(request.url).searchParams.get('tipo') as TipoArquivo
  if (!(tipo in COLUNA)) return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })

  const membro = await carregar(org.id, id)
  if (!membro) return NextResponse.json({ error: 'Cadastro não encontrado' }, { status: 404 })

  const supabase = await createServiceClient()
  const { error } = await supabase.from('membros').update({ [COLUNA[tipo]]: null }).eq('id', id).eq('org_id', org.id)
  if (error) return NextResponse.json({ error: 'Não foi possível remover.' }, { status: 500 })
  await removerArquivos([membro[COLUNA[tipo]]])
  return NextResponse.json({ ok: true })
}
