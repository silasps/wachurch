'use client'

import { useEffect, useState } from 'react'
import {
  Loader2, Pencil, Trash2, AlertTriangle, FileText, Eye, EyeOff, MessageCircle, ShieldCheck, UserRound, Check,
} from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/utils'
import { calcularIdade, cpfOculto, maskCpf, soDigitos } from '@/lib/mascaras'
import {
  ESTADO_CIVIL_LABELS, FORMA_INGRESSO_LABELS, MOTIVOS_INATIVACAO, SEXO_LABELS, SITUACAO_COLORS, SITUACAO_LABELS,
  type MembresiaConfigPublica,
} from '@/lib/membros'
import type { Consentimento } from '@/types'
import type { MembroLinha } from './membros-list'

const COLETADO_POR: Record<Consentimento['coletado_por'], string> = {
  titular: 'pelo próprio titular (formulário)',
  responsavel: 'pelo responsável legal (formulário)',
  secretaria_presencial: 'presencialmente pela secretaria',
}

interface Props {
  membro: MembroLinha
  config: MembresiaConfigPublica
  onEditar: () => void
  onChanged: () => void
  onRemoved: () => void
}

const hoje = () => new Date().toISOString().slice(0, 10)

export default function MembroDetalhe({ membro: m, config, onEditar, onChanged, onRemoved }: Props) {
  const [carregando, setCarregando] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [verCpf, setVerCpf] = useState(false)
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const [inativando, setInativando] = useState(false)
  const [motivo, setMotivo] = useState(MOTIVOS_INATIVACAO[0])
  const [motivoOutro, setMotivoOutro] = useState('')
  const [dataRecepcao, setDataRecepcao] = useState(hoje())
  const [dataBatismo, setDataBatismo] = useState(m.data_batismo ?? '')
  const [consentimentos, setConsentimentos] = useState<Consentimento[] | null>(null)

  const [aceitaComunicacoes, setAceitaComunicacoes] = useState(m.aceita_comunicacoes)
  const [salvandoComunicacoes, setSalvandoComunicacoes] = useState(false)
  const [versaoConsentimentos, setVersaoConsentimentos] = useState(0)

  useEffect(() => {
    let ativo = true
    fetch(`/api/admin/membros/${m.id}`)
      .then(r => (r.ok ? r.json() : { consentimentos: [] }))
      .then(d => { if (ativo) setConsentimentos(d.consentimentos) })
      .catch(() => { if (ativo) setConsentimentos([]) })
    return () => { ativo = false }
  }, [m.id, versaoConsentimentos])

  useEffect(() => setAceitaComunicacoes(m.aceita_comunicacoes), [m.aceita_comunicacoes])

  async function alternarComunicacoes() {
    const novo = !aceitaComunicacoes
    setAceitaComunicacoes(novo) // otimista: a chave muda na hora
    setSalvandoComunicacoes(true)
    setErro(null)
    try {
      const res = await fetch(`/api/admin/membros/${m.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'comunicacoes', aceita: novo }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Não foi possível salvar.')
      setVersaoConsentimentos(v => v + 1)
      onChanged()
    } catch (err) {
      setAceitaComunicacoes(!novo)
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar.')
    } finally {
      setSalvandoComunicacoes(false)
    }
  }

  async function chamar(rotulo: string, url: string, init: RequestInit, depois: () => void = onChanged) {
    setCarregando(rotulo)
    setErro(null)
    try {
      const res = await fetch(url, init)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErro(data.error || 'Não foi possível concluir a ação.')
        return
      }
      depois()
    } catch {
      setErro('Erro de conexão. Tente novamente.')
    } finally {
      setCarregando(null)
    }
  }

  const acao = (nome: string, extra: Record<string, unknown> = {}) =>
    chamar(nome, `/api/admin/membros/${m.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: nome, ...extra }),
    })

  const idade = m.data_nascimento ? calcularIdade(m.data_nascimento) : null
  const celularDigitos = soDigitos(m.celular ?? '')
  const mostraCurso = !!config.curso_nome && m.tipo_cadastro === 'quer_ser_membro'
  const end = m.endereco ?? {}
  const enderecoTexto = [
    [end.logradouro, end.numero].filter(Boolean).join(', '), end.complemento, end.bairro,
    [end.cidade, end.uf].filter(Boolean).join('/'), end.cep,
  ].filter(Boolean).join(' · ')

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
          {m.fotoUrl ? <img src={m.fotoUrl} alt="" className="w-full h-full object-cover" /> : <UserRound size={36} className="text-gray-300" />}
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold text-gray-900">{m.nome}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${SITUACAO_COLORS[m.situacao]}`}>
              {SITUACAO_LABELS[m.situacao]}
            </span>
            <span className="text-xs text-gray-500">
              {m.origem === 'formulario_publico' ? 'Formulário público' : 'Cadastrado pela secretaria'} · {formatDate(m.created_at)}
            </span>
          </div>
          {m.situacao === 'inativo' && m.motivo_inativacao && (
            <p className="text-xs text-gray-500 mt-1">Motivo: {m.motivo_inativacao}</p>
          )}
        </div>
      </div>

      {/* Duplicidade */}
      {m.possivel_duplicado_de && (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
          <p className="flex items-start gap-2 text-sm text-orange-900">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>
              Já existe um cadastro com este CPF{m.duplicadoDeNome ? <>: <strong>{m.duplicadoDeNome}</strong></> : ''}.
              Você pode usar os dados deste envio para atualizar o cadastro existente.
            </span>
          </p>
          <button
            onClick={() => chamar('mesclar', `/api/admin/membros/${m.id}/mesclar`, { method: 'POST' }, onRemoved)}
            disabled={!!carregando}
            className="mt-3 flex items-center gap-2 px-3 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50"
          >
            {carregando === 'mesclar' && <Loader2 size={14} className="animate-spin" />}
            Atualizar o cadastro existente com estes dados
          </button>
        </div>
      )}

      {/* Dados */}
      <Secao titulo="Dados pessoais">
        <Item rotulo="CPF">
          {m.cpf ? (
            <span className="inline-flex items-center gap-2 font-mono">
              {verCpf ? maskCpf(m.cpf) : cpfOculto(m.cpf)}
              <button onClick={() => setVerCpf(v => !v)} className="text-gray-400 hover:text-gray-600" aria-label={verCpf ? 'Ocultar CPF' : 'Mostrar CPF'}>
                {verCpf ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </span>
          ) : '—'}
        </Item>
        <Item rotulo="Nascimento">{m.data_nascimento ? `${formatDate(m.data_nascimento)}${idade !== null ? ` (${idade} anos)` : ''}` : '—'}</Item>
        <Item rotulo="Sexo">{m.sexo ? SEXO_LABELS[m.sexo] : '—'}</Item>
        <Item rotulo="Estado civil">{m.estado_civil ? ESTADO_CIVIL_LABELS[m.estado_civil] : '—'}</Item>
        {m.responsavel_nome && <Item rotulo="Responsável">{m.responsavel_nome} · {m.responsavel_celular}</Item>}
      </Secao>

      <Secao titulo="Contato">
        <Item rotulo="Celular">
          {m.celular ? (
            <span className="inline-flex items-center gap-2">
              {m.celular}
              {m.celular_whatsapp && celularDigitos && (
                <a href={`https://wa.me/55${celularDigitos}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 text-xs font-medium">
                  <MessageCircle size={14} /> WhatsApp
                </a>
              )}
            </span>
          ) : '—'}
        </Item>
        <Item rotulo="E-mail">{m.email || '—'}</Item>
        <Item rotulo="Endereço">{enderecoTexto || '—'}</Item>
      </Secao>

      <Secao titulo="Vida na igreja">
        <Item rotulo="Tipo de cadastro">{m.tipo_cadastro === 'quer_ser_membro' ? 'Quer ser membro' : 'Disse já ser membro'}</Item>
        <Item rotulo={m.tipo_cadastro === 'quer_ser_membro' ? 'Caminho' : 'Entrou por'}>
          {m.forma_ingresso ? FORMA_INGRESSO_LABELS[m.forma_ingresso] : '—'}
        </Item>
        {m.igreja_origem && <Item rotulo="Igreja anterior">{[m.igreja_origem, m.igreja_origem_cidade].filter(Boolean).join(' — ')}</Item>}
        {m.forma_ingresso === 'transferencia' && (
          <Item rotulo="Carta">
            {m.cartaUrl ? (
              <a href={m.cartaUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700">
                <FileText size={14} /> Ver carta
              </a>
            ) : m.carta_entrega_presencial ? 'Vai entregar pessoalmente' : 'Não enviada'}
            {m.carta_recebida && <span className="ml-2 text-xs text-green-700">(recebida)</span>}
          </Item>
        )}
        {mostraCurso && (
          <Item rotulo={config.curso_nome!}>
            {m.fez_curso_integracao === null ? '—' : m.fez_curso_integracao ? 'Participou' : 'Ainda não participou'}
          </Item>
        )}
        {m.membro_desde_ano && <Item rotulo="Membro desde">{m.membro_desde_ano}</Item>}
        {(m.data_batismo || m.ano_batismo) && <Item rotulo="Batismo">{m.data_batismo ? formatDate(m.data_batismo) : m.ano_batismo}</Item>}
        {m.data_recepcao && <Item rotulo="Recebido em">{formatDate(m.data_recepcao)}</Item>}
      </Secao>

      {m.observacoes_internas && (
        <Secao titulo="Observações internas">
          <p className="text-sm text-gray-700 whitespace-pre-line">{m.observacoes_internas}</p>
        </Secao>
      )}

      {/* LGPD */}
      <Secao titulo="Consentimento (LGPD)">
        {consentimentos === null ? (
          <p className="text-sm text-gray-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Carregando…</p>
        ) : consentimentos.length === 0 ? (
          <p className="text-sm text-orange-700">Nenhum registro de consentimento.</p>
        ) : (
          <ul className="space-y-1.5">
            {consentimentos.map(c => (
              <li key={c.id} className="flex items-start gap-2 text-sm text-gray-700">
                <ShieldCheck size={15} className={`shrink-0 mt-0.5 ${c.revogado_em ? 'text-gray-300' : 'text-green-600'}`} />
                <span>
                  {c.finalidade === 'cadastro_membro' ? 'Cadastro de membros' : 'Receber comunicados'} — {COLETADO_POR[c.coletado_por]},{' '}
                  {formatDateTime(c.created_at)} (v. {c.versao})
                  {c.revogado_em && <span className="text-gray-500"> · revogado em {formatDateTime(c.revogado_em)}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm font-medium text-gray-900">Aceita receber comunicados</p>
            <p className="text-xs text-gray-500">WhatsApp ou e-mail. Altere só a pedido do titular — a mudança fica registrada.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={aceitaComunicacoes}
            aria-label="Aceita receber comunicados"
            onClick={alternarComunicacoes}
            disabled={salvandoComunicacoes}
            className={`relative shrink-0 w-12 h-7 rounded-full transition-colors disabled:opacity-70 ${aceitaComunicacoes ? 'bg-green-600' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow flex items-center justify-center transition-transform ${aceitaComunicacoes ? 'translate-x-5' : ''}`}>
              {salvandoComunicacoes && <Loader2 size={12} className="animate-spin text-gray-500" />}
            </span>
          </button>
        </div>
      </Secao>

      {/* Acompanhamento do candidato */}
      {m.situacao === 'candidato' && (
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-3">
          <p className="text-sm font-semibold text-blue-900">Acompanhamento</p>
          {mostraCurso && (
            <Checklist
              marcado={!!m.fez_curso_integracao}
              rotulo={`Participou do ${config.curso_nome}`}
              disabled={!!carregando}
              onChange={v => acao('checklist', { fez_curso_integracao: v })}
            />
          )}
          {m.forma_ingresso === 'transferencia' && (
            <Checklist
              marcado={m.carta_recebida}
              rotulo="Carta de transferência recebida"
              disabled={!!carregando}
              onChange={v => acao('checklist', { carta_recebida: v })}
            />
          )}
          {m.forma_ingresso === 'batismo' && (
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-800">
              <label htmlFor="data-batismo">Batizado em</label>
              <input
                id="data-batismo" type="date" value={dataBatismo} onChange={e => setDataBatismo(e.target.value)}
                className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg bg-white"
              />
              <button
                onClick={() => acao('checklist', { data_batismo: dataBatismo || null })}
                disabled={!!carregando || dataBatismo === (m.data_batismo ?? '')}
                className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40"
              >
                Salvar
              </button>
            </div>
          )}
          <div className="pt-3 border-t border-blue-100 flex flex-wrap items-center gap-2 text-sm text-gray-800">
            <label htmlFor="data-recepcao">Recebido como membro em</label>
            <input
              id="data-recepcao" type="date" value={dataRecepcao} onChange={e => setDataRecepcao(e.target.value)}
              className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg bg-white"
            />
          </div>
        </div>
      )}

      {erro && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{erro}</div>}

      {/* Inativação */}
      {inativando && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
          <label htmlFor="motivo" className="block text-sm font-medium text-gray-700">Motivo da inativação</label>
          <select
            id="motivo" value={motivo} onChange={e => setMotivo(e.target.value)}
            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {MOTIVOS_INATIVACAO.map(o => <option key={o}>{o}</option>)}
          </select>
          {motivo === 'Outro' && (
            <input
              value={motivoOutro} onChange={e => setMotivoOutro(e.target.value)} placeholder="Descreva o motivo"
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
          <div className="flex gap-2">
            <Botao
              cor="vermelho" carregando={carregando === 'inativar'} disabled={!!carregando || (motivo === 'Outro' && !motivoOutro.trim())}
              onClick={() => acao('inativar', { motivo: motivo === 'Outro' ? motivoOutro : motivo })}
            >
              Confirmar inativação
            </Botao>
            <Botao cor="neutro" onClick={() => setInativando(false)}>Cancelar</Botao>
          </div>
        </div>
      )}

      {/* Exclusão definitiva */}
      {confirmarExclusao && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-3">
          <p className="text-sm text-red-900">
            Isto apaga o cadastro, a foto, os documentos e os registros de consentimento. Use quando o titular pedir a
            exclusão dos dados. <strong>Não pode ser desfeito.</strong>
          </p>
          <div className="flex gap-2">
            <Botao
              cor="vermelho" carregando={carregando === 'excluir'} disabled={!!carregando}
              onClick={() => chamar('excluir', `/api/admin/membros/${m.id}`, { method: 'DELETE' }, onRemoved)}
            >
              Sim, excluir definitivamente
            </Botao>
            <Botao cor="neutro" onClick={() => setConfirmarExclusao(false)}>Cancelar</Botao>
          </div>
        </div>
      )}

      {/* Ações */}
      {!inativando && !confirmarExclusao && (
        <div className="flex flex-wrap gap-2 pt-1">
          {m.situacao === 'pendente' && (
            <>
              <Botao cor="verde" carregando={carregando === 'confirmar'} disabled={!!carregando} onClick={() => acao('confirmar')}>
                <Check size={15} /> Confirmar como membro
              </Botao>
              <Botao cor="neutro" carregando={carregando === 'recusar'} disabled={!!carregando} onClick={() => acao('recusar')}>Recusar</Botao>
            </>
          )}
          {m.situacao === 'candidato' && (
            <>
              <Botao
                cor="verde" carregando={carregando === 'receber'} disabled={!!carregando}
                onClick={() => acao('receber', { data_recepcao: dataRecepcao, data_batismo: dataBatismo || undefined })}
              >
                <Check size={15} /> Receber como membro
              </Botao>
              <Botao cor="neutro" carregando={carregando === 'recusar'} disabled={!!carregando} onClick={() => acao('recusar')}>Recusar</Botao>
            </>
          )}
          {m.situacao === 'ativo' && <Botao cor="neutro" disabled={!!carregando} onClick={() => setInativando(true)}>Inativar</Botao>}
          {m.situacao === 'inativo' && (
            <Botao cor="neutro" carregando={carregando === 'reativar'} disabled={!!carregando} onClick={() => acao('reativar')}>Reativar</Botao>
          )}
          {m.situacao === 'recusado' && (
            <Botao cor="neutro" carregando={carregando === 'reabrir'} disabled={!!carregando} onClick={() => acao('reabrir')}>Reabrir cadastro</Botao>
          )}
          <Botao cor="neutro" disabled={!!carregando} onClick={onEditar}><Pencil size={14} /> Editar</Botao>
          <button
            onClick={() => setConfirmarExclusao(true)}
            disabled={!!carregando}
            className="ml-auto flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
          >
            <Trash2 size={14} /> Excluir
          </button>
        </div>
      )}
    </div>
  )
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">{titulo}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function Item({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-2 text-sm">
      <span className="text-gray-500">{rotulo}</span>
      <span className="text-gray-900 min-w-0 break-words">{children}</span>
    </div>
  )
}

function Checklist({ marcado, rotulo, onChange, disabled }: {
  marcado: boolean
  rotulo: string
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
      <input type="checkbox" checked={marcado} disabled={disabled} onChange={e => onChange(e.target.checked)} className="w-4 h-4 accent-blue-600" />
      {rotulo}
    </label>
  )
}

const CORES_BOTAO = {
  verde: 'bg-green-600 text-white hover:bg-green-700',
  vermelho: 'bg-red-600 text-white hover:bg-red-700',
  neutro: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
}

function Botao({ cor, carregando, disabled, onClick, children }: {
  cor: keyof typeof CORES_BOTAO
  carregando?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition disabled:opacity-50 ${CORES_BOTAO[cor]}`}
    >
      {carregando && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  )
}
