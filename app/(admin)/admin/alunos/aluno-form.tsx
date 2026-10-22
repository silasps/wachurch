'use client'

import { useState } from 'react'
import { Loader2, Printer } from 'lucide-react'
import { buscarCep as consultarCep } from '@/lib/cep'

const SIM_NAO = [
  { value: 'sim', label: 'Sim' },
  { value: 'nao', label: 'Não' },
]

type Form = {
  // Dados pessoais
  nome: string
  data_nascimento: string
  cpf: string
  documento_tipo: string
  documento_numero: string
  sexo: string
  telefone: string
  email: string
  // Endereço
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
  // Status
  status: string
  // Socioeconômico
  renda_familiar: string
  moradores_casa: string
  situacao_moradia: string
  beneficiario_programa: string
  programas_sociais: string
  responsavel_trabalha: string
  // Escolar
  esta_estudando: string
  escola_nome: string
  serie_ano: string
  periodo_escolar: string
  // Saúde
  possui_doenca: string
  qual_doenca: string
  usa_medicacao: string
  qual_medicacao: string
  possui_alergias: string
  quais_alergias: string
  limitacao_fisica: string
  qual_limitacao: string
  pode_atividade_fisica: string
  // Projeto
  turma_desejada: string
  modalidade: string
  como_conheceu: string
  como_conheceu_detalhe: string
  ja_participou_antes: string
  // Termos
  autorizacao_imagem: string
  // Extra
  observacoes: string
}

const INITIAL: Form = {
  nome: '', data_nascimento: '', cpf: '', documento_tipo: 'rg',
  documento_numero: '', sexo: '', telefone: '', email: '',
  cep: '', logradouro: '', numero: '', complemento: '',
  bairro: '', cidade: '', uf: 'PR',
  status: 'aguardando',
  renda_familiar: '', moradores_casa: '', situacao_moradia: '',
  beneficiario_programa: '', programas_sociais: '', responsavel_trabalha: '',
  esta_estudando: '', escola_nome: '', serie_ano: '', periodo_escolar: '',
  possui_doenca: '', qual_doenca: '', usa_medicacao: '', qual_medicacao: '',
  possui_alergias: '', quais_alergias: '', limitacao_fisica: '',
  qual_limitacao: '', pode_atividade_fisica: '',
  turma_desejada: '', modalidade: '', como_conheceu: '',
  como_conheceu_detalhe: '', ja_participou_antes: '',
  autorizacao_imagem: '',
  observacoes: '',
}

interface AlunoFormProps {
  onSuccess: () => void
  onCancel: () => void
}

