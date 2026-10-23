import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getApiContext } from '@/lib/org'
import { canGerenciarUsuarios } from '@/lib/rbac'
import { modulosDaOrg } from '@/lib/modulos'
import { isSenhaForte, isValidEmail } from '@/lib/mascaras'
import { normalizarAreas, rolesDisponiveis } from '@/lib/usuarios'

// Cria usuário da org (com áreas de acesso). Opcionalmente vincula a uma pessoa já cadastrada
// (membro ou aluno), que passa a apontar para o novo usuário.
export async function POST(request: Request) {
  const ctx = await getApiContext()
  if (!ctx || !canGerenciarUsuarios(ctx.profile.role) || !ctx.org) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }
  const org = ctx.org
  const modulosOrg = modulosDaOrg(org)

  const body = await request.json()
  const nome = String(body.nome ?? '').trim()
  const email = String(body.email ?? '').trim().toLowerCase()
  const telefone = String(body.telefone ?? '').trim()
  const role = String(body.role ?? '')
  const senha = String(body.senha ?? '')

  if (!nome || !email || !senha || !role) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
  }
  if (!isValidEmail(email)) return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 })
  if (!isSenhaForte(senha)) {
    return NextResponse.json({ error: 'A senha precisa ter 8+ caracteres, letra maiúscula, minúscula e número' }, { status: 400 })
  }
  if (!rolesDisponiveis(modulosOrg).some(r => r.value === role)) {
    return NextResponse.json({ error: 'Função inválida para esta licença' }, { status: 400 })
  }
  const areas = normalizarAreas(body.areas, modulosOrg, role)

  const supabase = await createServiceClient()
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome, org_id: org.id, role },
  })
  if (authError) {
    const jaExiste = /already|registered|exists/i.test(authError.message)
    return NextResponse.json({ error: jaExiste ? 'Já existe um usuário com este e-mail.' : authError.message }, { status: jaExiste ? 409 : 500 })
  }

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: authUser.user.id,
    org_id: org.id,
    nome,
    email,
    telefone: telefone || null,
    role,
    areas,
  })
  if (profileError) {
    await supabase.auth.admin.deleteUser(authUser.user.id)
    return NextResponse.json({ error: 'Não foi possível criar o usuário.' }, { status: 500 })
  }

  // Vínculo com pessoa já cadastrada (só da própria org)
  const vinculo = body.vinculo as { origem?: string; id?: string } | undefined
  if (vinculo?.id && (vinculo.origem === 'membro' || vinculo.origem === 'aluno')) {
    await supabase
      .from(vinculo.origem === 'membro' ? 'membros' : 'alunos')
      .update({ profile_id: authUser.user.id })
      .eq('id', vinculo.id)
      .eq('org_id', org.id)
  }

  return NextResponse.json({ success: true }, { status: 201 })
}
