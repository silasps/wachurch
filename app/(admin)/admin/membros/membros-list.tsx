'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Search, Church, AlertTriangle, Share2, UserRound } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { formatDate } from '@/lib/utils'
import { cpfOculto } from '@/lib/mascaras'
import {
  FORMA_INGRESSO_LABELS, SITUACAO_COLORS, SITUACAO_LABELS, type MembresiaConfigPublica,
} from '@/lib/membros'
import type { Membro } from '@/types'
import MembroDetalhe from './membro-detalhe'
import MembroForm from './membro-form'
import MembresiaConfigForm from './membresia-config-form'

export type AbaMembros = 'conferir' | 'candidatos' | 'ativos' | 'inativos'

export interface MembroLinha extends Membro {
  fotoUrl: string | null
  cartaUrl: string | null
  duplicadoDeNome: string | null
}

const ABAS: Array<{ key: AbaMembros; label: string }> = [
  { key: 'conferir',   label: 'Para conferir' },
  { key: 'candidatos', label: 'Candidatos' },
  { key: 'ativos',     label: 'Ativos' },
  { key: 'inativos',   label: 'Inativos' },
]

const DESCRICAO_ABA: Record<AbaMembros, string> = {
  conferir: 'Pessoas que disseram já ser membros. Confira os dados e confirme.',
  candidatos: 'Pessoas que querem se tornar membros. Acompanhe o processo até recebê-las.',
  ativos: 'Rol de membros da igreja.',
  inativos: 'Desligados, transferidos e cadastros recusados.',
}

interface Props {
  membros: MembroLinha[]
  contagens: Record<AbaMembros, number>
  aba: AbaMembros
  q: string
  config: MembresiaConfigPublica
  linkCadastro: string
  podeConfigurar: boolean
}

