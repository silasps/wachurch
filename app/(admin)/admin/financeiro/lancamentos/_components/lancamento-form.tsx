'use client'

import { useState } from 'react'
import type { LancamentoFinanceiro, LancamentoStatus } from '@/types'

const CATEGORIAS = {
  receita: [
    { value: 'doacao', label: 'Doação' },
    { value: 'mensalidade', label: 'Mensalidade' },
    { value: 'patrocinio', label: 'Patrocínio' },
    { value: 'subvencao', label: 'Subvenção' },
    { value: 'prestacao_servico', label: 'Prestação de Serviço' },
    { value: 'evento_receita', label: 'Evento' },
  ],
  despesa: [
    { value: 'honorario_professor', label: 'Honorário Professor' },
    { value: 'folha_pagamento', label: 'Folha de Pagamento' },
    { value: 'infraestrutura', label: 'Infraestrutura' },
    { value: 'material', label: 'Material' },
    { value: 'evento_despesa', label: 'Evento' },
    { value: 'administrativo', label: 'Administrativo' },
    { value: 'outros', label: 'Outros' },
  ],
}

const INPUT = 'w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
const LABEL = 'block text-sm font-medium text-gray-700 mb-1'
const SECTION = 'bg-white rounded-xl border border-gray-200 p-6 space-y-4'

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function parseCentavos(str: string): number {
  const cleaned = str.replace(/\./g, '').replace(',', '.')
  const val = parseFloat(cleaned)
  return isNaN(val) ? 0 : Math.round(val * 100)
}

function formatValorDisplay(centavos: number): string {
  if (centavos === 0) return ''
  return (centavos / 100).toFixed(2).replace('.', ',')
}

interface LancamentoFormProps {
  inicial?: LancamentoFinanceiro
  onSuccess: () => void
  onCancel: () => void
}

