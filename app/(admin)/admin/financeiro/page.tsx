import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'
import { canGerenciarFinanceiro } from '@/lib/rbac'
import { TrendingUp, TrendingDown, Wallet, Clock, Plus, FileText, List } from 'lucide-react'

function formatBRL(centavos: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100)
}

function getMesAtual() {
  const now = new Date()
  const ano = now.getFullYear()
  const mes = String(now.getMonth() + 1).padStart(2, '0')
  const inicio = `${ano}-${mes}-01`
  const ultimoDia = new Date(ano, now.getMonth() + 1, 0).getDate()
  const fim = `${ano}-${mes}-${String(ultimoDia).padStart(2, '0')}`
  const label = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return { inicio, fim, label }
}

export default async function FinanceiroPage() {
  const { profile } = await requireRole(['admin', 'funcionario', 'superadmin'])
  const supabase = await createClient()
  const orgId = profile.org_id
  const { inicio, fim, label } = getMesAtual()

  const [
    { data: todosPagos },
    { data: doMes },
    { data: pendentes },
    { count: totalLancamentos },
  ] = await Promise.all([
    supabase.from('financeiro_lancamentos').select('tipo, valor').eq('org_id', orgId).eq('status', 'pago'),
    supabase.from('financeiro_lancamentos').select('tipo, valor').eq('org_id', orgId).gte('data_lancamento', inicio).lte('data_lancamento', fim),
    supabase.from('financeiro_lancamentos').select('tipo, valor').eq('org_id', orgId).in('status', ['pendente', 'atrasado']),
    supabase.from('financeiro_lancamentos').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
  ])

  const saldoTotal = (todosPagos ?? []).reduce((acc, l) => acc + (l.tipo === 'receita' ? l.valor : -l.valor), 0)
  const receitasMes = (doMes ?? []).filter(l => l.tipo === 'receita').reduce((acc, l) => acc + l.valor, 0)
  const despesasMes = (doMes ?? []).filter(l => l.tipo === 'despesa').reduce((acc, l) => acc + l.valor, 0)
  const totalAVencer = (pendentes ?? []).filter(l => l.tipo === 'despesa').reduce((acc, l) => acc + l.valor, 0)
  const totalAReceber = (pendentes ?? []).filter(l => l.tipo === 'receita').reduce((acc, l) => acc + l.valor, 0)

  const canDelete = canGerenciarFinanceiro(profile.role)

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
          <p className="text-gray-500 text-sm mt-1">Gestão financeira da organização</p>
        </div>
        {canDelete && (
          <Link
            href="/admin/financeiro/lancamentos"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition shrink-0"
          >
            <Plus size={15} />
            Novo lançamento
          </Link>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SaldoCard label="Saldo acumulado" value={saldoTotal} icon={Wallet} positive={saldoTotal >= 0} />
        <SaldoCard label={`Receitas — ${label}`} value={receitasMes} icon={TrendingUp} positive />
        <SaldoCard label={`Despesas — ${label}`} value={despesasMes} icon={TrendingDown} positive={false} />
        <div className="bg-amber-50 rounded-xl p-5 border border-amber-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock size={14} className="text-amber-600" />
            </div>
            <p className="text-xs font-medium text-amber-700">Pendentes</p>
          </div>
          <p className="text-xl font-bold text-amber-800">{formatBRL(totalAVencer)}</p>
          <p className="text-xs text-amber-600 mt-1">a pagar · {formatBRL(totalAReceber)} a receber</p>
        </div>
      </div>

      {/* Resultado do mês */}
      {(receitasMes > 0 || despesasMes > 0) && (
        <div className={`rounded-xl p-4 mb-8 flex items-center gap-3 border ${receitasMes >= despesasMes ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${receitasMes >= despesasMes ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {receitasMes >= despesasMes ? '+' : '-'}
          </div>
          <div>
            <p className={`text-sm font-semibold ${receitasMes >= despesasMes ? 'text-green-800' : 'text-red-800'}`}>
              Resultado de {label}: {formatBRL(Math.abs(receitasMes - despesasMes))} {receitasMes >= despesasMes ? 'positivo' : 'negativo'}
            </p>
            <p className={`text-xs mt-0.5 ${receitasMes >= despesasMes ? 'text-green-600' : 'text-red-600'}`}>
              Receitas ({formatBRL(receitasMes)}) − Despesas ({formatBRL(despesasMes)})
            </p>
          </div>
        </div>
      )}

      {/* Quick nav */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          href="/admin/financeiro/lancamentos"
          className="bg-white rounded-xl border border-gray-200 p-5 hover:bg-gray-50 transition flex items-center gap-4"
        >
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
            <List size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">Lançamentos</p>
            <p className="text-sm text-gray-500 mt-0.5">{totalLancamentos ?? 0} registros · visualizar, criar e editar</p>
          </div>
        </Link>

        <Link
          href="/admin/financeiro/relatorios"
          className="bg-white rounded-xl border border-gray-200 p-5 hover:bg-gray-50 transition flex items-center gap-4"
        >
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center shrink-0">
            <FileText size={20} className="text-purple-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">Relatórios</p>
            <p className="text-sm text-gray-500 mt-0.5">DRE simplificada e fluxo de caixa</p>
          </div>
        </Link>
      </div>
    </div>
  )
}

function SaldoCard({ label, value, icon: Icon, positive }: {
  label: string; value: number; icon: React.ElementType; positive: boolean
}) {
  const color = positive
    ? { bg: 'bg-green-50', icon: 'bg-green-100 text-green-600', label: 'text-green-700', value: 'text-green-800' }
    : { bg: 'bg-red-50', icon: 'bg-red-100 text-red-600', label: 'text-red-700', value: 'text-red-800' }

  return (
    <div className={`${color.bg} rounded-xl p-5 border border-transparent`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color.icon}`}>
          <Icon size={14} />
        </div>
        <p className={`text-xs font-medium ${color.label}`}>{label}</p>
      </div>
      <p className={`text-xl font-bold ${color.value} break-all`}>{formatBRL(value)}</p>
    </div>
  )
}
