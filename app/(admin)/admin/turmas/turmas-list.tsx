'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, BookOpen, Users } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import type { Profile, Turma, TurmaStatus } from '@/types'
import TurmaForm from './turma-form'

const STATUS_LABELS: Record<TurmaStatus, string> = {
  ativa: 'Ativa', encerrada: 'Encerrada', pausada: 'Pausada',
}
const STATUS_COLORS: Record<TurmaStatus, string> = {
  ativa:     'bg-green-100 text-green-700',
  encerrada: 'bg-gray-100 text-gray-500',
  pausada:   'bg-yellow-100 text-yellow-700',
}

interface TurmasListProps {
  turmas: (Turma & { professor?: { nome: string } })[]
  countByTurma: Record<string, number>
  professores: Pick<Profile, 'id' | 'nome'>[]
}

export default function TurmasList({ turmas, countByTurma, professores }: TurmasListProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  function handleSuccess() {
    setOpen(false)
    router.refresh()
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Turmas</h1>
          <p className="text-gray-500 text-sm mt-1">{turmas?.length ?? 0} turmas cadastradas</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={16} />
          Nova turma
        </button>
      </div>

      {!turmas?.length ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <BookOpen size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 text-sm">Nenhuma turma cadastrada.</p>
          <button onClick={() => setOpen(true)} className="inline-block mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium">
            Criar primeira turma →
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {turmas.map((turma) => (
            <Link
              key={turma.id}
              href={`/admin/turmas/${turma.id}`}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm hover:border-blue-200 transition group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <BookOpen size={18} className="text-blue-600" />
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[turma.status]}`}>
                  {STATUS_LABELS[turma.status]}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition">{turma.nome}</h3>
              {turma.descricao && (
                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{turma.descricao}</p>
              )}
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Users size={12} />
                  {countByTurma[turma.id] || 0} alunos
                  {turma.capacidade ? ` / ${turma.capacidade}` : ''}
                </span>
                {turma.professor && (
                  <span className="truncate max-w-[120px]">{turma.professor.nome}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Nova turma"
        description="Configure a turma com horário e professor responsável."
      >
        <TurmaForm professores={professores} onSuccess={handleSuccess} onCancel={() => setOpen(false)} />
      </Modal>
    </div>
  )
}
