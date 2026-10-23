'use client'

import { useState } from 'react'
import { Loader2, Check, Eye, Pipette, Sun, Moon } from 'lucide-react'
import { COLOR_PALETTE } from '@/types'
import { coresDoSite, ehHex } from '@/lib/cores'
import { corPredominante } from '@/lib/imagem'
import type { SiteConfig, SiteTemplate, CorPrimaria } from '@/types'
import { LogoUploader } from './logo-uploader'

// Layouts da página da igreja
const TEMPLATES_IGREJA: { id: SiteTemplate; label: string; desc: string; emoji: string }[] = [
  { id: 'editorial', label: 'Editorial', desc: 'Várias páginas (Início, História, Cultos, Membros), visual de revista', emoji: '📖' },
  { id: 'perfil',    label: 'Perfil',    desc: 'Página única estilo Instagram, aceita tema escuro', emoji: '📱' },
]

const TEMPLATES: { id: SiteTemplate; label: string; desc: string; emoji: string }[] = [
  { id: 'minimalista',   label: 'Minimalista',   desc: 'Clean, foco em texto e missão', emoji: '✦' },
  { id: 'comunitario',   label: 'Comunitário',   desc: 'Hero grande, galeria em destaque', emoji: '🤝' },
  { id: 'institucional', label: 'Institucional', desc: 'Estruturado e profissional', emoji: '🏛️' },
  { id: 'colorido',      label: 'Colorido',      desc: 'Vibrante, para projetos jovens', emoji: '🎨' },
  { id: 'galeria',       label: 'Galeria',       desc: 'Fotos em destaque, visual forte', emoji: '📸' },
]

interface Props {
  config: SiteConfig | null
  subdomain?: string
  /** Conta de igreja: mostra a escolha de tema (aplicado ao perfil público) */
  ehIgreja?: boolean
}

