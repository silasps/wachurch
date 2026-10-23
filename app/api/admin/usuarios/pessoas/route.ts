import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getApiContext } from '@/lib/org'
import { canGerenciarUsuarios } from '@/lib/rbac'
import { areasDoUsuario } from '@/lib/modulos'
import { soDigitos } from '@/lib/mascaras'

export interface PessoaCadastrada {
  origem: 'membro' | 'aluno'
  id: string
  nome: string
  email: string | null
  telefone: string | null
  jaUsuario: boolean
}

// Busca pessoas já cadastradas na org (membros e alunos) para transformar em usuário
export async function GET(request: Request) {
  const ctx = await getApiContext()
  if (!ctx || !canGerenciarUsuarios(ctx.profile.role) || !ctx.org) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }
  const org = ctx.org
  const q = (new URL(request.url).searchParams.get('q') ?? '').trim().slice(0, 80)
  if (q.length < 2) return NextResponse.json({ pessoas: [] })

  const areas = areasDoUsuario(ctx.profile, org)
  const supabase = await createServiceClient()
  const digitos = soDigitos(q)
  const filtroNome = `nome.ilike.%${q.replace(/[%,()]/g, ' ')}%`

  const [membros, alunos] = await Promise.all([
    areas.includes('igreja')
      ? supabase.from('membros').select('id, nome, email, celular, profile_id')
          .eq('org_id', org.id).neq('situacao', 'recusado')
          .or(digitos.length >= 3 ? `${filtroNome},cpf.like.%${digitos}%` : filtroNome)
          .order('nome').limit(8)
      : Promise.resolve({ data: [] }),
    areas.includes('social')
      ? supabase.from('alunos').select('id, nome, email, telefone, profile_id')
          .eq('org_id', org.id).or(filtroNome).order('nome').limit(8)
      : Promise.resolve({ data: [] }),
  ])

  const pessoas: PessoaCadastrada[] = [
    ...(membros.data ?? []).map(m => ({ origem: 'membro' as const, id: m.id, nome: m.nome, email: m.email, telefone: m.celular, jaUsuario: !!m.profile_id })),
    ...(alunos.data ?? []).map(a => ({ origem: 'aluno' as const, id: a.id, nome: a.nome, email: a.email, telefone: a.telefone, jaUsuario: !!a.profile_id })),
  ]
  return NextResponse.json({ pessoas })
}
