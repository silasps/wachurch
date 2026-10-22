'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Users } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { formatDate } from '@/lib/utils'
import type { Aluno, AlunoStatus } from '@/types'
import AlunoForm from './aluno-form'

const STATUS_LABELS: Record<AlunoStatus, string> = {
  aguardando: 'Aguardando',
  ativo: 'Ativo',
  inativo: 'Inativo',
  concluido: 'Concluído',
}

const STATUS_COLORS: Record<AlunoStatus, string> = {
  aguardando: 'bg-yellow-100 text-yellow-700',
  ativo:      'bg-green-100 text-green-700',
  inativo:    'bg-gray-100 text-gray-500',
  concluido:  'bg-blue-100 text-blue-700',
}

export default function AlunosList({
  alunos,
  status,
}: {
  alunos: Aluno[]
  status?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  function handleSuccess() {
    setOpen(false)
    router.refresh()
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header — empilha em mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alunos</h1>
          <p className="text-gray-500 text-sm mt-0.5">{alunos?.length ?? 0} alunos encontrados</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/alunos/solicitacoes"
            className="flex-1 sm:flex-none text-center px-4 py-2 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
          >
            Solicitações
          </Link>
          <button
            onClick={() => setOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={16} />
            Novo aluno
          </button>
        </div>
      </div>

      {/* Filtros — scroll horizontal em mobile */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {(['', 'ativo', 'aguardando', 'inativo', 'concluido'] as const).map((s) => (
          <Link
            key={s}
            href={s ? `/admin/alunos?status=${s}` : '/admin/alunos'}
            className={`shrink-0 px-3 py-1.5 text-xs rounded-full font-medium transition ${
              (status || '') === s
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s ? STATUS_LABELS[s] : 'Todos'}
          </Link>
        ))}
      </div>

      {!alunos?.length ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <Users size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 text-sm">Nenhum aluno encontrado.</p>
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="sm:hidden space-y-2">
            {alunos.map((aluno: Aluno) => (
              <div key={aluno.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-sm font-semibold text-blue-600 shrink-0">
                  {aluno.nome.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{aluno.nome}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(aluno.data_nascimento)}
                    {aluno.telefone && ` · ${aluno.telefone}`}
                  </p>
                </div>
                <span className={`shrink-0 inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[aluno.status]}`}>
                  {STATUS_LABELS[aluno.status]}
                </span>
              </div>
            ))}
          </div>

          {/* Desktop: tabela */}
          <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Aluno</th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Nascimento</th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Telefone</th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Admissão</th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {alunos.map((aluno: Aluno) => (
                  <tr key={aluno.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{aluno.nome}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{formatDate(aluno.data_nascimento)}</td>
                    <td className="px-6 py-4 text-gray-500">{aluno.telefone || '—'}</td>
                    <td className="px-6 py-4 text-gray-400 text-xs">{formatDate(aluno.data_admissao)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[aluno.status]}`}>
                        {STATUS_LABELS[aluno.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Novo aluno"
        description="Cadastre um aluno na organização."
        maxWidth="max-w-2xl"
      >
        <AlunoForm onSuccess={handleSuccess} onCancel={() => setOpen(false)} />
      </Modal>
    </div>
  )
}
