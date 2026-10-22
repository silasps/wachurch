import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'
import { canGerenciarFinanceiro } from '@/lib/rbac'
import LancamentosList from './_components/lancamentos-list'
import type { LancamentoFinanceiro } from '@/types'

interface SearchParams { tipo?: string; status?: string; mes?: string; q?: string }

export default async function LancamentosPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { profile } = await requireRole(['admin', 'funcionario', 'superadmin'])
  const supabase = await createClient()
  const orgId = profile.org_id
  const canDelete = canGerenciarFinanceiro(profile.role)

  const { tipo, status, mes, q } = await searchParams

  let query = supabase
    .from('financeiro_lancamentos')
    .select('*')
    .eq('org_id', orgId)
    .order('data_lancamento', { ascending: false })

  if (tipo && tipo !== 'todos') query = query.eq('tipo', tipo)
  if (status && status !== 'todos') query = query.eq('status', status)
  if (mes) {
    const [ano, mesNum] = mes.split('-')
    const ultimoDia = new Date(Number(ano), Number(mesNum), 0).getDate()
    query = query.gte('data_lancamento', `${mes}-01`).lte('data_lancamento', `${mes}-${ultimoDia}`)
  }
  if (q) query = query.ilike('descricao', `%${q}%`)

  const { data: lancamentos } = await query

  const rows = (lancamentos ?? []) as LancamentoFinanceiro[]
  const totalReceitas = rows.filter(l => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0)
  const totalDespesas = rows.filter(l => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0)

  const filtros = (
    <form method="GET" className="flex flex-wrap gap-2 mb-6">
      <select name="tipo" defaultValue={tipo ?? 'todos'} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
        <option value="todos">Todos os tipos</option>
        <option value="receita">Receitas</option>
        <option value="despesa">Despesas</option>
      </select>
      <select name="status" defaultValue={status ?? 'todos'} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
        <option value="todos">Todos os status</option>
        <option value="pendente">Pendente</option>
        <option value="pago">Pago</option>
        <option value="atrasado">Atrasado</option>
        <option value="cancelado">Cancelado</option>
      </select>
      <input type="month" name="mes" defaultValue={mes ?? ''} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <input type="search" name="q" defaultValue={q ?? ''} placeholder="Buscar descrição..." className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 min-w-[160px]" />
      <button type="submit" className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition">Filtrar</button>
    </form>
  )

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <LancamentosList rows={rows} totalReceitas={totalReceitas} totalDespesas={totalDespesas} canDelete={canDelete} filtros={filtros} />
    </div>
  )
}
