'use client'

import { useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import type { HorarioItem } from '@/types'

const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']

interface TurmaFormProps {
  professores: { id: string; nome: string }[]
  onSuccess: () => void
  onCancel: () => void
}

export default function TurmaForm({ professores, onSuccess, onCancel }: TurmaFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    nome: '', descricao: '', professor_id: '', capacidade: '', status: 'ativa',
  })
  const [horario, setHorario] = useState<HorarioItem[]>([])

  function addHorario() {
    setHorario(h => [...h, { dia: 'Segunda', hora_inicio: '08:00', hora_fim: '09:00' }])
  }

  function removeHorario(idx: number) {
    setHorario(h => h.filter((_, i) => i !== idx))
  }

  function updateHorario(idx: number, field: keyof HorarioItem, value: string) {
    setHorario(h => h.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/admin/turmas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, horario, capacidade: form.capacidade ? parseInt(form.capacidade) : null }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro ao criar turma'); return }
      onSuccess()
    } catch {
      setError('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Dados da turma</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome da turma *</label>
          <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required placeholder="Ex: Balé — Turma Infantil" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
          <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={2} className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Professor</label>
            <select value={form.professor_id} onChange={e => setForm(f => ({ ...f, professor_id: e.target.value }))} className={inputClass}>
              <option value="">Sem professor</option>
              {professores.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Capacidade</label>
            <input type="number" min="1" value={form.capacidade} onChange={e => setForm(f => ({ ...f, capacidade: e.target.value }))} placeholder="Ilimitada" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={inputClass}>
              <option value="ativa">Ativa</option>
              <option value="pausada">Pausada</option>
              <option value="encerrada">Encerrada</option>
            </select>
          </div>
        </div>
      </div>

      {/* Horários */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Horários</h2>
          <button type="button" onClick={addHorario} className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium">
            <Plus size={14} /> Adicionar dia
          </button>
        </div>
        {horario.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Nenhum horário configurado</p>
        ) : (
          <div className="space-y-3">
            {horario.map((h, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <select value={h.dia} onChange={e => updateHorario(idx, 'dia', e.target.value)}
                  className="sm:flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {DIAS.map(d => <option key={d}>{d}</option>)}
                </select>
                <div className="flex items-center gap-2">
                  <input type="time" value={h.hora_inicio} onChange={e => updateHorario(idx, 'hora_inicio', e.target.value)}
                    className="flex-1 sm:w-28 sm:flex-none px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <span className="text-gray-400 text-sm shrink-0">até</span>
                  <input type="time" value={h.hora_fim} onChange={e => updateHorario(idx, 'hora_fim', e.target.value)}
                    className="flex-1 sm:w-28 sm:flex-none px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button type="button" onClick={() => removeHorario(idx)} className="text-gray-400 hover:text-red-500 transition shrink-0">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">{error}</div>}

      <div className="flex gap-3">
        <button type="submit" disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
          {loading && <Loader2 size={15} className="animate-spin" />}
          Criar turma
        </button>
        <button type="button" onClick={onCancel} className="px-5 py-2.5 text-gray-500 hover:text-gray-700 text-sm transition">Cancelar</button>
      </div>
    </form>
  )
}
