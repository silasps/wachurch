import { headers } from 'next/headers'
import { requireRole } from '@/lib/auth'
import { requireModulo } from '@/lib/org'
import { createServiceClient } from '@/lib/supabase-server'
import { canConfigurarMembresia } from '@/lib/rbac'
import { assinarUrls, getMembresiaConfig } from '@/lib/membros-server'
import type { Membro, MembroSituacao } from '@/types'
import MembrosList, { type AbaMembros, type MembroLinha } from './membros-list'

const ABAS: Record<AbaMembros, MembroSituacao[]> = {
  conferir: ['pendente'],
  candidatos: ['candidato'],
  ativos: ['ativo'],
  inativos: ['inativo', 'recusado'],
}

export default async function MembrosPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string; q?: string }>
}) {
  const params = await searchParams
  const { profile } = await requireRole(['admin', 'funcionario', 'superadmin'])
  const org = await requireModulo(profile, 'igreja')
  // Service client: a org efetiva pode ser a impersonada pelo superadmin (o filtro por org_id é explícito)
  const supabase = await createServiceClient()

  const contar = (situacoes: MembroSituacao[]) =>
    supabase.from('membros').select('*', { count: 'exact', head: true }).eq('org_id', org.id).in('situacao', situacoes)

  const [conferir, candidatos, ativos, inativos] = await Promise.all(
    (Object.keys(ABAS) as AbaMembros[]).map(a => contar(ABAS[a]))
  )
  const contagens: Record<AbaMembros, number> = {
    conferir: conferir.count ?? 0,
    candidatos: candidatos.count ?? 0,
    ativos: ativos.count ?? 0,
    inativos: inativos.count ?? 0,
  }

  const aba: AbaMembros = params.aba && params.aba in ABAS
    ? (params.aba as AbaMembros)
    : contagens.conferir > 0 ? 'conferir' : 'ativos'
  const q = params.q?.trim() ?? ''

  let query = supabase.from('membros').select('*').eq('org_id', org.id).in('situacao', ABAS[aba]).limit(500)
  // Filas de trabalho (conferir/candidatos): mais antigos primeiro; demais: ordem alfabética
  query = aba === 'conferir' || aba === 'candidatos'
    ? query.order('created_at', { ascending: true })
    : query.order('nome')
  if (q) {
    const digitos = q.replace(/\D/g, '')
    query = /^[\d.\-\s]+$/.test(q) && digitos.length >= 3
      ? query.like('cpf', `%${digitos}%`)
      : query.ilike('nome', `%${q}%`)
  }
  const { data } = await query
  const membros = (data ?? []) as Membro[]

  // Nomes dos cadastros originais quando há suspeita de duplicidade
  const idsOriginais = [...new Set(membros.map(m => m.possivel_duplicado_de).filter((x): x is string => !!x))]
  const { data: originais } = idsOriginais.length
    ? await supabase.from('membros').select('id, nome, situacao').in('id', idsOriginais)
    : { data: [] }
  const nomeOriginal = new Map((originais ?? []).map(o => [o.id, o.nome as string]))

  const urls = await assinarUrls(membros.flatMap(m => [m.foto_path, m.carta_path]))

  const linhas: MembroLinha[] = membros.map(m => ({
    ...m,
    fotoUrl: m.foto_path ? urls[m.foto_path] ?? null : null,
    cartaUrl: m.carta_path ? urls[m.carta_path] ?? null : null,
    duplicadoDeNome: m.possivel_duplicado_de ? nomeOriginal.get(m.possivel_duplicado_de) ?? null : null,
  }))

  const config = await getMembresiaConfig(org.id)

  // Link do formulário público: domínio próprio verificado > subdomínio da plataforma
  const host = (await headers()).get('host') || ''
  const { data: dominio } = await supabase
    .from('custom_domains').select('domain').eq('org_id', org.id).eq('verificado', true).limit(1).maybeSingle()
  const porta = host.includes(':') ? `:${host.split(':')[1]}` : ''
  const base = dominio?.domain
    ? `https://${dominio.domain}`
    : host.includes('localhost')
      ? `http://${org.slug}.localhost${porta}`
      : `https://${org.slug}.ostricksocial.com.br`

  return (
    <MembrosList
      membros={linhas}
      contagens={contagens}
      aba={aba}
      q={q}
      config={{
        formulario_aberto: config.formulario_aberto,
        curso_nome: config.curso_nome,
        curso_descricao: config.curso_descricao,
        curso_caminhos: config.curso_caminhos,
        texto_aclamacao: config.texto_aclamacao,
        texto_transferencia: config.texto_transferencia,
        texto_batismo: config.texto_batismo,
        contato_privacidade: config.contato_privacidade,
        mensagem_sucesso: config.mensagem_sucesso,
      }}
      linkCadastro={`${base}/cadastro`}
      podeConfigurar={canConfigurarMembresia(profile.role)}
    />
  )
}
