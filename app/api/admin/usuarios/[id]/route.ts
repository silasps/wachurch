import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getApiContext } from '@/lib/org'
import { canGerenciarUsuarios } from '@/lib/rbac'
import { modulosDaOrg } from '@/lib/modulos'
import { normalizarAreas, rolesDisponiveis } from '@/lib/usuarios'

interface Params { params: Promise<{ id: string }> }

// Edita função, áreas de acesso e status de um usuário da org
export async function PATCH(request: Request, { params }: Params) {
  const ctx = await getApiContext()
  if (!ctx || !canGerenciarUsuarios(ctx.profile.role) || !ctx.org) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }
  const { id } = await params
  const org = ctx.org
  const modulosOrg = modulosDaOrg(org)

  const supabase = await createServiceClient()
  const { data: alvo } = await supabase.from('profiles').select('id, role').eq('id', id).eq('org_id', org.id).maybeSingle()
  if (!alvo || alvo.role === 'superadmin') return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  const body = await request.json()
  const role = String(body.role ?? alvo.role)
  if (!rolesDisponiveis(modulosOrg).some(r => r.value === role)) {
    return NextResponse.json({ error: 'Função inválida para esta licença' }, { status: 400 })
  }
  // Evita o admin se trancar fora (rebaixar a si mesmo ou se desativar)
  if (id === ctx.profile.id && (role !== alvo.role || body.ativo === false)) {
    return NextResponse.json({ error: 'Você não pode alterar a própria função nem se desativar.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      role,
      areas: normalizarAreas(body.areas, modulosOrg, role),
      ...(typeof body.ativo === 'boolean' ? { ativo: body.ativo } : {}),
    })
    .eq('id', id)
    .eq('org_id', org.id)
  if (error) return NextResponse.json({ error: 'Não foi possível salvar.' }, { status: 500 })

  await supabase.auth.admin.updateUserById(id, { user_metadata: { role } })
  return NextResponse.json({ ok: true })
}