export default function AparenciaForm({ config, subdomain, ehIgreja = false }: Props) {
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [template, setTemplate] = useState<SiteTemplate>(
    ehIgreja ? (config?.template_id === 'editorial' ? 'editorial' : 'perfil') : (config?.template_id || 'comunitario')
  )
  const [logoHorizontal, setLogoHorizontal] = useState(config?.logo_horizontal_url ?? '')
  const [enviandoLogoH, setEnviandoLogoH] = useState(false)
  const [erroLogoH, setErroLogoH] = useState<string | null>(null)

  // Logo por extenso: sem recorte, para manter o fundo transparente (o servidor converte para WebP)
  async function enviarLogoHorizontal(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setEnviandoLogoH(true)
    setErroLogoH(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('slot', 'logo-horizontal')
      const res = await fetch('/api/admin/site/imagem', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro no envio')
      setLogoHorizontal(data.url)
    } catch (err) {
      setErroLogoH(err instanceof Error ? err.message : 'Erro no envio')
    } finally {
      setEnviandoLogoH(false)
    }
  }
  const [cor, setCor] = useState<CorPrimaria>(config?.cor_primaria || 'azul-oceano')
  const [publicado, setPublicado] = useState(config?.publicado ?? false)
  const [logoUrl, setLogoUrl] = useState(config?.logo_url || '')

  const [corPersonalizada, setCorPersonalizada] = useState(config?.cor_personalizada ?? '')
  const [tema, setTema] = useState<'claro' | 'escuro'>(config?.tema ?? 'claro')
  const [extraindo, setExtraindo] = useState(false)
  const [erroCor, setErroCor] = useState<string | null>(null)

  const selectedColors = coresDoSite({ cor_primaria: cor, cor_personalizada: ehHex(corPersonalizada) ? corPersonalizada : null })

  async function usarCorDoLogo() {
    if (!logoUrl) return
    setExtraindo(true)
    setErroCor(null)
    try {
      const hex = await corPredominante(logoUrl)
      if (hex) setCorPersonalizada(hex)
      else setErroCor('Não encontramos uma cor marcante no logo. Escolha manualmente.')
    } catch {
      setErroCor('Não foi possível ler o logo. Escolha a cor manualmente.')
    } finally {
      setExtraindo(false)
    }
  }

  async function handleSave() {
    setLoading(true)
    try {
      await fetch('/api/admin/site/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: template, cor_primaria: cor, publicado, logo_url: logoUrl || null,
          ...(ehIgreja ? { logo_horizontal_url: logoHorizontal || null } : {}),
          cor_personalizada: ehHex(corPersonalizada) ? corPersonalizada.toLowerCase() : null,
          ...(ehIgreja ? { tema } : {}),
        }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Templates */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Layout do site</h2>
        <div className={`grid gap-3 ${ehIgreja ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
          {(ehIgreja ? TEMPLATES_IGREJA : TEMPLATES).map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTemplate(t.id)}
              className={`relative p-4 rounded-xl border-2 text-left transition ${
                template === t.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              {template === t.id && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <Check size={12} className="text-white" />
                </div>
              )}
              <span className="text-2xl block mb-2">{t.emoji}</span>
              <p className="text-sm font-semibold text-gray-900">{t.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Cores */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Paleta de cores</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {(Object.entries(COLOR_PALETTE) as [CorPrimaria, typeof COLOR_PALETTE[CorPrimaria]][]).map(([key, val]) => (
            <button
              key={key}
              type="button"
              onClick={() => { setCor(key); setCorPersonalizada('') }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-xs font-medium transition ${
                cor === key ? 'border-gray-900' : 'border-transparent hover:border-gray-200'
              }`}
            >
              <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: val.primary }} />
              <span className="truncate">{val.label}</span>
            </button>
          ))}
        </div>

        {/* Cor exata da marca (substitui a paleta) */}
        <div className="mt-5 pt-5 border-t border-gray-100">
          <p className="text-sm font-medium text-gray-700 mb-1">Cor exata da igreja</p>
          <p className="text-xs text-gray-500 mb-3">Use a cor da sua marca. Quando preenchida, substitui a paleta acima.</p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="color"
              value={ehHex(corPersonalizada) ? corPersonalizada : selectedColors.marca}
              onChange={e => setCorPersonalizada(e.target.value)}
              className="w-11 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5 bg-white"
              aria-label="Escolher cor"
            />
            <input
              value={corPersonalizada}
              onChange={e => setCorPersonalizada(e.target.value.trim())}
              placeholder="#FD6A08"
              maxLength={7}
              className="w-28 px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Código da cor"
            />
            <button
              type="button"
              onClick={usarCorDoLogo}
              disabled={!logoUrl || extraindo}
              title={logoUrl ? undefined : 'Envie o logo primeiro'}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40"
            >
              {extraindo ? <Loader2 size={14} className="animate-spin" /> : <Pipette size={14} />}
              Usar a cor do logo
            </button>
            {corPersonalizada && (
              <button type="button" onClick={() => setCorPersonalizada('')} className="text-sm text-gray-500 hover:text-gray-800 underline">
                Voltar à paleta
              </button>
            )}
          </div>
          {corPersonalizada && !ehHex(corPersonalizada) && <p className="mt-2 text-xs text-red-600">Use o formato #RRGGBB, ex.: #FD6A08</p>}
          {erroCor && <p className="mt-2 text-xs text-red-600">{erroCor}</p>}
        </div>

        {/* Preview da cor selecionada */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 h-10 rounded-xl" style={{ backgroundColor: selectedColors.marca }} />
          <div className="flex-1 h-10 rounded-xl flex items-center justify-center text-white text-xs font-semibold" style={{ backgroundColor: selectedColors.primary }}>Botão</div>
          <div className="flex-1 h-10 rounded-xl" style={{ backgroundColor: selectedColors.secondary }} />
        </div>
        <p className="text-xs text-gray-400 mt-2">Cor da marca · Botões com texto branco (ajustada para leitura) · Destaque</p>
      </div>

      {/* Tema da página da igreja (layout Perfil) */}
      {ehIgreja && template === 'perfil' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Tema da página</h2>
          <p className="text-xs text-gray-500 mb-4">Fundo da página pública da igreja.</p>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            {([['claro', 'Claro', Sun, '#f9fafb', '#111827'], ['escuro', 'Escuro', Moon, '#0a0a0a', '#ffffff']] as const).map(([valor, rotulo, Icone, fundo, texto]) => (
              <button
                key={valor}
                type="button"
                onClick={() => setTema(valor)}
                className={`relative rounded-xl border-2 overflow-hidden text-left transition ${tema === valor ? 'border-blue-500' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className="h-16 p-3 flex flex-col justify-between" style={{ backgroundColor: fundo }}>
                  <div className="h-2 w-16 rounded" style={{ backgroundColor: texto, opacity: 0.8 }} />
                  <div className="h-4 w-20 rounded" style={{ backgroundColor: selectedColors.marca }} />
                </div>
                <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-800">
                  <Icone size={15} /> {rotulo}
                  {tema === valor && <Check size={15} className="ml-auto text-blue-600" />}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Logo */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Logo</h2>
        <LogoUploader
          currentUrl={logoUrl || null}
          onSaved={url => setLogoUrl(url)}
        />
      </div>

      {/* Logo por extenso (layout Editorial) */}
      {ehIgreja && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Logo por extenso</h2>
          <p className="text-xs text-gray-500 mb-4">Marca horizontal (ex.: símbolo + nome), em PNG ou WebP <strong>sem fundo</strong>. No layout Editorial ela aparece em branco sobre o topo colorido.</p>
          {logoHorizontal && (
            <div className="mb-3 p-4 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${selectedColors.marca}, ${selectedColors.primary})` }}>
              <img src={logoHorizontal} alt="Logo por extenso" className="h-12 w-auto [filter:brightness(0)_invert(1)]" />
            </div>
          )}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
              {enviandoLogoH && <Loader2 size={14} className="animate-spin" />}
              {logoHorizontal ? 'Trocar' : 'Enviar logo'}
              <input type="file" accept="image/png,image/webp,image/svg+xml" className="hidden" onChange={enviarLogoHorizontal} disabled={enviandoLogoH} />
            </label>
            {logoHorizontal && <button type="button" onClick={() => setLogoHorizontal('')} className="text-sm text-red-600 hover:underline">Remover</button>}
          </div>
          {erroLogoH && <p className="mt-2 text-xs text-red-600">{erroLogoH}</p>}
        </div>
      )}

      {/* Publicação */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Visibilidade</h2>
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => setPublicado(v => !v)}
            className={`relative w-11 h-6 rounded-full transition ${publicado ? 'bg-green-500' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${publicado ? 'translate-x-5' : ''}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{publicado ? 'Site publicado' : 'Site não publicado'}</p>
            <p className="text-xs text-gray-500">
              {publicado ? 'Visitantes podem ver seu site' : 'Apenas você vê enquanto não publicar'}
            </p>
          </div>
        </label>

        {publicado && subdomain && (
          <a
            href={`https://${subdomain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 transition text-sm font-medium"
          >
            <Eye size={16} />
            Visualizar site público
          </a>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading && <Loader2 size={15} className="animate-spin" />}
          {saved ? <><Check size={15} /> Salvo!</> : 'Salvar aparência'}
        </button>
      </div>
    </div>
  )
}
