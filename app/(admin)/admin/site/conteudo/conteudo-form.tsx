'use client'

import { useState } from 'react'
import { Loader2, Check, MapPin } from 'lucide-react'
import type { SiteConfig } from '@/types'
import { SiteImageUploader } from '../_components/site-image-uploader'
import { maskPhone, maskCep, isValidEmail } from '@/lib/mascaras'
import { buscarCep } from '@/lib/cep'

interface Props {
  config: SiteConfig | null
  /** Conta de igreja: história e missão ficam em Site → Perfil da igreja */
  ehIgreja?: boolean
}

function initWppDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('55') && digits.length === 13) return maskPhone(digits.slice(2))
  if (digits.startsWith('55') && digits.length === 12) return maskPhone(digits.slice(2))
  return maskPhone(digits)
}

export default function ConteudoForm({ config, ehIgreja = false }: Props) {
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    hero_titulo: config?.hero_titulo || '',
    hero_subtitulo: config?.hero_subtitulo || '',
    hero_cta_texto: config?.hero_cta_texto || 'Saiba mais',
    hero_imagem_url: config?.hero_imagem_url || '',
    sobre_titulo: config?.sobre_titulo || 'Quem Somos',
    sobre_texto: config?.sobre_texto || '',
    sobre_imagem_url: config?.sobre_imagem_url || '',
    missao: config?.missao || '',
    contato_email: config?.contato?.email || '',
    contato_telefone: maskPhone(config?.contato?.telefone || ''),
    contato_whatsapp: initWppDisplay(config?.contato?.whatsapp || ''),
    redes_instagram: config?.redes_sociais?.instagram || '',
    redes_facebook: config?.redes_sociais?.facebook || '',
    redes_youtube: config?.redes_sociais?.youtube || '',
  })
  const [emailError, setEmailError] = useState('')

  // Endereço expandido via CEP
  const [addr, setAddr] = useState({
    cep: '',
    rua: config?.contato?.endereco || '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
  })
  const [cepLoading, setCepLoading] = useState(false)
  const [cepNotFound, setCepNotFound] = useState(false)
  const cepFilled = addr.cidade !== ''

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function setA(field: string, value: string) {
    setAddr(a => ({ ...a, [field]: value }))
  }

  async function searchCep(cep: string) {
    const digits = cep.replace(/\D/g, '')
    if (digits.length !== 8) return
    setCepLoading(true)
    setCepNotFound(false)
    try {
      const data = await buscarCep(digits)
      if (!data) { setCepNotFound(true); return }
      setAddr(a => ({
        ...a,
        rua: data.logradouro || a.rua,
        bairro: data.bairro || '',
        cidade: data.cidade || '',
        estado: data.uf || '',
      }))
    } finally {
      setCepLoading(false)
    }
  }

  function buildEndereco(): string {
    if (!cepFilled && !addr.numero && !addr.bairro) return addr.rua
    return [
      addr.rua,
      addr.numero,
      addr.complemento,
      addr.bairro,
      addr.cidade && addr.estado ? `${addr.cidade}/${addr.estado}` : (addr.cidade || addr.estado),
      addr.cep ? `CEP ${addr.cep}` : '',
    ].filter(Boolean).join(', ')
  }

  function handleEmailBlur() {
    if (form.contato_email && !isValidEmail(form.contato_email)) {
      setEmailError('Email inválido')
    } else {
      setEmailError('')
    }
  }

  async function handleSave() {
    if (form.contato_email && !isValidEmail(form.contato_email)) {
      setEmailError('Email inválido')
      return
    }
    setLoading(true)
    try {
      const wppDigits = form.contato_whatsapp.replace(/\D/g, '')
      await fetch('/api/admin/site/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hero_titulo: form.hero_titulo,
          hero_subtitulo: form.hero_subtitulo,
          hero_cta_texto: form.hero_cta_texto,
          hero_imagem_url: form.hero_imagem_url || null,
          // Igreja edita história/missão no Perfil da igreja — não sobrescreve daqui
          ...(ehIgreja ? {} : {
            sobre_titulo: form.sobre_titulo,
            sobre_texto: form.sobre_texto,
            sobre_imagem_url: form.sobre_imagem_url || null,
            missao: form.missao,
          }),
          contato: {
            email: form.contato_email,
            telefone: form.contato_telefone,
            endereco: buildEndereco(),
            whatsapp: wppDigits ? `55${wppDigits}` : '',
          },
          redes_sociais: {
            instagram: form.redes_instagram,
            facebook: form.redes_facebook,
            youtube: form.redes_youtube,
          },
        }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
  const inputErrClass = "w-full px-3 py-2.5 text-sm border border-red-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400"
  const labelClass = "block text-sm font-medium text-gray-700 mb-1"

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Seção Principal (Hero)</h2>
        <div>
          <label className={labelClass}>Título principal</label>
          <input value={form.hero_titulo} onChange={e => set('hero_titulo', e.target.value)} placeholder="Nome do projeto" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Subtítulo</label>
          <input value={form.hero_subtitulo} onChange={e => set('hero_subtitulo', e.target.value)} placeholder="Uma frase que resume o que fazemos" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Texto do botão</label>
          <input value={form.hero_cta_texto} onChange={e => set('hero_cta_texto', e.target.value)} placeholder="Saiba mais" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Imagem de fundo</label>
          <SiteImageUploader
            currentUrl={form.hero_imagem_url}
            slot="hero-bg"
            aspect={16 / 9}
            modalTitle="Ajustar imagem de fundo (banner)"
            hint="PNG, JPG ou WebP · máx. 8MB"
            description="Aparece como fundo do banner principal cobrindo toda a largura da tela. Tamanho ideal: 1920×1080 px."
            exampleImage="/site-examples/hero.svg"
            onSaved={url => set('hero_imagem_url', url)}
          />
        </div>
      </section>

      {/* Sobre nós — igrejas usam a História e a Missão do Perfil da igreja */}
      {ehIgreja ? (
        <section className="bg-blue-50 border border-blue-100 rounded-xl p-5 text-sm text-blue-900">
          <p className="font-semibold mb-1">Quem somos, história e missão</p>
          <p>
            Na página da igreja, essas informações ficam em{' '}
            <a href="/admin/site/igreja" className="underline font-medium">Site → Perfil da igreja</a>, para não repetir o mesmo texto em dois lugares.
          </p>
        </section>
      ) : (
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Seção Sobre Nós</h2>
          <div>
            <label className={labelClass}>Título da seção</label>
            <input value={form.sobre_titulo} onChange={e => set('sobre_titulo', e.target.value)} placeholder="Quem Somos" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Texto</label>
            <textarea value={form.sobre_texto} onChange={e => set('sobre_texto', e.target.value)} rows={5} placeholder="Conte a história e o propósito da organização..." className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div>
            <label className={labelClass}>Imagem</label>
            <SiteImageUploader
              currentUrl={form.sobre_imagem_url}
              slot="sobre-img"
              aspect={1}
              modalTitle="Ajustar imagem da seção Sobre"
              hint="PNG, JPG ou WebP · máx. 8MB"
              description="Aparece quadrada ao lado do texto da seção Sobre. Tamanho ideal: 800×800 px."
              exampleImage="/site-examples/sobre.svg"
              onSaved={url => set('sobre_imagem_url', url)}
            />
          </div>
          <div>
            <label className={labelClass}>Missão</label>
            <textarea value={form.missao} onChange={e => set('missao', e.target.value)} rows={2} placeholder="Nossa missão é..." className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
        </section>
      )}

      {/* Contato */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Contato</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Email */}
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={form.contato_email}
              onChange={e => { set('contato_email', e.target.value); setEmailError('') }}
              onBlur={handleEmailBlur}
              placeholder="contato@org.com"
              className={emailError ? inputErrClass : inputClass}
            />
            {emailError && <p className="mt-1 text-xs text-red-500">{emailError}</p>}
          </div>

          {/* Telefone */}
          <div>
            <label className={labelClass}>Telefone</label>
            <input
              value={form.contato_telefone}
              onChange={e => set('contato_telefone', maskPhone(e.target.value))}
              placeholder="(41) 99999-9999"
              className={inputClass}
            />
          </div>

          {/* WhatsApp */}
          <div>
            <label className={labelClass}>WhatsApp</label>
            <div className="flex items-center gap-0">
              <span className="flex items-center justify-center h-[42px] px-3 bg-gray-50 border border-r-0 border-gray-300 rounded-l-lg text-sm text-gray-500 shrink-0">
                🇧🇷 +55
              </span>
              <input
                value={form.contato_whatsapp}
                onChange={e => set('contato_whatsapp', maskPhone(e.target.value))}
                placeholder="(41) 99999-9999"
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">O código +55 é adicionado automaticamente</p>
          </div>
        </div>

        {/* Endereço via CEP */}
        <div className="pt-2 border-t border-gray-100">
          <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
            <MapPin size={14} className="text-gray-400" /> Endereço
          </label>

          {/* CEP */}
          <div className="mb-4 max-w-[180px]">
            <label className={labelClass}>CEP</label>
            <div className="relative">
              <input
                value={addr.cep}
                onChange={e => {
                  const masked = maskCep(e.target.value)
                  setA('cep', masked)
                  setCepNotFound(false)
                  if (masked.replace(/\D/g, '').length === 8) searchCep(masked)
                }}
                placeholder="00000-000"
                maxLength={9}
                className={`${cepNotFound ? inputErrClass : inputClass} pr-8`}
              />
              {cepLoading && (
                <Loader2 size={14} className="animate-spin absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              )}
              {cepFilled && !cepLoading && (
                <Check size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-green-500" />
              )}
            </div>
            {cepNotFound && <p className="mt-1 text-xs text-red-500">CEP não encontrado</p>}
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            {/* Rua */}
            <div className="sm:col-span-2">
              <label className={labelClass}>
                Rua / Logradouro
                {cepFilled && <span className="ml-1 text-xs text-blue-500 font-normal">preenchido pelo CEP</span>}
              </label>
              <input
                value={addr.rua}
                onChange={e => setA('rua', e.target.value)}
                placeholder="Rua, Avenida, Alameda..."
                className={inputClass}
              />
            </div>
            {/* Número */}
            <div>
              <label className={labelClass}>Número</label>
              <input
                value={addr.numero}
                onChange={e => setA('numero', e.target.value)}
                placeholder="123"
                className={inputClass}
              />
            </div>
            {/* Complemento */}
            <div>
              <label className={labelClass}>Complemento</label>
              <input
                value={addr.complemento}
                onChange={e => setA('complemento', e.target.value)}
                placeholder="Sala 2, Bloco B..."
                className={inputClass}
              />
            </div>
            {/* Bairro */}
            <div>
              <label className={labelClass}>
                Bairro
                {cepFilled && <span className="ml-1 text-xs text-blue-500 font-normal">auto</span>}
              </label>
              <input
                value={addr.bairro}
                onChange={e => setA('bairro', e.target.value)}
                placeholder="Centro"
                className={inputClass}
              />
            </div>
            {/* Cidade */}
            <div>
              <label className={labelClass}>
                Cidade
                {cepFilled && <span className="ml-1 text-xs text-blue-500 font-normal">auto</span>}
              </label>
              <input
                value={addr.cidade}
                onChange={e => setA('cidade', e.target.value)}
                placeholder="Curitiba"
                className={inputClass}
              />
            </div>
            {/* Estado */}
            <div>
              <label className={labelClass}>
                Estado
                {cepFilled && <span className="ml-1 text-xs text-blue-500 font-normal">auto</span>}
              </label>
              <input
                value={addr.estado}
                onChange={e => setA('estado', e.target.value)}
                placeholder="PR"
                maxLength={2}
                className={inputClass}
              />
            </div>
          </div>

          {/* Preview do endereço completo */}
          {buildEndereco() && (
            <div className="mt-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500 mb-0.5">Como ficará no site:</p>
              <p className="text-sm text-gray-700">{buildEndereco()}</p>
            </div>
          )}
        </div>
      </section>

      {/* Redes sociais */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Redes Sociais</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Instagram (URL)</label>
            <input value={form.redes_instagram} onChange={e => set('redes_instagram', e.target.value)} placeholder="https://instagram.com/..." className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Facebook (URL)</label>
            <input value={form.redes_facebook} onChange={e => set('redes_facebook', e.target.value)} placeholder="https://facebook.com/..." className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>YouTube (URL)</label>
            <input value={form.redes_youtube} onChange={e => set('redes_youtube', e.target.value)} placeholder="https://youtube.com/..." className={inputClass} />
          </div>
        </div>
      </section>

      <button
        onClick={handleSave} disabled={loading || !!emailError}
        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
      >
        {loading && <Loader2 size={15} className="animate-spin" />}
        {saved ? <><Check size={15} /> Salvo!</> : 'Salvar conteúdo'}
      </button>
    </div>
  )
}
