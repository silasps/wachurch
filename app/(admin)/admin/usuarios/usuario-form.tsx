'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'

interface UsuarioFormProps {
  onSuccess: () => void
  onCancel: () => void
}

export default function UsuarioForm({ onSuccess, onCancel }: UsuarioFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    nome: '', email: '', telefone: '', role: 'professor', senha: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/admin/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro ao criar usuário'); return }
      onSuccess()
    } catch {
      setError('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo *</label>
        <input
          value={form.nome}
          onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
          required placeholder="João da Silva"
          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
        <input
          type="email" value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          required placeholder="joao@email.com"
          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
        <input
          value={form.telefone}
          onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
          placeholder="(41) 99999-9999"
          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Função *</label>
        <select
          value={form.role}
          onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="professor">Professor</option>
          <option value="funcionario">Funcionário</option>
          <option value="admin">Administrador</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Senha inicial *</label>
        <input
          type="password" value={form.senha}
          onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
          required minLength={8} placeholder="Mínimo 8 caracteres"
          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">{error}</div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit" disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading && <Loader2 size={15} className="animate-spin" />}
          Criar usuário
        </button>
        <button
          type="button" onClick={onCancel}
          className="px-5 py-2.5 text-gray-500 hover:text-gray-700 text-sm transition"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
