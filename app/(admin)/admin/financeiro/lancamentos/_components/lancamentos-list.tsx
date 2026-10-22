'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import DeleteLancamentoButton from './delete-lancamento-button'
import LancamentoForm from './lancamento-form'
import type { LancamentoFinanceiro, LancamentoStatus } from '@/types'

function formatBRL(centavos: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100)
}

function formatDate(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR')
}

const STATUS_COLORS: Record<LancamentoStatus, string> = {
  pendente:  'bg-yellow-100 text-yellow-800',
  pago:      'bg-green-100 text-green-800',
  atrasado:  'bg-red-100 text-red-800',
  cancelado: 'bg-gray-100 text-gray-600',
}

const STATUS_LABELS: Record<LancamentoStatus, string> = {
  pendente:  'Pendente',
  pago:      'Pago',
  atrasado:  'Atrasado',
  cancelado: 'Cancelado',
}

const CATEGORIA_LABELS: Record<string, string> = {
  doacao: 'Doação', mensalidade: 'Mensalidade', patrocinio: 'Patrocínio',
  subvencao: 'Subvenção', prestacao_servico: 'Prestação de Serviço', evento_receita: 'Evento',
  honorario_professor: 'Honorário Prof.', folha_pagamento: 'Folha de Pagamento',
  infraestrutura: 'Infraestrutura', material: 'Material', evento_despesa: 'Evento',
  administrativo: 'Administrativo', outros: 'Outros',
}

interface LancamentosListProps {
  rows: LancamentoFinanceiro[]
  totalReceitas: number
  totalDespesas: number
  canDelete: boolean
  filtros: React.ReactNode
}

export default function LancamentosList({ rows, totalReceitas, totalDespesas, canDelete, filtros }: LancamentosListProps) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<LancamentoFinanceiro | null>(null)

  function abrirNovo() {
    setEditando(null)
    setModalOpen(true)
  }

  function abrirEditar(l: LancamentoFinanceiro) {
    setEditando(l)
    setModalOpen(true)
  }

  function fecharModal() {
    setModalOpen(false)
  }

  function handleSuccess() {
    setModalOpen(false)
    router.refresh()
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lançamentos</h1>
          <p className="text-gray-500 text-sm mt-1">{rows.length} resultado{rows.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={abrirNovo}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition shrink-0"
        >
          <Plus size={15} />
          Novo
        </button>
      </div>

      {filtros}

      {/* Totals bar */}
      {rows.length > 0 && (
        <div className="flex gap-4 mb-4 text-sm">
          <span className="text-green-700 font-medium">Receitas: {formatBRL(totalReceitas)}</span>
          <span className="text-gray-300">|</span>
          <span className="text-red-700 font-medium">Despesas: {formatBRL(totalDespesas)}</span>
          <span className="text-gray-300">|</span>
          <span className={`font-semibold ${totalReceitas - totalDespesas >= 0 ? 'text-green-800' : 'text-red-800'}`}>
            Resultado: {formatBRL(totalReceitas - totalDespesas)}
          </span>
        </div>
      )}

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {rows.map(l => (
          <div key={l.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{l.descricao}</p>
                <p className="text-xs text-gray-500 mt-0.5">{CATEGORIA_LABELS[l.categoria]} · {formatDate(l.data_lancamento)}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => abrirEditar(l)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition">
                  <Pencil size={15} />
                </button>
                {canDelete && <DeleteLancamentoButton id={l.id} />}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${l.tipo === 'receita' ? 'text-green-700' : 'text-red-700'}`}>
                {l.tipo === 'receita' ? '+' : '-'} {formatBRL(l.valor)}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[l.status]}`}>
                {STATUS_LABELS[l.status]}
              </span>
            </div>
          </div>
        ))}
        {rows.length === 0 && <EmptyState />}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Data</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Descrição</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Categoria</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Vencimento</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Valor</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(l => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(l.data_lancamento)}</td>
                <td className="px-4 py-3 text-gray-900 font-medium max-w-[240px] truncate">{l.descricao}</td>
                <td className="px-4 py-3 text-gray-500">{CATEGORIA_LABELS[l.categoria]}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{l.data_vencimento ? formatDate(l.data_vencimento) : '—'}</td>
                <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${l.tipo === 'receita' ? 'text-green-700' : 'text-red-700'}`}>
                  {l.tipo === 'receita' ? '+' : '-'} {formatBRL(l.valor)}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[l.status]}`}>
                    {STATUS_LABELS[l.status]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => abrirEditar(l)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition">
                      <Pencil size={15} />
                    </button>
                    {canDelete && <DeleteLancamentoButton id={l.id} />}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <EmptyState />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        onClose={fecharModal}
        title={editando ? 'Editar lançamento' : 'Novo lançamento'}
        description={editando?.descricao}
        maxWidth="max-w-2xl"
      >
        <LancamentoForm inicial={editando ?? undefined} onSuccess={handleSuccess} onCancel={fecharModal} />
      </Modal>
    </>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
        <span className="text-2xl">💰</span>
      </div>
      <p className="text-sm font-medium text-gray-700">Nenhum lançamento encontrado</p>
      <p className="text-xs text-gray-400 mt-1">Ajuste os filtros ou crie um novo lançamento</p>
    </div>
  )
}
