import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { resolveOrgId } from '@/lib/org'
import { getSession, isAdmin } from '@/lib/auth'

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || !isAdmin(session.profile.role)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const body = await request.json()
  const { titulo, imagem_url, descricao } = body

  if (!imagem_url) return NextResponse.json({ error: 'URL da imagem obrigatória' }, { status: 400 })

  const orgId = await resolveOrgId(session.profile)
  if (!orgId) return NextResponse.json({ error: 'Organização não identificada' }, { status: 400 })
  const supabase = await createServiceClient()

  const { data, error } = await supabase.from('site_galeria').insert({
    org_id: orgId,
    titulo: titulo || null,
    imagem_url,
    descricao: descricao || null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ foto: data }, { status: 201 })
}

export async function DELETE(request: Request) {
  const session = await getSession()
  if (!session || !isAdmin(session.profile.role)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const orgId = await resolveOrgId(session.profile)
  if (!orgId) return NextResponse.json({ error: 'Organização não identificada' }, { status: 400 })
  const supabase = await createServiceClient()

  const { error } = await supabase
    .from('site_galeria')
    .delete()
    .eq('id', id)
    .eq('org_id', orgId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
