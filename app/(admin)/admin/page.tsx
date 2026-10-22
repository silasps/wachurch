import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { canVerFinanceiro, canVerMembros } from '@/lib/rbac'
import { getCurrentOrg } from '@/lib/org'
import { nomeDoTipo, orgTemModulo } from '@/lib/modulos'

function formatBRL(centavos: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100)
}

export default async function AdminDashboardPage() {
  const { profile } = await requireRole(['admin', 'funcionario', 'superadmin'])
  const supabase = await createClient()
  const orgId = profile.org_id
  const verFinanceiro = canVerFinanceiro(profile.role)
  const org = await getCurrentOrg(profile)
  const temSocial = orgTemModulo(org, 'social')
  const temIgreja = orgTemModulo(org, 'igreja') && canVerMembros(profile.role)

  const now = new Date()
  const mesInicio = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const ultimoDia = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const mesFim = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${ultimoDia}`
  const mesLabel = now.toLocaleDateString('pt-BR', { month: 'long' })

  const [
    { count: alunosAtivos },
    { count: turmasAtivas },
    { count: voluntariosAtivos },
    { count: solicitacoesPendentes },
    { data: todosPagos },
    { data: lancamentosDoMes },
  ] = await Promise.all([
    supabase.from('alunos').select('*', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'ativo'),
    supabase.from('turmas').select('*', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'ativa'),
    supabase.from('participantes_voluntariado').select('*', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'ativo'),
    supabase.from('solicitacoes_admissao').select('*', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'pendente'),
    verFinanceiro
      ? supabase.from('financeiro_lancamentos').select('tipo, valor').eq('org_id', orgId).eq('status', 'pago')
      : Promise.resolve({ data: [] }),
    verFinanceiro
      ? supabase.from('financeiro_lancamentos').select('tipo, valor').eq('org_id', orgId).eq('status', 'pago').gte('data_lancamento', mesInicio).lte('data_lancamento', mesFim)
      : Promise.resolve({ data: [] }),
  ])

  // Módulo igreja: org efetiva (pode ser a impersonada) — service client com filtro explícito
  let membrosAtivos = 0
  let membrosConferir = 0
  let candidatos = 0
  if (temIgreja && org) {
    const service = await createServiceClient()
    const contar = (situacao: string) =>
      service.from('membros').select('*', { count: 'exact', head: true }).eq('org_id', org.id).eq('situacao', situacao)
    const [a, p, c] = await Promise.all([contar('ativo'), contar('pendente'), contar('candidato')])
    membrosAtivos = a.count ?? 0
    membrosConferir = p.count ?? 0
    candidatos = c.count ?? 0
  }

  const saldoTotal = (todosPagos ?? []).reduce((acc: number, l: { tipo: string; valor: number }) => acc + (l.tipo === 'receita' ? l.valor : -l.valor), 0)
  const receitasMes = (lancamentosDoMes ?? []).filter((l: { tipo: string }) => l.tipo === 'receita').reduce((acc: number, l: { valor: number }) => acc + l.valor, 0)
  const despesasMes = (lancamentosDoMes ?? []).filter((l: { tipo: string }) => l.tipo === 'despesa').reduce((acc: number, l: { valor: number }) => acc + l.valor, 0)

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Visão geral da {nomeDoTipo(org?.tipo)}</p>
      </div>

      {temIgreja && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Membros ativos" value={membrosAtivos} color="green" href="/admin/membros?aba=ativos" />
          <StatCard label="Cadastros para conferir" value={membrosConferir} color="orange" href="/admin/membros?aba=conferir" />
          <StatCard label="Candidatos a membro" value={candidatos} color="blue" href="/admin/membros?aba=candidatos" />
        </div>
      )}

      {temSocial && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Alunos ativos" value={alunosAtivos ?? 0} color="blue" href="/admin/alunos" />
          <StatCard label="Turmas ativas" value={turmasAtivas ?? 0} color="green" href="/admin/turmas" />
          <StatCard label="Voluntários" value={voluntariosAtivos ?? 0} color="purple" href="/admin/voluntariado" />
          <StatCard label="Inscrições pendentes" value={solicitacoesPendentes ?? 0} color="orange" href="/admin/alunos/solicitacoes" />
        </div>
      )}

      {/* Card financeiro */}
      {verFinanceiro && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Financeiro — {mesLabel}</h2>
            <Link href="/admin/financeiro" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
              Ver detalhes →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FinanceCard label="Saldo atual" value={saldoTotal} color={saldoTotal >= 0 ? 'green' : 'red'} />
            <FinanceCard label="Receitas" value={receitasMes} color="green" />
            <FinanceCard label="Despesas" value={despesasMes} color="red" />
          </div>
        </div>
      )}

      {temSocial && (solicitacoesPendentes ?? 0) > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 text-sm font-bold">
            {solicitacoesPendentes}
          </div>
          <div>
            <p className="text-sm font-medium text-amber-800">
              {solicitacoesPendentes} solicitaç{(solicitacoesPendentes ?? 0) === 1 ? 'ão' : 'ões'} de inscrição aguardando análise
            </p>
            <a href="/admin/alunos/solicitacoes" className="text-xs text-amber-600 hover:text-amber-700 font-medium">
              Ver solicitações →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

const colorMap = {
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   num: 'text-blue-600' },
  green:  { bg: 'bg-green-50',  text: 'text-green-700',  num: 'text-green-600' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', num: 'text-purple-600' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', num: 'text-orange-600' },
}

function StatCard({ label, value, color, href }: { label: string; value: number; color: keyof typeof colorMap; href: string }) {
  const c = colorMap[color]
  return (
    <Link href={href} className={`${c.bg} rounded-xl p-5 border border-transparent hover:brightness-95 active:scale-[0.98] transition-all block`}>
      <p className={`text-xs font-medium ${c.text} mb-2`}>{label}</p>
      <p className={`text-3xl font-bold ${c.num}`}>{value}</p>
    </Link>
  )
}

const financeColorMap = {
  green: { bg: 'bg-green-50', text: 'text-green-600', label: 'text-green-700' },
  red:   { bg: 'bg-red-50',   text: 'text-red-600',   label: 'text-red-700' },
}

function FinanceCard({ label, value, color }: { label: string; value: number; color: 'green' | 'red' }) {
  const c = financeColorMap[color]
  return (
    <div className={`${c.bg} rounded-xl p-4 border border-transparent`}>
      <p className={`text-xs font-medium ${c.label} mb-1.5`}>{label}</p>
      <p className={`text-lg font-bold ${c.text} break-all`}>{formatBRL(Math.abs(value))}</p>
    </div>
  )
}
