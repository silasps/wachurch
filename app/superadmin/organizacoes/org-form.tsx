'use client'

import { useState } from 'react'
import { Loader2, Eye, EyeOff, Check, X } from 'lucide-react'
import { LICENCAS, PLANOS, type LicencaId } from '@/lib/modulos'
import { REQUISITOS_SENHA, isSenhaForte, isValidCnpj, isValidEmail, maskCnpj } from '@/lib/mascaras'

const INPUT = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
const INPUT_ERRO = INPUT.replace('border-gray-300', 'border-red-400').replace('focus:ring-blue-500', 'focus:ring-red-400')

interface OrgFormProps {
  onSuccess: () => void
  onCancel: () => void
}

export default function OrgForm({ onSuccess, onCancel }: OrgFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verSenha, setVerSenha] = useState(false)
  // Só mostra erro de campo depois que a pessoa sai dele (ou tenta enviar)
  const [tocado, setTocado] = useState({ cnpj: false, email: false, senha: false })

  const [form, setForm] = useState({
    nome: '',
    slug: '',
    cnpj: '',
    plano: 'free',
    licenca: 'igreja' as LicencaId,
    adminNome: '',
    adminEmail: '',
    adminSenha: '',
  })

  function handleNomeChange(nome: string) {
    const slug = nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    setForm(f => ({ ...f, nome, slug }))
  }

  const erroCnpj = form.cnpj && !isValidCnpj(form.cnpj) ? 'CNPJ inválido. Confira os números.' : null
  const erroEmail = form.adminEmail && !isValidEmail(form.adminEmail.trim()) ? 'E-mail inválido. Ex.: nome@igreja.org.br' : null
  const senhaForte = isSenhaForte(form.adminSenha)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setTocado({ cnpj: true, email: true, senha: true })
    if (erroCnpj || erroEmail || !senhaForte) {
      setError(erroCnpj || erroEmail || 'A senha ainda não atende a todos os requisitos.')
      return
    }
    setLoading(true)

    try {
      const res = await fetch('/api/superadmin/organizacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao criar organização')
        return
      }

      onSuccess()
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Dados da organização */}
      <div className="border border-gray-200 rounded-xl p-4 sm:p-5 space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Dados da organização
        </h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome da organização *</label>
            <input
              value={form.nome}
              onChange={e => handleNomeChange(e.target.value)}
              required
              placeholder="Igreja Batista Central"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug (subdomínio) *</label>
            <input
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                required
                placeholder="cib"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500 truncate">{form.slug || 'slug'}.ostricksocial.com.br</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
            <input
              value={form.cnpj}
              onChange={e => setForm(f => ({ ...f, cnpj: maskCnpj(e.target.value) }))}
              onBlur={() => setTocado(t => ({ ...t, cnpj: true }))}
              inputMode="numeric"
              maxLength={18}
              placeholder="00.000.000/0000-00"
              aria-invalid={tocado.cnpj && !!erroCnpj}
              className={tocado.cnpj && erroCnpj ? INPUT_ERRO : INPUT}
            />
            {tocado.cnpj && erroCnpj && <p className="mt-1 text-xs text-red-600">{erroCnpj}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Licença *</label>
            <select
              value={form.licenca}
              onChange={e => setForm(f => ({ ...f, licenca: e.target.value as LicencaId }))}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {(Object.keys(LICENCAS) as LicencaId[]).map(id => (
                <option key={id} value={id}>{LICENCAS[id].label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plano</label>
            <select
              value={form.plano}
              onChange={e => setForm(f => ({ ...f, plano: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {PLANOS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Administrador inicial */}
      <div className="border border-gray-200 rounded-xl p-4 sm:p-5 space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Primeiro administrador
        </h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo *</label>
            <input
              value={form.adminNome}
              onChange={e => setForm(f => ({ ...f, adminNome: e.target.value }))}
              required
              placeholder="Maria Silva"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              value={form.adminEmail}
              onChange={e => setForm(f => ({ ...f, adminEmail: e.target.value }))}
              onBlur={() => setTocado(t => ({ ...t, email: true }))}
              required
              autoComplete="off"
              placeholder="secretaria@igreja.org.br"
              aria-invalid={tocado.email && !!erroEmail}
              className={tocado.email && erroEmail ? INPUT_ERRO : INPUT}
            />
            {tocado.email && erroEmail && <p className="mt-1 text-xs text-red-600">{erroEmail}</p>}
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha inicial *</label>
            <div className="relative">
              <input
                type={verSenha ? 'text' : 'password'}
                value={form.adminSenha}
                onChange={e => setForm(f => ({ ...f, adminSenha: e.target.value }))}
                onBlur={() => setTocado(t => ({ ...t, senha: true }))}
                required
                autoComplete="new-password"
                aria-describedby="requisitos-senha"
                className={`${tocado.senha && !senhaForte ? INPUT_ERRO : INPUT} pr-10`}
              />
              <button
                type="button"
                onClick={() => setVerSenha(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600"
                aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {verSenha ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <ul id="requisitos-senha" className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
              {REQUISITOS_SENHA.map(r => {
                const ok = r.ok(form.adminSenha)
                return (
                  <li key={r.id} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-700' : tocado.senha ? 'text-red-600' : 'text-gray-500'}`}>
                    {ok ? <Check size={13} /> : <X size={13} />}
                    {r.label}
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500 transition disabled:opacity-50"
        >
          {loading && <Loader2 size={15} className="animate-spin" />}
          Criar organização
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 text-gray-600 hover:text-gray-900 text-sm transition"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