export default function AlunoForm({ onSuccess, onCancel }: AlunoFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<Form>(INITIAL)

  function set(field: keyof Form, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function buscarCep() {
    const cep = form.cep.replace(/\D/g, '')
    if (cep.length !== 8) return
    const data = await consultarCep(cep)
    if (data) {
      setForm(f => ({
        ...f,
        logradouro: data.logradouro || f.logradouro,
        bairro: data.bairro || f.bairro,
        cidade: data.cidade || f.cidade,
        uf: data.uf || f.uf,
      }))
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const dados_complementares = {
      socioeconomico: {
        renda_familiar: form.renda_familiar,
        moradores_casa: form.moradores_casa,
        situacao_moradia: form.situacao_moradia,
        beneficiario_programa: form.beneficiario_programa,
        programas_sociais: form.programas_sociais,
        responsavel_trabalha: form.responsavel_trabalha,
      },
      escolar: {
        esta_estudando: form.esta_estudando,
        escola_nome: form.escola_nome,
        serie_ano: form.serie_ano,
        periodo_escolar: form.periodo_escolar,
      },
      saude: {
        possui_doenca: form.possui_doenca,
        qual_doenca: form.qual_doenca,
        usa_medicacao: form.usa_medicacao,
        qual_medicacao: form.qual_medicacao,
        possui_alergias: form.possui_alergias,
        quais_alergias: form.quais_alergias,
        limitacao_fisica: form.limitacao_fisica,
        qual_limitacao: form.qual_limitacao,
        pode_atividade_fisica: form.pode_atividade_fisica,
      },
      projeto: {
        turma_desejada: form.turma_desejada,
        modalidade: form.modalidade,
        como_conheceu: form.como_conheceu,
        como_conheceu_detalhe: form.como_conheceu_detalhe,
        ja_participou_antes: form.ja_participou_antes,
      },
    }

    const endereco = {
      logradouro: form.logradouro,
      numero: form.numero,
      complemento: form.complemento,
      bairro: form.bairro,
      cidade: form.cidade,
      uf: form.uf,
      cep: form.cep,
    }

    try {
      const res = await fetch('/api/admin/alunos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome,
          data_nascimento: form.data_nascimento || null,
          telefone: form.telefone || null,
          email: form.email || null,
          cpf: form.cpf || null,
          documento_tipo: form.documento_tipo,
          documento_numero: form.documento_numero || null,
          sexo: form.sexo || null,
          status: form.status,
          autorizacao_imagem: form.autorizacao_imagem === 'sim' ? true : form.autorizacao_imagem === 'nao' ? false : null,
          endereco,
          dados_complementares,
          observacoes: form.observacoes || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro ao cadastrar aluno'); return }
      onSuccess()
    } catch {
      setError('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  const input = "w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
  const label = "block text-sm font-medium text-gray-700 mb-1"
  const section = "bg-white rounded-xl border border-gray-200 p-6 space-y-4"
  const sectionTitle = "text-sm font-semibold text-gray-500 uppercase tracking-wide"

  function RadioGroup({
    field, options
  }: { field: keyof Form; options: { value: string; label: string }[] }) {
    return (
      <div className="flex flex-wrap gap-3">
        {options.map(opt => (
          <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={field}
              value={opt.value}
              checked={form[field] === opt.value}
              onChange={() => set(field, opt.value)}
              className="accent-blue-600"
            />
            <span className="text-sm text-gray-700">{opt.label}</span>
          </label>
        ))}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* 1. Dados pessoais */}
      <div className={section}>
        <h2 className={sectionTitle}>1. Dados pessoais do aluno</h2>
        <div>
          <label className={label}>Nome completo *</label>
          <input value={form.nome} onChange={e => set('nome', e.target.value)} required placeholder="Nome do aluno" className={input} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>Data de nascimento</label>
            <input type="date" value={form.data_nascimento} onChange={e => set('data_nascimento', e.target.value)} className={input} />
          </div>
          <div>
            <label className={label}>CPF</label>
            <input value={form.cpf} onChange={e => set('cpf', e.target.value)} placeholder="000.000.000-00" className={input} />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>Documento principal</label>
            <select value={form.documento_tipo} onChange={e => set('documento_tipo', e.target.value)} className={input}>
              <option value="rg">RG</option>
              <option value="certidao_nascimento">Certidão de nascimento</option>
            </select>
          </div>
          <div>
            <label className={label}>Número do documento</label>
            <input value={form.documento_numero} onChange={e => set('documento_numero', e.target.value)} placeholder="Número" className={input} />
          </div>
        </div>
        <div>
          <label className={label}>Sexo</label>
          <RadioGroup field="sexo" options={[
            { value: 'feminino', label: 'Feminino' },
            { value: 'masculino', label: 'Masculino' },
            { value: 'outro', label: 'Outro' },
            { value: 'nao_informado', label: 'Prefiro não informar' },
          ]} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>Telefone</label>
            <input value={form.telefone} onChange={e => set('telefone', e.target.value)} placeholder="(41) 99999-9999" className={input} />
          </div>
          <div>
            <label className={label}>E-mail</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@exemplo.com" className={input} />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)} className={input}>
              <option value="aguardando">Aguardando</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
              <option value="concluido">Concluído</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Endereço */}
      <div className={section}>
        <h2 className={sectionTitle}>2. Endereço</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className={label}>CEP</label>
            <input
              value={form.cep}
              onChange={e => set('cep', e.target.value)}
              onBlur={buscarCep}
              placeholder="00000-000"
              className={input}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Rua / Logradouro</label>
            <input value={form.logradouro} onChange={e => set('logradouro', e.target.value)} placeholder="Rua, Avenida..." className={input} />
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className={label}>Número</label>
            <input value={form.numero} onChange={e => set('numero', e.target.value)} placeholder="123" className={input} />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Complemento</label>
            <input value={form.complemento} onChange={e => set('complemento', e.target.value)} placeholder="Apto, bloco..." className={input} />
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className={label}>Bairro</label>
            <input value={form.bairro} onChange={e => set('bairro', e.target.value)} className={input} />
          </div>
          <div>
            <label className={label}>Cidade</label>
            <input value={form.cidade} onChange={e => set('cidade', e.target.value)} className={input} />
          </div>
          <div>
            <label className={label}>UF</label>
            <input value={form.uf} onChange={e => set('uf', e.target.value)} maxLength={2} placeholder="PR" className={input} />
          </div>
        </div>
      </div>

      {/* 3. Dados socioeconômicos */}
      <div className={section}>
        <h2 className={sectionTitle}>3. Dados socioeconômicos</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>Renda familiar (R$)</label>
            <input value={form.renda_familiar} onChange={e => set('renda_familiar', e.target.value)} placeholder="Ex: 1.500,00" className={input} />
          </div>
          <div>
            <label className={label}>Pessoas na casa</label>
            <input type="number" min={1} value={form.moradores_casa} onChange={e => set('moradores_casa', e.target.value)} placeholder="Ex: 4" className={input} />
          </div>
        </div>
        <div>
          <label className={label}>Situação de moradia</label>
          <RadioGroup field="situacao_moradia" options={[
            { value: 'propria', label: 'Própria' },
            { value: 'alugada', label: 'Alugada' },
            { value: 'cedida', label: 'Cedida' },
            { value: 'outra', label: 'Outra' },
          ]} />
        </div>
        <div>
          <label className={label}>Beneficiário de programa social?</label>
          <RadioGroup field="beneficiario_programa" options={SIM_NAO} />
        </div>
        {form.beneficiario_programa === 'sim' && (
          <div>
            <label className={label}>Qual(is) programa(s)?</label>
            <input value={form.programas_sociais} onChange={e => set('programas_sociais', e.target.value)} placeholder="Ex: Bolsa Família, Auxílio Brasil" className={input} />
          </div>
        )}
        <div>
          <label className={label}>Responsável/provedor trabalha?</label>
          <RadioGroup field="responsavel_trabalha" options={SIM_NAO} />
        </div>
      </div>

      {/* 4. Informações escolares */}
      <div className={section}>
        <h2 className={sectionTitle}>4. Informações escolares</h2>
        <p className="text-xs text-gray-400">Preencher se o aluno for criança ou adolescente</p>
        <div>
          <label className={label}>Está estudando?</label>
          <RadioGroup field="esta_estudando" options={SIM_NAO} />
        </div>
        {form.esta_estudando === 'sim' && (
          <>
            <div>
              <label className={label}>Nome da escola</label>
              <input value={form.escola_nome} onChange={e => set('escola_nome', e.target.value)} className={input} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={label}>Série/Ano</label>
                <input value={form.serie_ano} onChange={e => set('serie_ano', e.target.value)} placeholder="Ex: 7º ano" className={input} />
              </div>
              <div>
                <label className={label}>Período</label>
                <RadioGroup field="periodo_escolar" options={[
                  { value: 'manha', label: 'Manhã' },
                  { value: 'tarde', label: 'Tarde' },
                  { value: 'noite', label: 'Noite' },
                  { value: 'integral', label: 'Integral' },
                ]} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* 5. Saúde */}
      <div className={section}>
        <h2 className={sectionTitle}>5. Saúde do aluno</h2>
        <div className="space-y-4">
          <div>
            <label className={label}>Possui alguma doença?</label>
            <RadioGroup field="possui_doenca" options={SIM_NAO} />
            {form.possui_doenca === 'sim' && (
              <input className={`${input} mt-2`} value={form.qual_doenca} onChange={e => set('qual_doenca', e.target.value)} placeholder="Qual doença?" />
            )}
          </div>
          <div>
            <label className={label}>Usa medicação contínua?</label>
            <RadioGroup field="usa_medicacao" options={SIM_NAO} />
            {form.usa_medicacao === 'sim' && (
              <input className={`${input} mt-2`} value={form.qual_medicacao} onChange={e => set('qual_medicacao', e.target.value)} placeholder="Qual medicação?" />
            )}
          </div>
          <div>
            <label className={label}>Possui alergias?</label>
            <RadioGroup field="possui_alergias" options={SIM_NAO} />
            {form.possui_alergias === 'sim' && (
              <input className={`${input} mt-2`} value={form.quais_alergias} onChange={e => set('quais_alergias', e.target.value)} placeholder="Quais alergias?" />
            )}
          </div>
          <div>
            <label className={label}>Tem alguma limitação física?</label>
            <RadioGroup field="limitacao_fisica" options={SIM_NAO} />
            {form.limitacao_fisica === 'sim' && (
              <input className={`${input} mt-2`} value={form.qual_limitacao} onChange={e => set('qual_limitacao', e.target.value)} placeholder="Qual limitação?" />
            )}
          </div>
          <div>
            <label className={label}>Pode praticar atividades físicas?</label>
            <RadioGroup field="pode_atividade_fisica" options={SIM_NAO} />
          </div>
        </div>
      </div>

      {/* 7. Informações do projeto */}
      <div className={section}>
        <h2 className={sectionTitle}>7. Informações do projeto</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>Turma desejada</label>
            <input value={form.turma_desejada} onChange={e => set('turma_desejada', e.target.value)} placeholder="Ex: Balé turma 1" className={input} />
          </div>
          <div>
            <label className={label}>Modalidade</label>
            <input value={form.modalidade} onChange={e => set('modalidade', e.target.value)} placeholder="Ex: Jiu-Jitsu, Pilates..." className={input} />
          </div>
        </div>
        <div>
          <label className={label}>Como conheceu o projeto?</label>
          <RadioGroup field="como_conheceu" options={[
            { value: 'indicacao', label: 'Indicação' },
            { value: 'escola', label: 'Escola' },
            { value: 'instagram', label: 'Instagram' },
            { value: 'facebook', label: 'Facebook' },
            { value: 'site', label: 'Site' },
            { value: 'evento', label: 'Evento' },
            { value: 'outro', label: 'Outro' },
          ]} />
        </div>
        <div>
          <label className={label}>Detalhamento (nome, escola, canal, etc.)</label>
          <input value={form.como_conheceu_detalhe} onChange={e => set('como_conheceu_detalhe', e.target.value)} className={input} />
        </div>
        <div>
          <label className={label}>Já participou antes?</label>
          <RadioGroup field="ja_participou_antes" options={SIM_NAO} />
        </div>
      </div>

      {/* 9. Termos e autorizações */}
      <div className={section}>
        <h2 className={sectionTitle}>9. Autorização de uso de imagem</h2>
        <p className="text-xs text-gray-500">
          Autorização para captação e uso de imagem, voz e nome em fotos e vídeos institucionais.
          O termo completo será enviado para assinatura digital.
        </p>
        <RadioGroup field="autorizacao_imagem" options={[
          { value: 'sim', label: 'Autoriza' },
          { value: 'nao', label: 'Não autoriza' },
        ]} />
      </div>

      {/* Observações */}
      <div className={section}>
        <label className={label}>Observações adicionais</label>
        <textarea
          value={form.observacoes} onChange={e => set('observacoes', e.target.value)}
          rows={3} placeholder="Informações adicionais, situações relevantes..."
          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Documentação necessária */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-blue-900 mb-3">8. Documentação necessária</h3>
        <ul className="space-y-1.5 text-sm text-blue-800">
          <li>✓ Comprovante de residência <span className="text-blue-500 text-xs">(obrigatório)</span></li>
          <li>✓ Atestado médico de aptidão física <span className="text-blue-500 text-xs">(obrigatório)</span></li>
          <li>✓ RG do aluno ou Certidão de nascimento <span className="text-blue-500 text-xs">(obrigatório)</span></li>
          <li>✓ CPF do aluno <span className="text-blue-500 text-xs">(obrigatório)</span></li>
          <li>○ Foto do aluno <span className="text-blue-500 text-xs">(opcional)</span></li>
          <li>✓ Ficha e termos assinados <span className="text-blue-500 text-xs">(enviar link de assinatura digital após cadastro)</span></li>
        </ul>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">{error}</div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit" disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading && <Loader2 size={15} className="animate-spin" />}
          Cadastrar aluno
        </button>
        <button
          type="button"
          onClick={() => window.open('/admin/alunos/ficha-impressao', '_blank')}
          className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
        >
          <Printer size={15} />
          Exportar ficha em branco
        </button>
        <button type="button" onClick={onCancel} className="px-5 py-2.5 text-gray-500 hover:text-gray-700 text-sm transition">
          Cancelar
        </button>
      </div>
    </form>
  )
}
