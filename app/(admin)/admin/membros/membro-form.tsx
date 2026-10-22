'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { PhotoPicker } from '@/components/ui/photo-picker'
import { DocumentPicker } from '@/components/ui/document-picker'
import { calcularIdade, formatDataBR, maskCep, maskCpf, maskData, maskPhone, parseDataBR, soDigitos } from '@/lib/mascaras'
import { buscarCep } from '@/lib/cep'
import {
  CAMINHOS_INGRESSO, CARTA_MAX_BYTES, ESTADO_CIVIL_LABELS, FORMA_INGRESSO_LABELS, SEXO_LABELS,
  type MembresiaConfigPublica,
} from '@/lib/membros'
import type { FormaIngresso } from '@/types'
import type { MembroLinha } from './membros-list'

interface Props {
  /** Presente = edição; ausente = novo cadastro */
  inicial?: MembroLinha
  config: MembresiaConfigPublica
  onSuccess: () => void
  onCancel: () => void
}

const input = 'w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
const label = 'block text-sm font-medium text-gray-700 mb-1'

export default function MembroForm({ inicial, config, onSuccess, onCancel }: Props) {
  const editando = !!inicial
  const end = inicial?.endereco ?? {}
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    situacao: 'ativo' as 'ativo' | 'pendente' | 'candidato',
    nome: inicial?.nome ?? '',
    cpf: inicial?.cpf ? maskCpf(inicial.cpf) : '',
    nascimento: formatDataBR(inicial?.data_nascimento),
    sexo: inicial?.sexo ?? '',
    estado_civil: inicial?.estado_civil ?? '',
    celular: inicial?.celular ?? '',
    celular_whatsapp: inicial?.celular_whatsapp ?? true,
    email: inicial?.email ?? '',
    cep: end.cep ?? '',
    logradouro: end.logradouro ?? '',
    numero: end.numero ?? '',
    complemento: end.complemento ?? '',
    bairro: end.bairro ?? '',
    cidade: end.cidade ?? '',
    uf: end.uf ?? '',
    forma_ingresso: (inicial?.forma_ingresso ?? '') as FormaIngresso | '',
    igreja_origem: inicial?.igreja_origem ?? '',
    igreja_origem_cidade: inicial?.igreja_origem_cidade ?? '',
    carta_recebida: inicial?.carta_recebida ?? false,
    fez_curso_integracao: inicial?.fez_curso_integracao == null ? '' : inicial.fez_curso_integracao ? 'sim' : 'nao',
    membro_desde_ano: inicial?.membro_desde_ano ? String(inicial.membro_desde_ano) : '',
    ano_batismo: inicial?.ano_batismo ? String(inicial.ano_batismo) : '',
    data_batismo: inicial?.data_batismo ?? '',
    data_recepcao: inicial?.data_recepcao ?? '',
    responsavel_nome: inicial?.responsavel_nome ?? '',
    responsavel_celular: inicial?.responsavel_celular ?? '',
    observacoes_internas: inicial?.observacoes_internas ?? '',
    aceita_comunicacoes: false,
    consentimento_presencial: false,
  })

  // Foto: undefined = não mexeu; null = removeu; Blob = nova
  const [foto, setFoto] = useState<Blob | null | undefined>(undefined)
  const [fotoUrl, setFotoUrl] = useState<string | null>(inicial?.fotoUrl ?? null)
  const [carta, setCarta] = useState<File | null>(null)

  function set<K extends keyof typeof form>(campo: K, valor: (typeof form)[K]) {
    setForm(f => ({ ...f, [campo]: valor }))
  }

  function onFoto(blob: Blob | null) {
    setFoto(blob)
    setFotoUrl(blob ? URL.createObjectURL(blob) : null)
  }

  async function onCep(valor: string) {
    const masked = maskCep(valor)
    set('cep', masked)
    const r = await buscarCep(masked)
    if (r) setForm(f => ({ ...f, logradouro: r.logradouro || f.logradouro, bairro: r.bairro || '', cidade: r.cidade || '', uf: r.uf || '' }))
  }

  const tipoCadastro = editando ? inicial!.tipo_cadastro : form.situacao === 'candidato' ? 'quer_ser_membro' : 'ja_membro'
  const nascimentoIso = parseDataBR(form.nascimento)
  const menor = nascimentoIso ? calcularIdade(nascimentoIso) < 18 : false
  const formas: FormaIngresso[] = tipoCadastro === 'quer_ser_membro' ? CAMINHOS_INGRESSO : [...CAMINHOS_INGRESSO, 'nao_sei']

  function payload() {
    return {
      tipo_cadastro: tipoCadastro,
      nome: form.nome,
      cpf: form.cpf,
      data_nascimento: nascimentoIso ?? '',
      sexo: form.sexo,
      estado_civil: form.estado_civil,
      celular: form.celular,
      celular_whatsapp: form.celular_whatsapp,
      email: form.email,
      endereco: {
        cep: form.cep, logradouro: form.logradouro, numero: form.numero, complemento: form.complemento,
        bairro: form.bairro, cidade: form.cidade, uf: form.uf,
      },
      forma_ingresso: form.forma_ingresso,
      igreja_origem: form.igreja_origem,
      igreja_origem_cidade: form.igreja_origem_cidade,
      carta_recebida: form.carta_recebida,
      fez_curso_integracao: form.fez_curso_integracao,
      membro_desde_ano: form.membro_desde_ano,
      ano_batismo: form.ano_batismo,
      data_batismo: form.data_batismo,
      data_recepcao: form.data_recepcao,
      responsavel_nome: menor ? form.responsavel_nome : '',
      responsavel_celular: menor ? form.responsavel_celular : '',
      observacoes_internas: form.observacoes_internas,
      aceita_comunicacoes: form.aceita_comunicacoes,
    }
  }

  async function enviarArquivo(id: string, tipo: 'foto' | 'carta', arquivo: Blob, nome: string) {
    const fd = new FormData()
    fd.append('tipo', tipo)
    fd.append('file', arquivo instanceof File ? arquivo : new File([arquivo], nome, { type: arquivo.type || 'image/jpeg' }))
    const res = await fetch(`/api/admin/membros/${id}/arquivos`, { method: 'POST', body: fd })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Erro ao enviar arquivo')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (form.nascimento && !nascimentoIso) {
      setError('Data de nascimento inválida. Use dia/mês/ano.')
      return
    }
    setLoading(true)
    try {
      if (editando) {
        const res = await fetch(`/api/admin/membros/${inicial!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ acao: 'editar', ...payload() }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) { setError(data.error || 'Erro ao salvar'); return }
        if (foto) await enviarArquivo(inicial!.id, 'foto', foto, foto.type === 'image/webp' ? 'foto.webp' : 'foto.jpg')
        if (foto === null && inicial!.foto_path) {
          await fetch(`/api/admin/membros/${inicial!.id}/arquivos?tipo=foto`, { method: 'DELETE' })
        }
        if (carta) await enviarArquivo(inicial!.id, 'carta', carta, carta.name)
      } else {
        const fd = new FormData()
        for (const [k, v] of Object.entries(payload())) {
          fd.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v))
        }
        fd.append('situacao', form.situacao)
        fd.append('consentimento_presencial', String(form.consentimento_presencial))
        if (foto) fd.append('foto', new File([foto], foto.type === 'image/webp' ? 'foto.webp' : 'foto.jpg', { type: foto.type || 'image/jpeg' }))
        if (carta) fd.append('carta', carta)
        const res = await fetch('/api/admin/membros', { method: 'POST', body: fd })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) { setError(data.error || 'Erro ao salvar'); return }
      }
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PhotoPicker previewUrl={fotoUrl} onChange={onFoto} />

      {!editando && (
        <div>
          <label className={label}>Situação</label>
          <div className="grid grid-cols-3 gap-2">
            {([['ativo', 'Membro ativo'], ['pendente', 'Para conferir'], ['candidato', 'Candidato']] as const).map(([v, l]) => (
              <button
                key={v} type="button" onClick={() => set('situacao', v)}
                className={`px-3 py-2 text-sm rounded-lg border transition ${form.situacao === v ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      )}

      <fieldset className="space-y-4">
        <legend className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Dados pessoais</legend>
        <div>
          <label htmlFor="m-nome" className={label}>Nome completo *</label>
          <input id="m-nome" value={form.nome} onChange={e => set('nome', e.target.value)} required className={input} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="m-cpf" className={label}>CPF</label>
            <input id="m-cpf" value={form.cpf} onChange={e => set('cpf', maskCpf(e.target.value))} inputMode="numeric" placeholder="000.000.000-00" className={input} />
          </div>
          <div>
            <label htmlFor="m-nasc" className={label}>Nascimento</label>
            <input id="m-nasc" value={form.nascimento} onChange={e => set('nascimento', maskData(e.target.value))} inputMode="numeric" placeholder="dd/mm/aaaa" className={input} />
          </div>
          <div>
            <label htmlFor="m-sexo" className={label}>Sexo</label>
            <select id="m-sexo" value={form.sexo} onChange={e => set('sexo', e.target.value as typeof form.sexo)} className={input}>
              <option value="">—</option>
              {Object.entries(SEXO_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="m-ec" className={label}>Estado civil</label>
            <select id="m-ec" value={form.estado_civil} onChange={e => set('estado_civil', e.target.value as typeof form.estado_civil)} className={input}>
              <option value="">—</option>
              {Object.entries(ESTADO_CIVIL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
        {menor && (
          <div className="grid sm:grid-cols-2 gap-4 p-3 bg-amber-50 rounded-lg">
            <div>
              <label htmlFor="m-resp" className={label}>Responsável</label>
              <input id="m-resp" value={form.responsavel_nome} onChange={e => set('responsavel_nome', e.target.value)} className={input} />
            </div>
            <div>
              <label htmlFor="m-resp-cel" className={label}>Celular do responsável</label>
              <input id="m-resp-cel" value={form.responsavel_celular} onChange={e => set('responsavel_celular', maskPhone(e.target.value))} inputMode="tel" className={input} />
            </div>
          </div>
        )}
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Contato</legend>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="m-cel" className={label}>Celular</label>
            <input id="m-cel" value={form.celular} onChange={e => set('celular', maskPhone(e.target.value))} inputMode="tel" placeholder="(00) 00000-0000" className={input} />
            <label className="mt-1.5 flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={form.celular_whatsapp} onChange={e => set('celular_whatsapp', e.target.checked)} className="accent-blue-600" />
              Tem WhatsApp
            </label>
          </div>
          <div>
            <label htmlFor="m-email" className={label}>E-mail</label>
            <input id="m-email" type="email" value={form.email} onChange={e => set('email', e.target.value)} className={input} />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label htmlFor="m-cep" className={label}>CEP</label>
            <input id="m-cep" value={form.cep} onChange={e => onCep(e.target.value)} inputMode="numeric" maxLength={9} className={input} />
          </div>
          <div className="col-span-2 sm:col-span-3">
            <label htmlFor="m-rua" className={label}>Rua</label>
            <input id="m-rua" value={form.logradouro} onChange={e => set('logradouro', e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor="m-num" className={label}>Número</label>
            <input id="m-num" value={form.numero} onChange={e => set('numero', e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor="m-comp" className={label}>Complemento</label>
            <input id="m-comp" value={form.complemento} onChange={e => set('complemento', e.target.value)} className={input} />
          </div>
          <div className="col-span-2">
            <label htmlFor="m-bairro" className={label}>Bairro</label>
            <input id="m-bairro" value={form.bairro} onChange={e => set('bairro', e.target.value)} className={input} />
          </div>
          <div className="col-span-2 sm:col-span-3">
            <label htmlFor="m-cidade" className={label}>Cidade</label>
            <input id="m-cidade" value={form.cidade} onChange={e => set('cidade', e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor="m-uf" className={label}>UF</label>
            <input id="m-uf" value={form.uf} onChange={e => set('uf', e.target.value.toUpperCase().slice(0, 2))} maxLength={2} className={input} />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Vida na igreja</legend>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="m-forma" className={label}>
              {tipoCadastro === 'quer_ser_membro' ? 'Caminho para ser membro *' : 'Como entrou na igreja'}
            </label>
            <select
              id="m-forma" value={form.forma_ingresso} onChange={e => set('forma_ingresso', e.target.value as FormaIngresso | '')}
              required={tipoCadastro === 'quer_ser_membro'} className={input}
            >
              <option value="">—</option>
              {formas.map(f => <option key={f} value={f}>{FORMA_INGRESSO_LABELS[f]}</option>)}
            </select>
          </div>
          {config.curso_nome && tipoCadastro === 'quer_ser_membro' && (
            <div>
              <label htmlFor="m-curso" className={label}>Participou do {config.curso_nome}?</label>
              <select id="m-curso" value={form.fez_curso_integracao} onChange={e => set('fez_curso_integracao', e.target.value)} className={input}>
                <option value="">—</option>
                <option value="sim">Sim</option>
                <option value="nao">Ainda não</option>
              </select>
            </div>
          )}
          {(form.forma_ingresso === 'transferencia' || form.forma_ingresso === 'aclamacao' || form.igreja_origem) && (
            <>
              <div>
                <label htmlFor="m-igreja" className={label}>Igreja anterior</label>
                <input id="m-igreja" value={form.igreja_origem} onChange={e => set('igreja_origem', e.target.value)} className={input} />
              </div>
              <div>
                <label htmlFor="m-igreja-cid" className={label}>Cidade da igreja anterior</label>
                <input id="m-igreja-cid" value={form.igreja_origem_cidade} onChange={e => set('igreja_origem_cidade', e.target.value)} className={input} />
              </div>
            </>
          )}
          {tipoCadastro === 'ja_membro' && (
            <div>
              <label htmlFor="m-desde" className={label}>Membro desde (ano)</label>
              <input id="m-desde" value={form.membro_desde_ano} onChange={e => set('membro_desde_ano', soDigitos(e.target.value).slice(0, 4))} inputMode="numeric" className={input} />
            </div>
          )}
          <div>
            <label htmlFor="m-ano-bat" className={label}>Ano do batismo</label>
            <input id="m-ano-bat" value={form.ano_batismo} onChange={e => set('ano_batismo', soDigitos(e.target.value).slice(0, 4))} inputMode="numeric" className={input} />
          </div>
          <div>
            <label htmlFor="m-data-bat" className={label}>Data do batismo (nesta igreja)</label>
            <input id="m-data-bat" type="date" value={form.data_batismo} onChange={e => set('data_batismo', e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor="m-recep" className={label}>Recebido como membro em</label>
            <input id="m-recep" type="date" value={form.data_recepcao} onChange={e => set('data_recepcao', e.target.value)} className={input} />
          </div>
        </div>

        {form.forma_ingresso === 'transferencia' && (
          <div>
            <p className={label}>Carta de transferência</p>
            {inicial?.cartaUrl && !carta && (
              <p className="text-sm text-gray-600 mb-2">
                Já existe uma carta anexada. <a href={inicial.cartaUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Ver</a> — anexe outra para substituir.
              </p>
            )}
            <DocumentPicker arquivo={carta} onChange={setCarta} maxPdfBytes={CARTA_MAX_BYTES} />
            <label className="mt-2 flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.carta_recebida || !!carta} onChange={e => set('carta_recebida', e.target.checked)} className="accent-blue-600" />
              Carta recebida pela secretaria
            </label>
          </div>
        )}

        <div>
          <label htmlFor="m-obs" className={label}>Observações internas</label>
          <textarea
            id="m-obs" value={form.observacoes_internas} onChange={e => set('observacoes_internas', e.target.value)} rows={3}
            placeholder="Visível só para a equipe da igreja" className={input}
          />
        </div>
      </fieldset>

      {!editando && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
          <label className="flex items-start gap-2 text-sm text-gray-800">
            <input
              type="checkbox" checked={form.consentimento_presencial} onChange={e => set('consentimento_presencial', e.target.checked)}
              required className="mt-0.5 accent-blue-600"
            />
            <span>
              <strong>A pessoa autorizou o uso dos dados para o cadastro de membros</strong> (ficha assinada ou autorização
              registrada pela secretaria), conforme a LGPD. *
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.aceita_comunicacoes} onChange={e => set('aceita_comunicacoes', e.target.checked)} className="mt-0.5 accent-blue-600" />
            A pessoa aceita receber comunicados da igreja por WhatsApp ou e-mail
          </label>
        </div>
      )}

      {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading && <Loader2 size={15} className="animate-spin" />}
          {editando ? 'Salvar alterações' : 'Cadastrar membro'}
        </button>
        <button type="button" onClick={onCancel} className="px-5 py-2.5 text-gray-600 hover:text-gray-900 text-sm transition">
          Cancelar
        </button>
      </div>
    </form>
  )
}