export default function LancamentoForm({ inicial, onSuccess, onCancel }: LancamentoFormProps) {
  const editando = !!inicial

  const [tipo, setTipo] = useState<'receita' | 'despesa'>(inicial?.tipo ?? 'receita')
  const [categoria, setCategoria] = useState(inicial?.categoria ?? '')
  const [descricao, setDescricao] = useState(inicial?.descricao ?? '')
  const [valorStr, setValorStr] = useState(inicial ? formatValorDisplay(inicial.valor) : '')
  const [dataLancamento, setDataLancamento] = useState(inicial?.data_lancamento ?? todayStr())
  const [status, setStatus] = useState<LancamentoStatus>(inicial?.status ?? 'pendente')
  const [dataVencimento, setDataVencimento] = useState(inicial?.data_vencimento ?? '')
  const [dataPagamento, setDataPagamento] = useState(inicial?.data_pagamento ?? '')
  const [refTipo, setRefTipo] = useState(inicial?.referencia_tipo ?? '')
  const [refId, setRefId] = useState(inicial?.referencia_id ?? '')
  const [observacoes, setObservacoes] = useState(inicial?.observacoes ?? '')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const categoriasDisponiveis = CATEGORIAS[tipo]

  function handleTipoChange(novoTipo: 'receita' | 'despesa') {
    setTipo(novoTipo)
    setCategoria('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const valor = parseCentavos(valorStr)
    if (!categoria) { setErro('Selecione uma categoria.'); return }
    if (!descricao.trim()) { setErro('Informe a descrição.'); return }
    if (valor <= 0) { setErro('Informe um valor válido.'); return }
    if (!dataLancamento) { setErro('Informe a data do lançamento.'); return }

    setErro('')
    setLoading(true)

    try {
      const url = editando
        ? `/api/admin/financeiro/lancamentos/${inicial!.id}`
        : '/api/admin/financeiro/lancamentos'
      const method = editando ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo, categoria, descricao: descricao.trim(), valor,
          data_lancamento: dataLancamento,
          data_vencimento: dataVencimento || null,
          data_pagamento: status === 'pago' ? (dataPagamento || null) : null,
          status,
          referencia_tipo: refTipo || null,
          referencia_id: refId || null,
          observacoes: observacoes.trim() || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setErro(data.error ?? 'Erro ao salvar lançamento.')
        return
      }

      onSuccess()
    } catch {
      setErro('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Tipo */}
      <div className={SECTION}>
        <h2 className="text-sm font-semibold text-gray-800">Tipo de lançamento</h2>
        <div className="flex gap-3">
          {(['receita', 'despesa'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => handleTipoChange(t)}
              className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-medium transition ${
                tipo === t
                  ? t === 'receita'
                    ? 'border-green-500 bg-green-50 text-green-800'
                    : 'border-red-500 bg-red-50 text-red-800'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {t === 'receita' ? '+ Receita' : '- Despesa'}
            </button>
          ))}
        </div>
      </div>

      {/* Dados principais */}
      <div className={SECTION}>
        <h2 className="text-sm font-semibold text-gray-800">Dados do lançamento</h2>

        <div>
          <label className={LABEL}>Categoria *</label>
          <select value={categoria} onChange={e => setCategoria(e.target.value)} className={INPUT} required>
            <option value="">Selecione...</option>
            {categoriasDisponiveis.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={LABEL}>Descrição *</label>
          <input
            type="text"
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            placeholder="Ex: Mensalidade João Silva — junho/2026"
            className={INPUT}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Valor (R$) *</label>
            <input
              type="text"
              inputMode="decimal"
              value={valorStr}
              onChange={e => setValorStr(e.target.value)}
              placeholder="0,00"
              className={INPUT}
              required
            />
          </div>
          <div>
            <label className={LABEL}>Data do lançamento *</label>
            <input type="date" value={dataLancamento} onChange={e => setDataLancamento(e.target.value)} className={INPUT} required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Status *</label>
            <select value={status} onChange={e => setStatus(e.target.value as LancamentoStatus)} className={INPUT} required>
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
              <option value="atrasado">Atrasado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>Data de vencimento</label>
            <input type="date" value={dataVencimento} onChange={e => setDataVencimento(e.target.value)} className={INPUT} />
          </div>
        </div>

        {status === 'pago' && (
          <div>
            <label className={LABEL}>Data de pagamento</label>
            <input type="date" value={dataPagamento} onChange={e => setDataPagamento(e.target.value)} className={INPUT} />
          </div>
        )}
      </div>

      {/* Referência (opcional) */}
      <div className={SECTION}>
        <h2 className="text-sm font-semibold text-gray-800">Referência <span className="font-normal text-gray-400">(opcional)</span></h2>
        <p className="text-xs text-gray-500">Vincule este lançamento a um professor, aluno ou voluntário.</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Tipo</label>
            <select value={refTipo} onChange={e => setRefTipo(e.target.value)} className={INPUT}>
              <option value="">Nenhum</option>
              <option value="professor">Professor</option>
              <option value="aluno">Aluno</option>
              <option value="voluntario">Voluntário</option>
            </select>
          </div>
          {refTipo && (
            <div>
              <label className={LABEL}>ID do {refTipo}</label>
              <input
                type="text"
                value={refId}
                onChange={e => setRefId(e.target.value)}
                placeholder="UUID do registro"
                className={INPUT}
              />
            </div>
          )}
        </div>
      </div>

      {/* Observações */}
      <div className={SECTION}>
        <h2 className="text-sm font-semibold text-gray-800">Observações <span className="font-normal text-gray-400">(opcional)</span></h2>
        <textarea
          value={observacoes}
          onChange={e => setObservacoes(e.target.value)}
          rows={3}
          placeholder="Informações adicionais sobre este lançamento..."
          className={INPUT}
        />
      </div>

      {erro && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{erro}</div>
      )}

      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? 'Salvando...' : editando ? 'Salvar alterações' : 'Criar lançamento'}
        </button>
      </div>
    </form>
  )
}
