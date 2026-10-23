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
  const { titulo, conteudo, imagem_url, categoria, publicado } = body

  if (!titulo) return NextResponse.json({ error: 'Título obrigatório' }, { status: 400 })

  const orgId = await resolveOrgId(session.profile)
  if (!orgId) return NextResponse.json({ error: 'Organização não identificada' }, { status: 400 })
  const supabase = await createServiceClient()

  const { data, error } = await supabase.from('site_posts').insert({
    org_id: orgId,
    titulo,
    conteudo: conteudo || null,
    imagem_url: imagem_url || null,
    categoria: categoria || 'projeto',
    publicado: !!publicado,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ post: data }, { status: 201 })
}