export default function MembrosList({ membros, contagens, aba, q, config, linkCadastro, podeConfigurar }: Props) {
  const router = useRouter()
  const [novoOpen, setNovoOpen] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null)
  const [editando, setEditando] = useState(false)

  const selecionado = membros.find(m => m.id === selecionadoId) ?? null

  function fecharDetalhe() {
    setSelecionadoId(null)
    setEditando(false)
  }

  function handleSuccess() {
    setNovoOpen(false)
    setConfigOpen(false)
    setEditando(false)
    router.refresh()
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Membros</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {contagens.ativos} {contagens.ativos === 1 ? 'membro ativo' : 'membros ativos'}
            {contagens.conferir > 0 && ` · ${contagens.conferir} para conferir`}
          </p>
        </div>
        <div className="flex gap-2">
          {podeConfigurar && (
            <button
              onClick={() => setConfigOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
            >
              <Share2 size={16} />
              Formulário público
            </button>
          )}
          <button
            onClick={() => setNovoOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={16} />
            Novo membro
          </button>
        </div>
      </div>

      {/* Abas — scroll horizontal em mobile */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {ABAS.map(a => {
          const ativa = aba === a.key
          return (
            <Link
              key={a.key}
              href={`/admin/membros?aba=${a.key}`}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full font-medium transition ${
                ativa ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {a.label}
              <span className={`min-w-5 px-1.5 py-0.5 rounded-full text-xs ${
                ativa ? 'bg-white/20' : a.key === 'conferir' && contagens.conferir > 0 ? 'bg-yellow-200 text-yellow-900' : 'bg-white text-gray-500'
              }`}>
                {contagens[a.key]}
              </span>
            </Link>
          )
        })}
      </div>
      <p className="text-sm text-gray-500 mb-4">{DESCRICAO_ABA[aba]}</p>

      {/* Busca */}
      <form action="/admin/membros" className="relative mb-6">
        <input type="hidden" name="aba" value={aba} />
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nome ou CPF"
          className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </form>

      {!membros.length ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 px-6 text-center">
          <Church size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 text-sm">
            {q ? 'Nenhum cadastro encontrado para esta busca.' : 'Nenhum cadastro nesta aba.'}
          </p>
          {!q && podeConfigurar && (aba === 'conferir' || aba === 'candidatos') && (
            <button onClick={() => setConfigOpen(true)} className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium">
              Compartilhar o formulário de cadastro →
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="sm:hidden space-y-2">
            {membros.map(m => (
              <button
                key={m.id}
                onClick={() => setSelecionadoId(m.id)}
                className="w-full text-left bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 active:bg-gray-50"
              >
                <Avatar url={m.fotoUrl} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{m.nome}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{infoSecundaria(m, aba)}</p>
                  {m.possivel_duplicado_de && <DuplicadoBadge />}
                </div>
                <span className={`shrink-0 inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${SITUACAO_COLORS[m.situacao]}`}>
                  {SITUACAO_LABELS[m.situacao]}
                </span>
              </button>
            ))}
          </div>

          {/* Desktop: tabela */}
          <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Nome</th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">CPF</th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Celular</th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {aba === 'candidatos' ? 'Caminho' : aba === 'conferir' ? 'Enviado em' : 'Membro desde'}
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {membros.map(m => (
                  <tr key={m.id} onClick={() => setSelecionadoId(m.id)} className="hover:bg-gray-50 transition cursor-pointer">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar url={m.fotoUrl} />
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{m.nome}</p>
                          {m.possivel_duplicado_de && <DuplicadoBadge />}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-gray-500 font-mono text-xs">{cpfOculto(m.cpf)}</td>
                    <td className="px-6 py-3 text-gray-500">{m.celular || '—'}</td>
                    <td className="px-6 py-3 text-gray-500">
                      {aba === 'candidatos'
                        ? (m.forma_ingresso ? FORMA_INGRESSO_LABELS[m.forma_ingresso] : '—')
                        : aba === 'conferir'
                          ? formatDate(m.created_at)
                          : (m.data_recepcao ? formatDate(m.data_recepcao) : m.membro_desde_ano ?? '—')}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${SITUACAO_COLORS[m.situacao]}`}>
                        {SITUACAO_LABELS[m.situacao]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {membros.length >= 500 && (
            <p className="mt-3 text-xs text-gray-500">Mostrando os primeiros 500. Use a busca para encontrar outros.</p>
          )}
        </>
      )}

      {/* Detalhe / edição */}
      <Modal
        open={!!selecionado}
        onClose={fecharDetalhe}
        title={editando ? 'Editar cadastro' : 'Cadastro do membro'}
        maxWidth="max-w-2xl"
      >
        {selecionado && (editando ? (
          <MembroForm
            inicial={selecionado}
            config={config}
            onSuccess={handleSuccess}
            onCancel={() => setEditando(false)}
          />
        ) : (
          <MembroDetalhe
            membro={selecionado}
            config={config}
            onEditar={() => setEditando(true)}
            onChanged={() => router.refresh()}
            onRemoved={() => { fecharDetalhe(); router.refresh() }}
          />
        ))}
      </Modal>

      <Modal
        open={novoOpen}
        onClose={() => setNovoOpen(false)}
        title="Novo membro"
        description="Cadastro feito pela secretaria (por exemplo, a partir de uma ficha em papel)."
        maxWidth="max-w-2xl"
      >
        <MembroForm config={config} onSuccess={handleSuccess} onCancel={() => setNovoOpen(false)} />
      </Modal>

      {podeConfigurar && (
        <Modal
          open={configOpen}
          onClose={() => setConfigOpen(false)}
          title="Formulário público de cadastro"
          description="Compartilhe o link e ajuste as perguntas do formulário."
          maxWidth="max-w-2xl"
        >
          <MembresiaConfigForm
            inicial={config}
            linkCadastro={linkCadastro}
            onSuccess={handleSuccess}
            onCancel={() => setConfigOpen(false)}
          />
        </Modal>
      )}
    </div>
  )
}

function infoSecundaria(m: MembroLinha, aba: AbaMembros): string {
  if (aba === 'candidatos') return m.forma_ingresso ? `Por ${FORMA_INGRESSO_LABELS[m.forma_ingresso].toLowerCase()}` : 'Candidato'
  if (aba === 'conferir') return `Enviado em ${formatDate(m.created_at)}`
  return [m.celular, m.membro_desde_ano && `desde ${m.membro_desde_ano}`].filter(Boolean).join(' · ') || cpfOculto(m.cpf)
}

function Avatar({ url }: { url: string | null }) {
  return (
    <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
      {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : <UserRound size={20} className="text-gray-400" />}
    </div>
  )
}

function DuplicadoBadge() {
  return (
    <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 text-[11px] font-medium">
      <AlertTriangle size={11} /> Possível duplicado
    </span>
  )
}
