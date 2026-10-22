'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Loader2, Copy, Check, Download, ExternalLink } from 'lucide-react'
import {
  CAMINHOS_INGRESSO, TEXTOS_PADRAO_INGRESSO, type MembresiaConfigPublica,
} from '@/lib/membros'
import type { CaminhoIngresso } from '@/types'

interface Props {
  inicial: MembresiaConfigPublica
  linkCadastro: string
  onSuccess: () => void
  onCancel: () => void
}

const input = 'w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
const label = 'block text-sm font-medium text-gray-700 mb-1'

export default function MembresiaConfigForm({ inicial, linkCadastro, onSuccess, onCancel }: Props) {
  const [form, setForm] = useState({
    formulario_aberto: inicial.formulario_aberto,
    curso_nome: inicial.curso_nome ?? '',
    curso_descricao: inicial.curso_descricao ?? '',
    curso_caminhos: inicial.curso_caminhos,
    texto_aclamacao: inicial.texto_aclamacao ?? '',
    texto_transferencia: inicial.texto_transferencia ?? '',
    texto_batismo: inicial.texto_batismo ?? '',
    contato_privacidade: inicial.contato_privacidade ?? '',
    mensagem_sucesso: inicial.mensagem_sucesso ?? '',
  })
  const [qr, setQr] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    QRCode.toDataURL(linkCadastro, { width: 480, margin: 2 }).then(setQr).catch(() => setQr(null))
  }, [linkCadastro])

  function set<K extends keyof typeof form>(campo: K, valor: (typeof form)[K]) {
    setForm(f => ({ ...f, [campo]: valor }))
  }

  function toggleCaminho(c: CaminhoIngresso) {
    set('curso_caminhos', form.curso_caminhos.includes(c) ? form.curso_caminhos.filter(x => x !== c) : [...form.curso_caminhos, c])
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(linkCadastro)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch { /* navegador sem permissão — o link continua visível para copiar à mão */ }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/membresia-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || 'Erro ao salvar'); return }
      onSuccess()
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Compartilhar */}
      <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
        <p className="text-sm font-semibold text-blue-900 mb-3">Link do formulário</p>
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          {qr && <img src={qr} alt="QR code do formulário de cadastro" className="w-32 h-32 rounded-lg bg-white p-1 shrink-0" />}
          <div className="flex-1 min-w-0 w-full space-y-2">
            <p className="text-sm text-blue-900 break-all font-mono bg-white rounded-lg px-3 py-2 border border-blue-100">{linkCadastro}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={copiar} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                {copiado ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                {copiado ? 'Copiado!' : 'Copiar link'}
              </button>
              {qr && (
                <a href={qr} download="qrcode-cadastro-membros.png" className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                  <Download size={14} /> Baixar QR code
                </a>
              )}
              <a href={linkCadastro} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                <ExternalLink size={14} /> Abrir
              </a>
            </div>
            <p className="text-xs text-blue-800/70">Use o QR code no boletim, no telão ou em um cartaz na entrada.</p>
          </div>
        </div>
      </div>

      <label className="flex items-center justify-between gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer">
        <span>
          <span className="block text-sm font-medium text-gray-900">Formulário aberto</span>
          <span className="block text-xs text-gray-500">Desligue para pausar novos cadastros pelo link.</span>
        </span>
        <input
          type="checkbox" checked={form.formulario_aberto} onChange={e => set('formulario_aberto', e.target.checked)}
          className="w-5 h-5 accent-blue-600"
        />
      </label>

      {/* Curso de integração */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Curso de integração</legend>
        <div>
          <label htmlFor="c-curso" className={label}>Nome do curso</label>
          <input
            id="c-curso" value={form.curso_nome} onChange={e => set('curso_nome', e.target.value)}
            placeholder="Ex.: Café da CIB (deixe vazio se não houver)" className={input}
          />
        </div>
        {form.curso_nome.trim() && (
          <>
            <div>
              <label htmlFor="c-curso-desc" className={label}>Explicação curta</label>
              <input
                id="c-curso-desc" value={form.curso_descricao} onChange={e => set('curso_descricao', e.target.value)}
                placeholder="Ex.: Um encontro sobre os valores da igreja para quem está chegando." className={input}
              />
            </div>
            <div>
              <p className={label}>Perguntar “Você já participou do {form.curso_nome.trim()}?” para quem quer ser membro por:</p>
              <div className="flex flex-wrap gap-4">
                {CAMINHOS_INGRESSO.map(c => (
                  <label key={c} className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={form.curso_caminhos.includes(c)} onChange={() => toggleCaminho(c)} className="accent-blue-600" />
                    {TEXTOS_PADRAO_INGRESSO[c].titulo.replace(/^Por |^Pelo /, '')}
                  </label>
                ))}
              </div>
            </div>
          </>
        )}
      </fieldset>

      {/* Textos dos caminhos */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Explicação de cada caminho</legend>
        <p className="text-xs text-gray-500 -mt-1">Deixe vazio para usar o texto padrão (aparece em cinza).</p>
        {CAMINHOS_INGRESSO.map(c => (
          <div key={c}>
            <label htmlFor={`c-texto-${c}`} className={label}>{TEXTOS_PADRAO_INGRESSO[c].titulo}</label>
            <textarea
              id={`c-texto-${c}`} rows={2}
              value={form[`texto_${c}`]}
              onChange={e => set(`texto_${c}`, e.target.value)}
              placeholder={TEXTOS_PADRAO_INGRESSO[c].texto}
              className={input}
            />
          </div>
        ))}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Mensagens</legend>
        <div>
          <label htmlFor="c-sucesso" className={label}>Mensagem extra ao final do cadastro</label>
          <textarea
            id="c-sucesso" rows={2} value={form.mensagem_sucesso} onChange={e => set('mensagem_sucesso', e.target.value)}
            placeholder="Ex.: Nossos cultos são aos domingos, às 10h e às 18h." className={input}
          />
        </div>
        <div>
          <label htmlFor="c-privacidade" className={label}>Contato para assuntos de privacidade (LGPD)</label>
          <input
            id="c-privacidade" value={form.contato_privacidade} onChange={e => set('contato_privacidade', e.target.value)}
            placeholder="E-mail ou telefone da secretaria" className={input}
          />
          <p className="mt-1 text-xs text-gray-500">Aparece no aviso de privacidade como canal para o membro pedir acesso, correção ou exclusão dos dados.</p>
        </div>
      </fieldset>

      {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading && <Loader2 size={15} className="animate-spin" />}
          Salvar
        </button>
        <button type="button" onClick={onCancel} className="px-5 py-2.5 text-gray-600 hover:text-gray-900 text-sm transition">
          Cancelar
        </button>
      </div>
    </form>
  )
}
