'use client'

import { useEffect, useState } from 'react'
import { Loader2, Search, X, Check, Eye, EyeOff, UserRound } from 'lucide-react'
import { AREA_LABELS } from '@/lib/modulos'
import { REQUISITOS_SENHA, isSenhaForte, isValidEmail, maskPhone } from '@/lib/mascaras'
import { rolesDisponiveis } from '@/lib/usuarios'
import type { Modulo, Profile, UserRole } from '@/types'
import type { PessoaCadastrada } from '@/app/api/admin/usuarios/pessoas/route'

interface UsuarioFormProps {
  /** Presente = edição (função, áreas e status); ausente = novo usuário */
  inicial?: Profile
  modulosOrg: Modulo[]
  ehVoceMesmo?: boolean
  onSuccess: () => void
  onCancel: () => void
}

const input = 'w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
const label = 'block text-sm font-medium text-gray-700 mb-1'

export default function UsuarioForm({ inicial, modulosOrg, ehVoceMesmo = false, onSuccess, onCancel }: UsuarioFormProps) {
  const editando = !!inicial
  const roles = rolesDisponiveis(modulosOrg)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verSenha, setVerSenha] = useState(false)
  const [form, setForm] = useState({
    nome: inicial?.nome ?? '',
    email: inicial?.email ?? '',
    telefone: inicial?.telefone ?? '',
    role: (inicial?.role ?? roles[0]?.value ?? 'funcionario') as UserRole,
    senha: '',
    ativo: inicial?.ativo ?? true,
  })
  // null em profiles.areas = todas as áreas da licença
  const [areas, setAreas] = useState<Modulo[]>(inicial?.areas ?? modulosOrg)

  // Busca de pessoa já cadastrada (só no novo usuário)
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState<PessoaCadastrada[]>([])
  const [buscando, setBuscando] = useState(false)
  const [vinculo, setVinculo] = useState<PessoaCadastrada | null>(null)

  useEffect(() => {
    if (editando || vinculo || busca.trim().length < 2) { setResultados([]); return }
    const t = setTimeout(async () => {
      setBuscando(true)
      try {
        const res = await fetch(`/api/admin/usuarios/pessoas?q=${encodeURIComponent(busca.trim())}`)
        setResultados(res.ok ? (await res.json()).pessoas : [])
      } finally {
        setBuscando(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [busca, editando, vinculo])

  function escolherPessoa(p: PessoaCadastrada) {
    setVinculo(p)
    setBusca('')
    setForm(f => ({ ...f, nome: p.nome, email: p.email ?? f.email, telefone: p.telefone ?? f.telefone }))
    // Membro → área da igreja; aluno → projeto social (o admin pode ajustar)
    if (modulosOrg.length > 1) setAreas([p.origem === 'membro' ? 'igreja' : 'social'])
  }

  const professor = form.role === 'professor'
  const mostrarAreas = modulosOrg.length > 1 && !professor
  const erroEmail = form.email && !isValidEmail(form.email.trim()) ? 'E-mail inválido.' : null

  function toggleArea(a: Modulo) {
    setAreas(atual => (atual.includes(a) ? atual.filter(x => x !== a) : [...atual, a]))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (mostrarAreas && !areas.length) { setError('Marque ao menos uma área de acesso.'); return }
    if (!editando && (erroEmail || !isSenhaForte(form.senha))) {
      setError(erroEmail || 'A senha ainda não atende a todos os requisitos.')
      return
    }
    setLoading(true)
    try {
      const res = editando
        ? await fetch(`/api/admin/usuarios/${inicial!.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: form.role, areas, ativo: form.ativo }),
          })
        : await fetch('/api/admin/usuarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, areas, vinculo: vinculo ? { origem: vinculo.origem, id: vinculo.id } : undefined }),
          })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || 'Erro ao salvar'); return }
      onSuccess()
    } catch {
      setError('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Pessoa já cadastrada → usuário */}
      {!editando && (
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
          <p className="text-sm font-medium text-blue-900 mb-2">Transformar alguém já cadastrado em usuário</p>
          {vinculo ? (
            <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-blue-100">
              <UserRound size={16} className="text-blue-600" />
              <span className="flex-1 text-sm text-gray-800 truncate">
                {vinculo.nome} <span className="text-gray-500">· {vinculo.origem === 'membro' ? 'membro' : 'aluno'}</span>
              </span>
              <button type="button" onClick={() => setVinculo(null)} className="p-1 text-gray-400 hover:text-gray-700" aria-label="Remover vínculo">
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar membro ou aluno por nome ou CPF"
                className={`${input} pl-9 bg-white`}
              />
              {buscando && <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />}
              {resultados.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full max-h-60 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                  {resultados.map(p => (
                    <li key={`${p.origem}-${p.id}`}>
                      <button
                        type="button"
                        disabled={p.jaUsuario}
                        onClick={() => escolherPessoa(p)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="block text-sm text-gray-900">{p.nome}</span>
                        <span className="block text-xs text-gray-500">
                          {p.origem === 'membro' ? 'Membro' : 'Aluno'}{p.email ? ` · ${p.email}` : ''}{p.jaUsuario ? ' · já é usuário' : ''}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {busca.trim().length >= 2 && !buscando && !resultados.length && (
                <p className="mt-1 text-xs text-blue-800/70">Ninguém encontrado — preencha os dados abaixo.</p>
              )}
            </div>
          )}
        </div>
      )}

      <div>
        <label htmlFor="u-nome" className={label}>Nome completo *</label>
        <input id="u-nome" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required disabled={editando} placeholder="João da Silva" className={`${input} disabled:bg-gray-50 disabled:text-gray-500`} />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="u-email" className={label}>Email *</label>
          <input id="u-email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required disabled={editando} placeholder="joao@email.com" className={`${input} disabled:bg-gray-50 disabled:text-gray-500 ${erroEmail ? 'border-red-400' : ''}`} />
          {erroEmail && !editando && <p className="mt-1 text-xs text-red-600">{erroEmail}</p>}
        </div>
        <div>
          <label htmlFor="u-tel" className={label}>Telefone</label>
          <input id="u-tel" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: maskPhone(e.target.value) }))} disabled={editando} placeholder="(41) 99999-9999" className={`${input} disabled:bg-gray-50 disabled:text-gray-500`} />
        </div>
      </div>

      <div>
        <p className={label}>Função *</p>
        <div className="space-y-2">
          {roles.map(r => (
            <label key={r.value} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${form.role === r.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'} ${ehVoceMesmo ? 'opacity-60 cursor-not-allowed' : ''}`}>
              <input type="radio" name="role" checked={form.role === r.value} disabled={ehVoceMesmo} onChange={() => setForm(f => ({ ...f, role: r.value }))} className="mt-0.5 accent-blue-600" />
              <span>
                <span className="block text-sm font-medium text-gray-900">{r.label}</span>
                <span className="block text-xs text-gray-500">{r.desc}</span>
              </span>
            </label>
          ))}
        </div>
        {ehVoceMesmo && <p className="mt-1 text-xs text-gray-500">Você não pode alterar a própria função.</p>}
      </div>

      {mostrarAreas && (
        <div>
          <p className={label}>Áreas de acesso *</p>
          <div className="flex flex-wrap gap-2">
            {modulosOrg.map(a => (
              <button
                key={a}
                type="button"
                onClick={() => toggleArea(a)}
                aria-pressed={areas.includes(a)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition ${areas.includes(a) ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                {areas.includes(a) && <Check size={14} />} {AREA_LABELS[a]}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-gray-500">O usuário só vê os menus e dados das áreas marcadas.</p>
        </div>
      )}
      {professor && modulosOrg.length > 1 && (
        <p className="text-xs text-gray-500">Professores acessam somente o Projeto Social.</p>
      )}

      {editando && !ehVoceMesmo && (
        <label className="flex items-center justify-between gap-3 p-3 border border-gray-200 rounded-lg">
          <span className="text-sm text-gray-800">Usuário ativo</span>
          <input type="checkbox" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} className="w-5 h-5 accent-blue-600" />
        </label>
      )}

      {!editando && (
        <div>
          <label htmlFor="u-senha" className={label}>Senha inicial *</label>
          <div className="relative">
            <input
              id="u-senha" type={verSenha ? 'text' : 'password'} value={form.senha}
              onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
              required autoComplete="new-password" className={`${input} pr-10`}
            />
            <button type="button" onClick={() => setVerSenha(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600" aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'}>
              {verSenha ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
            {REQUISITOS_SENHA.map(r => {
              const ok = r.ok(form.senha)
              return (
                <li key={r.id} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-700' : 'text-gray-500'}`}>
                  {ok ? <Check size={13} /> : <X size={13} />} {r.label}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">{error}</div>}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
          {loading && <Loader2 size={15} className="animate-spin" />}
          {editando ? 'Salvar' : 'Criar usuário'}
        </button>
        <button type="button" onClick={onCancel} className="px-5 py-2.5 text-gray-500 hover:text-gray-700 text-sm transition">
          Cancelar
        </button>
      </div>
    </form>
  )
}
