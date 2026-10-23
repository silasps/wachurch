import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { resolveOrgId } from '@/lib/org'
import { getSession, isAdmin } from '@/lib/auth'

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || !isAdmin(session.profile.role)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const { domain } = await request.json()
  if (!domain) return NextResponse.json({ error: 'Domínio obrigatório' }, { status: 400 })

  const cleaned = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')

  const orgId = await resolveOrgId(session.profile)
  if (!orgId) return NextResponse.json({ error: 'Organização não identificada' }, { status: 400 })
  const supabase = await createServiceClient()

  const { error } = await supabase.from('custom_domains').insert({
    org_id: orgId,
    domain: cleaned,
    verificado: false,
  })

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Este domínio já está cadastrado' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 201 })
}
