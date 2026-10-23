'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  UserCheck, HeartHandshake, ChevronLeft, Loader2, CheckCircle2, ShieldCheck, Check, Info,
} from 'lucide-react'
import { PhotoPicker } from '@/components/ui/photo-picker'
import { DocumentPicker } from '@/components/ui/document-picker'
import {
  calcularIdade, isValidCpf, isValidEmail, isValidPhone, maskCep, maskCpf, maskData, maskPhone, parseDataBR, soDigitos,
} from '@/lib/mascaras'
import { buscarCep } from '@/lib/cep'
import {
  ANO_MINIMO, CAMINHOS_INGRESSO, CARTA_MAX_BYTES, ESTADO_CIVIL_LABELS, FORMA_INGRESSO_LABELS, SEXO_LABELS,
  TEXTOS_PADRAO_INGRESSO, cursoSeAplica, textoIngresso, type MembresiaConfigPublica,
} from '@/lib/membros'
import {
  resumoConsentimentoMembro, termosConsentimentoMembro, textoConsentimentoComunicacoes,
} from '@/lib/termos/content-membro'
import type { CaminhoIngresso, EstadoCivil, FormaIngresso, MembroSexo } from '@/types'

type Tipo = '' | 'ja_membro' | 'quer_ser_membro'
type Etapa = 'inicio' | 'ingresso' | 'dados' | 'contato' | 'historico' | 'revisao'

interface Dados {
  tipo: Tipo
  forma: '' | CaminhoIngresso
  igreja_origem: string
  igreja_origem_cidade: string
  entrega_presencial: boolean
  curso: '' | 'sim' | 'nao'
  nome: string
  cpf: string
  nascimento: string
  sexo: '' | MembroSexo
  estado_civil: '' | EstadoCivil
  responsavel_nome: string
  responsavel_celular: string
  celular: string
  whatsapp: boolean
  email: string
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
  ja_forma: '' | FormaIngresso
  batismo: string          // 'AAAA' ou 'DD/MM/AAAA'
  membro_desde_ano: string
  consentimento: boolean
  comunicacoes: boolean
}

const VAZIO: Dados = {
  tipo: '', forma: '', igreja_origem: '', igreja_origem_cidade: '', entrega_presencial: false, curso: '',
  nome: '', cpf: '', nascimento: '', sexo: '', estado_civil: '', responsavel_nome: '', responsavel_celular: '',
  celular: '', whatsapp: true, email: '', cep: '', logradouro: '', numero: '', complemento: '', bairro: '',
  cidade: '', uf: '', ja_forma: '', batismo: '', membro_desde_ano: '', consentimento: false, comunicacoes: false,
}

const TITULOS: Record<Etapa, string> = {
  inicio: 'Vamos começar',
  ingresso: 'Como você quer se tornar membro?',
  dados: 'Seus dados',
  contato: 'Como falamos com você',
  historico: 'Sua história na igreja',
  revisao: 'Confira e envie',
}

function etapasDe(tipo: Tipo): Etapa[] {
  return tipo === 'quer_ser_membro'
    ? ['inicio', 'ingresso', 'dados', 'contato', 'revisao']
    : ['inicio', 'dados', 'contato', 'historico', 'revisao']
}

// Rascunho na sessionStorage (e não localStorage): o formulário pode ser preenchido em um
// tablet compartilhado na entrada da igreja — o rascunho some ao fechar a aba e expira em 2h.
const RASCUNHO_VALIDADE_MS = 2 * 60 * 60 * 1000

// Erros que o servidor pode devolver → etapa onde o campo está
const ETAPA_DO_CAMPO: Record<string, Etapa> = {
  forma_ingresso: 'ingresso', igreja_origem: 'ingresso', igreja_origem_cidade: 'ingresso',
  carta: 'ingresso', fez_curso_integracao: 'ingresso',
  nome: 'dados', cpf: 'dados', data_nascimento: 'dados', sexo: 'dados', foto: 'dados',
  responsavel_nome: 'dados', responsavel_celular: 'dados',
  celular: 'contato', email: 'contato',
  ano_batismo: 'historico', data_batismo: 'historico', membro_desde_ano: 'historico',
}

interface Props {
  igreja: string
  orgSlug: string
  primaryColor: string
  config: MembresiaConfigPublica
  /** Prefixo dos links internos: '' (host do tenant) ou '/s/<slug>' */
  basePath?: string
  /** Vindo dos botões "Quero ser membro" / "Já sou membro": pula a primeira pergunta */
  tipoInicial?: 'ja_membro' | 'quer_ser_membro'
}

export default function CadastroMembroWizard({ igreja, orgSlug, primaryColor, config, basePath = '', tipoInicial }: Props) {
  const [dados, setDados] = useState<Dados>(tipoInicial ? { ...VAZIO, tipo: tipoInicial } : VAZIO)
  const [etapa, setEtapa] = useState<Etapa>(tipoInicial ? etapasDe(tipoInicial)[1] : 'inicio')
  const [erros, setErros] = useState<Record<string, string>>({})
  const [foto, setFoto] = useState<Blob | null>(null)
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)
  const [carta, setCarta] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [erroEnvio, setErroEnvio] = useState<string | null>(null)
  const [enviado, setEnviado] = useState(false)
  const [rascunhoRestaurado, setRascunhoRestaurado] = useState(false)
  // Foto/carta não vão para o rascunho — guarda só SE a pessoa tinha escolhido, para avisar com precisão
  const [arquivosPerdidos, setArquivosPerdidos] = useState({ foto: false, carta: false })
  // Aclamação sem igreja anterior: 1º Continuar só alerta, 2º segue (campo opcional, mas fácil de passar batido)
  const [avisoSemIgreja, setAvisoSemIgreja] = useState(false)
  const [verTermos, setVerTermos] = useState(false)
  const [semCep, setSemCep] = useState(false)
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [cepNaoEncontrado, setCepNaoEncontrado] = useState(false)
  const [honeypot, setHoneypot] = useState('')
  const carregado = useRef(false)
  const topoRef = useRef<HTMLDivElement>(null)

  const chaveRascunho = `cadastro-membro:${orgSlug}`
  const etapas = etapasDe(dados.tipo)
  const indice = etapas.indexOf(etapa)

  const nascimentoIso = parseDataBR(dados.nascimento)
  const batismoIso = parseDataBR(dados.batismo.trim())
  const idade = useMemo(() => (nascimentoIso ? calcularIdade(nascimentoIso) : null), [nascimentoIso])
  const menor = idade !== null && idade >= 0 && idade < 18
  const perguntaCurso = dados.tipo === 'quer_ser_membro' && cursoSeAplica(config, dados.forma)
  const mostrarEndereco = semCep || !!dados.logradouro || !!dados.cidade

  // Restaura rascunho (sem consentimento, foto ou arquivos)
  useEffect(() => {
    try {
      const salvo = sessionStorage.getItem(chaveRascunho)
      if (salvo) {
        const { dados: d, etapa: e, salvoEm, arquivos } = JSON.parse(salvo)
        if (Date.now() - salvoEm < RASCUNHO_VALIDADE_MS && d?.tipo) {
          setDados({ ...VAZIO, ...d, batismo: d.batismo ?? d.ano_batismo ?? '', consentimento: false })
          if (e) setEtapa(e)
          setArquivosPerdidos({ foto: !!arquivos?.foto, carta: !!arquivos?.carta })
          setRascunhoRestaurado(true)
        } else {
          sessionStorage.removeItem(chaveRascunho)
        }
      }
    } catch { /* storage indisponível — segue sem rascunho */ }
    carregado.current = true
  }, [chaveRascunho])

  useEffect(() => {
    if (!carregado.current || enviado) return
    try {
      sessionStorage.setItem(chaveRascunho, JSON.stringify({
        dados: { ...dados, consentimento: false }, etapa, salvoEm: Date.now(),
        arquivos: { foto: !!foto || arquivosPerdidos.foto, carta: !!carta || arquivosPerdidos.carta },
      }))
    } catch { /* ignora */ }
  }, [dados, etapa, enviado, chaveRascunho, foto, carta, arquivosPerdidos])

  useEffect(() => () => { if (fotoUrl) URL.revokeObjectURL(fotoUrl) }, [fotoUrl])

  function set<K extends keyof Dados>(campo: K, valor: Dados[K]) {
    setDados(d => ({ ...d, [campo]: valor }))
    setErros(e => {
      if (!e[campo]) return e
      const resto = { ...e }
      delete resto[campo]
      return resto
    })
  }

  function onFoto(blob: Blob | null) {
    setFoto(blob)
    setFotoUrl(blob ? URL.createObjectURL(blob) : null)
    if (blob) {
      setArquivosPerdidos(a => ({ ...a, foto: false }))
      setErros(e => ({ ...e, foto: '' }))
    }
  }

  async function onCep(valor: string) {
    const masked = maskCep(valor)
    set('cep', masked)
    setCepNaoEncontrado(false)
    if (soDigitos(masked).length !== 8) return
    setBuscandoCep(true)
    const r = await buscarCep(masked)
    setBuscandoCep(false)
    if (!r) {
      setCepNaoEncontrado(true)
      setSemCep(true)
      return
    }
    setDados(d => ({ ...d, logradouro: r.logradouro || d.logradouro, bairro: r.bairro || '', cidade: r.cidade || '', uf: r.uf || '' }))
  }

  function irPara(nova: Etapa) {
    setEtapa(nova)
    setErroEnvio(null)
    requestAnimationFrame(() => topoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  function validar(e: Etapa): Record<string, string> {
    const r: Record<string, string> = {}
    const anoAtual = new Date().getFullYear()
    const anoInvalido = (v: string) => !!v && (!/^\d{4}$/.test(v) || Number(v) < ANO_MINIMO || Number(v) > anoAtual)

    if (e === 'inicio' && !dados.tipo) r.tipo = 'Escolha uma das opções.'
    if (e === 'ingresso') {
      if (!dados.forma) r.forma = 'Escolha uma das opções.'
      if (dados.forma === 'transferencia') {
        if (!dados.igreja_origem.trim()) r.igreja_origem = 'Informe o nome da igreja.'
        if (!dados.igreja_origem_cidade.trim()) r.igreja_origem_cidade = 'Informe a cidade.'
        if (!carta && !dados.entrega_presencial) r.carta = 'Envie a carta ou marque que vai entregá-la pessoalmente.'
      }
      if (perguntaCurso && !dados.curso) r.curso = 'Responda sim ou não.'
    }
    if (e === 'dados') {
      if (!dados.sexo) r.sexo = 'Escolha uma opção.'
      if (!foto) r.foto = 'Envie uma foto para continuar. Pode tirar agora pela câmera.'
      const nome = dados.nome.trim()
      if (nome.length < 3 || !nome.includes(' ')) r.nome = 'Escreva o nome completo (nome e sobrenome).'
      if (!isValidCpf(dados.cpf)) r.cpf = soDigitos(dados.cpf).length < 11 ? 'Digite os 11 números do CPF.' : 'CPF inválido. Confira os números.'
      if (!nascimentoIso || idade === null || idade < 0 || idade > 120) r.nascimento = 'Digite a data no formato dia/mês/ano. Ex.: 25/03/1965'
      if (menor) {
        if (!dados.responsavel_nome.trim()) r.responsavel_nome = 'Informe o nome do responsável.'
        if (!isValidPhone(dados.responsavel_celular)) r.responsavel_celular = 'Informe o celular com DDD.'
      }
    }
    if (e === 'contato') {
      if (!isValidPhone(dados.celular)) r.celular = 'Digite o celular com DDD. Ex.: (11) 98765-4321'
      if (dados.email && !isValidEmail(dados.email.trim())) r.email = 'Confira o e-mail digitado.'
    }
    if (e === 'historico') {
      if (anoInvalido(dados.membro_desde_ano)) r.membro_desde_ano = `Digite um ano entre ${ANO_MINIMO} e ${anoAtual}.`
      const b = dados.batismo.trim()
      if (b && (/^\d{4}$/.test(b) ? anoInvalido(b) : !batismoIso)) r.batismo = 'Digite só o ano (ex.: 2004) ou a data completa (ex.: 15/08/2004).'
    }
    if (e === 'revisao' && !dados.consentimento) r.consentimento = 'Marque a autorização para poder enviar.'
    return r
  }

  function avancar() {
    const r = validar(etapa)
    setErros(r)
    if (Object.keys(r).length) {
      requestAnimationFrame(() => {
        // Ordem da tela: sexo e foto vêm antes dos campos de texto
        if (r.sexo || r.foto) document.getElementById(r.sexo ? 'sexo' : 'foto')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        else document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      })
      return
    }
    if (etapa === 'ingresso' && dados.forma === 'aclamacao' && !dados.igreja_origem.trim() && !avisoSemIgreja) {
      setAvisoSemIgreja(true)
      requestAnimationFrame(() => {
        const campo = document.getElementById('igreja_origem')
        campo?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        campo?.focus({ preventScroll: true })
      })
      return
    }
    const proxima = etapasDe(dados.tipo)[indice + 1]
    if (proxima) irPara(proxima)
  }

  function voltar() {
    const anterior = etapas[indice - 1]
    if (anterior) irPara(anterior)
  }

  function recomecar() {
    try { sessionStorage.removeItem(chaveRascunho) } catch { /* ignora */ }
    setDados(VAZIO)
    setErros({})
    onFoto(null)
    setCarta(null)
    setSemCep(false)
    setRascunhoRestaurado(false)
    irPara('inicio')
  }

  async function enviar() {
    const r = validar('revisao')
    setErros(r)
    if (Object.keys(r).length) return

    setEnviando(true)
    setErroEnvio(null)
    const queroSer = dados.tipo === 'quer_ser_membro'
    const fd = new FormData()
    fd.append('tipo_cadastro', dados.tipo)
    fd.append('forma_ingresso', queroSer ? dados.forma : dados.ja_forma)
    fd.append('igreja_origem', dados.igreja_origem)
    fd.append('igreja_origem_cidade', dados.igreja_origem_cidade)
    fd.append('carta_entrega_presencial', String(queroSer && dados.forma === 'transferencia' && dados.entrega_presencial))
    fd.append('fez_curso_integracao', perguntaCurso ? dados.curso : '')
    fd.append('nome', dados.nome)
    fd.append('cpf', dados.cpf)
    fd.append('data_nascimento', nascimentoIso ?? '')
    fd.append('sexo', dados.sexo)
    fd.append('estado_civil', dados.estado_civil)
    fd.append('responsavel_nome', menor ? dados.responsavel_nome : '')
    fd.append('responsavel_celular', menor ? dados.responsavel_celular : '')
    fd.append('celular', dados.celular)
    fd.append('celular_whatsapp', String(dados.whatsapp))
    fd.append('email', dados.email)
    fd.append('endereco', JSON.stringify({
      cep: dados.cep, logradouro: dados.logradouro, numero: dados.numero, complemento: dados.complemento,
      bairro: dados.bairro, cidade: dados.cidade, uf: dados.uf,
    }))
    fd.append('ano_batismo', queroSer || !/^\d{4}$/.test(dados.batismo.trim()) ? '' : dados.batismo.trim())
    fd.append('data_batismo', queroSer ? '' : batismoIso ?? '')
    fd.append('membro_desde_ano', queroSer ? '' : dados.membro_desde_ano)
    fd.append('consentimento', String(dados.consentimento))
    fd.append('aceita_comunicacoes', String(dados.comunicacoes))
    fd.append('website', honeypot)
    // Fora do host do tenant (/s/<slug>/cadastro) a API identifica a igreja pelo slug
    fd.append('slug', orgSlug)
    if (foto) fd.append('foto', new File([foto], foto.type === 'image/webp' ? 'foto.webp' : 'foto.jpg', { type: foto.type || 'image/jpeg' }))
    if (queroSer && dados.forma === 'transferencia' && carta && !dados.entrega_presencial) fd.append('carta', carta)

    try {
      const res = await fetch('/api/public/membros', { method: 'POST', body: fd })
      if (res.ok) {
        try { sessionStorage.removeItem(chaveRascunho) } catch { /* ignora */ }
        setEnviado(true)
        requestAnimationFrame(() => topoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
        return
      }
      const data = await res.json().catch(() => ({}))
      const msg = data.error || 'Não foi possível enviar. Tente novamente.'
      const campo = data.erros ? Object.keys(data.erros)[0] : null
      const etapaDoErro = campo ? ETAPA_DO_CAMPO[campo] : undefined
      setErroEnvio(etapaDoErro && etapas.includes(etapaDoErro)
        ? `${msg} Toque em “Alterar” na seção “${TITULOS[etapaDoErro]}” para corrigir.`
        : msg)
    } catch {
      setErroEnvio('Sem conexão com a internet. Verifique e tente de novo — seus dados continuam aqui.')
    } finally {
      setEnviando(false)
    }
  }

  const estilo = { ['--cor' as string]: primaryColor } as React.CSSProperties

  // ── Tela de sucesso ──
  if (enviado) {
    const queroSer = dados.tipo === 'quer_ser_membro'
    const proximos: string[] = []
    if (!queroSer) {
      proximos.push('A secretaria vai conferir suas informações. Se precisar de algo, entraremos em contato pelo celular informado.')
    } else if (dados.forma === 'aclamacao') {
      proximos.push('A secretaria vai entrar em contato para combinar sua apresentação na próxima assembleia.')
    } else if (dados.forma === 'transferencia') {
      proximos.push('A secretaria vai entrar em contato e acompanhar sua transferência.')
      if (dados.entrega_presencial) proximos.push('Lembre-se de entregar a carta de transferência na secretaria.')
    } else {
      proximos.push('A secretaria vai entrar em contato para falar sobre a próxima turma de batismo.')
    }
    if (perguntaCurso && dados.curso === 'nao') proximos.push(`Também vamos avisar você sobre a próxima turma do ${config.curso_nome}.`)
    if (config.mensagem_sucesso?.trim()) proximos.push(config.mensagem_sucesso.trim())

    return (
      <div ref={topoRef} style={estilo} className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 text-center scroll-mt-4">
        <CheckCircle2 size={64} className="mx-auto mb-4" style={{ color: primaryColor }} />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Cadastro enviado!</h2>
        <p className="text-lg text-gray-700 mb-6">Obrigado, {dados.nome.trim().split(' ')[0]}.</p>
        <div className="text-left space-y-3 mb-8">
          {proximos.map(t => (
            <p key={t} className="flex gap-3 text-base text-gray-700">
              <Check size={20} className="shrink-0 mt-0.5" style={{ color: primaryColor }} />
              <span>{t}</span>
            </p>
          ))}
        </div>
        <Link href={basePath || '/'} className="inline-block w-full py-4 text-lg font-semibold text-white rounded-2xl" style={{ backgroundColor: primaryColor }}>
          Voltar ao site
        </Link>
      </div>
    )
  }

  return (
    <div ref={topoRef} style={estilo} className="scroll-mt-4">
      {/* Progresso */}
      <div className="mb-5">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span className="font-medium">Passo {indice + 1} de {etapas.length}</span>
          {indice > 0 && (
            <button type="button" onClick={recomecar} className="underline hover:text-gray-900">Começar de novo</button>
          )}
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${((indice + 1) / etapas.length) * 100}%`, backgroundColor: primaryColor }} />
        </div>
      </div>

      {rascunhoRestaurado && etapa !== 'inicio' && (
        <div className="mb-4 flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-900">
          <Info size={18} className="shrink-0 mt-0.5" />
          <p>
            Recuperamos o que você já tinha preenchido.
            {arquivosPerdidos.foto && ' Por segurança, a foto não fica guardada: escolha-a novamente.'}
            {arquivosPerdidos.carta && dados.forma === 'transferencia' && !dados.entrega_presencial && ' Anexe a carta de transferência novamente.'}
          </p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-7">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">{TITULOS[etapa]}</h2>

        {/* Honeypot — invisível para pessoas */}
        <input
          type="text" name="website" value={honeypot} onChange={e => setHoneypot(e.target.value)}
          tabIndex={-1} autoComplete="off" aria-hidden="true"
          className="absolute -left-[9999px] w-px h-px opacity-0"
        />

        {/* ── Início ── */}
        {etapa === 'inicio' && (
          <div className="mt-4 space-y-4">
            <p className="text-base text-gray-600">Você já é membro da {igreja}?</p>
            <OpcaoCard
              selecionado={dados.tipo === 'ja_membro'}
              onClick={() => set('tipo', 'ja_membro')}
              icone={<UserCheck size={28} />}
              titulo="Já sou membro"
              texto="Quero fazer ou atualizar meu cadastro na igreja."
              cor={primaryColor}
            />
            <OpcaoCard
              selecionado={dados.tipo === 'quer_ser_membro'}
              onClick={() => set('tipo', 'quer_ser_membro')}
              icone={<HeartHandshake size={28} />}
              titulo="Quero ser membro"
              texto="Quero fazer parte da igreja."
              cor={primaryColor}
            />
            <Erro msg={erros.tipo} />
            <p className="flex items-start gap-2 text-sm text-gray-500 pt-2">
              <ShieldCheck size={18} className="shrink-0 mt-0.5 text-green-600" />
              <span>
                Seus dados são protegidos pela Lei Geral de Proteção de Dados (LGPD) e usados só pela secretaria da igreja.{' '}
                <a href={`${basePath}/privacidade`} target="_blank" rel="noopener" className="underline">Saiba mais</a>
              </span>
            </p>
          </div>
        )}

        {/* ── Como quer se tornar membro ── */}
        {etapa === 'ingresso' && (
          <div className="mt-4 space-y-4">
            <p className="text-base text-gray-600">Escolha o caminho que combina com você. Na dúvida, escolha o mais próximo — a secretaria ajuda depois.</p>
            {CAMINHOS_INGRESSO.map(c => (
              <OpcaoCard
                key={c}
                selecionado={dados.forma === c}
                onClick={() => { set('forma', c); setAvisoSemIgreja(false) }}
                titulo={TEXTOS_PADRAO_INGRESSO[c].titulo}
                texto={textoIngresso(config, c)}
                cor={primaryColor}
              />
            ))}
            <Erro msg={erros.forma} />

            {dados.forma === 'aclamacao' && (
              <Campo id="igreja_origem" label="Igreja onde você congregava antes (se houver)" erro={erros.igreja_origem}>
                <Entrada id="igreja_origem" value={dados.igreja_origem} onChange={v => set('igreja_origem', v)} erro={erros.igreja_origem} />
                {dados.igreja_origem.trim() && (
                  <div className="mt-3">
                    <label htmlFor="igreja_origem_cidade_acl" className="block text-base font-semibold text-gray-800 mb-1">Cidade dessa igreja</label>
                    <Entrada id="igreja_origem_cidade_acl" value={dados.igreja_origem_cidade} onChange={v => set('igreja_origem_cidade', v)} placeholder="Ex.: Contagem - MG" />
                  </div>
                )}
                {avisoSemIgreja && !dados.igreja_origem.trim() && (
                  <div role="alert" className="mt-3 flex items-start gap-3 p-4 bg-amber-50 border border-amber-300 rounded-xl text-base text-amber-900">
                    <Info size={20} className="shrink-0 mt-0.5" />
                    <p>
                      Você não congregava em nenhuma igreja antes de vir para cá?<br />
                      Se congregava, escreva o nome acima. Se não, é só tocar em <strong>Continuar</strong> de novo.
                    </p>
                  </div>
                )}
              </Campo>
            )}

            {dados.forma === 'transferencia' && (
              <div className="space-y-4 pt-2">
                <Campo id="igreja_origem" label="Nome da igreja de onde você vem" erro={erros.igreja_origem}>
                  <Entrada id="igreja_origem" value={dados.igreja_origem} onChange={v => set('igreja_origem', v)} erro={erros.igreja_origem} />
                </Campo>
                <Campo id="igreja_origem_cidade" label="Cidade dessa igreja" erro={erros.igreja_origem_cidade}>
                  <Entrada id="igreja_origem_cidade" value={dados.igreja_origem_cidade} onChange={v => set('igreja_origem_cidade', v)} erro={erros.igreja_origem_cidade} />
                </Campo>
                <div>
                  <p className="text-base font-semibold text-gray-800 mb-1">Carta de transferência</p>
                  <p className="text-sm text-gray-500 mb-3">Tire uma foto da carta ou anexe o PDF.</p>
                  {!dados.entrega_presencial && (
                    <DocumentPicker
                      arquivo={carta}
                      onChange={f => { setCarta(f); setErros(e => ({ ...e, carta: '' })); if (f) setArquivosPerdidos(a => ({ ...a, carta: false })) }}
                      maxPdfBytes={CARTA_MAX_BYTES}
                      primaryColor={primaryColor}
                      grande
                    />
                  )}
                  <CheckGrande
                    marcado={dados.entrega_presencial}
                    onChange={v => { set('entrega_presencial', v); setErros(e => ({ ...e, carta: '' })) }}
                    className="mt-3"
                  >
                    Vou entregar a carta pessoalmente na secretaria
                  </CheckGrande>
                  <Erro msg={erros.carta} />
                </div>
              </div>
            )}

            {perguntaCurso && (
              <div className="pt-2">
                <p className="text-base font-semibold text-gray-800 mb-1">Você já participou do {config.curso_nome}?</p>
                {config.curso_descricao && <p className="text-sm text-gray-500 mb-3">{config.curso_descricao}</p>}
                <Escolha
                  opcoes={[{ value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Ainda não' }]}
                  valor={dados.curso}
                  onChange={v => set('curso', v as Dados['curso'])}
                  cor={primaryColor}
                  erro={erros.curso}
                />
                <Erro msg={erros.curso} />
                {dados.curso === 'nao' && (
                  <p className="mt-3 p-3 bg-gray-50 rounded-xl text-sm text-gray-700">
                    Sem problema! A secretaria vai avisar você sobre a próxima turma.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Dados pessoais ── */}
        {etapa === 'dados' && (
          <div className="mt-4 space-y-5">
            <div id="sexo" className="scroll-mt-4">
              <p className="text-base font-semibold text-gray-800 mb-2">Sexo</p>
              <Escolha
                opcoes={Object.entries(SEXO_LABELS).map(([value, label]) => ({ value, label }))}
                valor={dados.sexo}
                onChange={v => set('sexo', v as MembroSexo)}
                cor={primaryColor}
                erro={erros.sexo}
              />
              <Erro msg={erros.sexo} />
            </div>

            {/* Foto obrigatória, com exemplo (conforme o sexo) e orientações */}
            <div id="foto" className={`p-4 rounded-2xl border-2 scroll-mt-4 ${erros.foto ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}>
              <p className="text-base font-semibold text-gray-800 text-center mb-1">Sua foto</p>
              <p className="text-sm text-gray-500 text-center mb-4">Ela ajuda a secretaria a reconhecer você.</p>
              {!foto && <ExemploFoto sexo={dados.sexo} />}
              <PhotoPicker previewUrl={fotoUrl} onChange={onFoto} primaryColor={primaryColor} grande />
              <Erro msg={erros.foto} />
            </div>

            <Campo id="nome" label="Nome completo" erro={erros.nome}>
              <Entrada id="nome" value={dados.nome} onChange={v => set('nome', v)} erro={erros.nome} autoComplete="name" />
            </Campo>

            <Campo id="cpf" label="CPF" ajuda="Usamos só para não confundir você com outra pessoa." erro={erros.cpf}>
              <Entrada
                id="cpf" value={dados.cpf} onChange={v => set('cpf', maskCpf(v))} erro={erros.cpf}
                inputMode="numeric" placeholder="000.000.000-00" maxLength={14}
              />
            </Campo>

            <Campo id="nascimento" label="Data de nascimento" ajuda="Dia, mês e ano. Exemplo: 25/03/1965" erro={erros.nascimento}>
              <Entrada
                id="nascimento" value={dados.nascimento} onChange={v => set('nascimento', maskData(v))} erro={erros.nascimento}
                inputMode="numeric" placeholder="dd/mm/aaaa" maxLength={10} autoComplete="bday"
              />
            </Campo>

            <div>
              <p className="text-base font-semibold text-gray-800 mb-2">Estado civil <span className="font-normal text-gray-500">(opcional)</span></p>
              <Escolha
                opcoes={Object.entries(ESTADO_CIVIL_LABELS).map(([value, label]) => ({ value, label }))}
                valor={dados.estado_civil}
                onChange={v => set('estado_civil', (dados.estado_civil === v ? '' : v) as Dados['estado_civil'])}
                cor={primaryColor}
                colunas={2}
              />
            </div>

            {menor && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-4">
                <p className="text-base text-amber-900">
                  Como você tem menos de 18 anos, precisamos dos dados do seu pai, mãe ou responsável.
                </p>
                <Campo id="responsavel_nome" label="Nome do responsável" erro={erros.responsavel_nome}>
                  <Entrada id="responsavel_nome" value={dados.responsavel_nome} onChange={v => set('responsavel_nome', v)} erro={erros.responsavel_nome} />
                </Campo>
                <Campo id="responsavel_celular" label="Celular do responsável" erro={erros.responsavel_celular}>
                  <Entrada
                    id="responsavel_celular" value={dados.responsavel_celular} onChange={v => set('responsavel_celular', maskPhone(v))}
                    erro={erros.responsavel_celular} inputMode="tel" type="tel" placeholder="(00) 00000-0000"
                  />
                </Campo>
              </div>
            )}
          </div>
        )}

        {/* ── Contato ── */}
        {etapa === 'contato' && (
          <div className="mt-4 space-y-5">
            <Campo id="celular" label="Celular" erro={erros.celular}>
              <Entrada
                id="celular" value={dados.celular} onChange={v => set('celular', maskPhone(v))} erro={erros.celular}
                inputMode="tel" type="tel" placeholder="(00) 00000-0000" autoComplete="tel-national"
              />
            </Campo>
            <CheckGrande marcado={dados.whatsapp} onChange={v => set('whatsapp', v)}>
              Este número tem WhatsApp
            </CheckGrande>

            <Campo id="email" label={<>E-mail <span className="font-normal text-gray-500">(opcional)</span></>} erro={erros.email}>
              <Entrada
                id="email" value={dados.email} onChange={v => set('email', v)} erro={erros.email}
                type="email" inputMode="email" autoComplete="email" placeholder="seuemail@exemplo.com"
              />
            </Campo>

            <div className="pt-2">
              <p className="text-base font-semibold text-gray-800">Endereço <span className="font-normal text-gray-500">(opcional)</span></p>
              <p className="text-sm text-gray-500 mb-3">Digite o CEP e preenchemos o resto para você.</p>
              <Campo id="cep" label="CEP">
                <div className="relative">
                  <Entrada
                    id="cep" value={dados.cep} onChange={onCep} inputMode="numeric" placeholder="00000-000"
                    maxLength={9} autoComplete="postal-code"
                  />
                  {buscandoCep && <Loader2 size={20} className="animate-spin absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />}
                </div>
              </Campo>
              {cepNaoEncontrado && <p className="mt-1 text-sm text-amber-700">Não encontramos este CEP. Preencha o endereço abaixo.</p>}
              {!mostrarEndereco && (
                <button type="button" onClick={() => setSemCep(true)} className="mt-2 text-sm underline text-gray-600">
                  Não sei meu CEP
                </button>
              )}

              {mostrarEndereco && (
                <div className="mt-4 space-y-4">
                  <Campo id="logradouro" label="Rua">
                    <Entrada id="logradouro" value={dados.logradouro} onChange={v => set('logradouro', v)} autoComplete="address-line1" />
                  </Campo>
                  <div className="grid grid-cols-2 gap-3">
                    <Campo id="numero" label="Número">
                      <Entrada id="numero" value={dados.numero} onChange={v => set('numero', v)} inputMode="numeric" />
                    </Campo>
                    <Campo id="complemento" label="Complemento">
                      <Entrada id="complemento" value={dados.complemento} onChange={v => set('complemento', v)} placeholder="Apto, bloco…" />
                    </Campo>
                  </div>
                  <Campo id="bairro" label="Bairro">
                    <Entrada id="bairro" value={dados.bairro} onChange={v => set('bairro', v)} />
                  </Campo>
                  <div className="grid grid-cols-[1fr_5rem] gap-3">
                    <Campo id="cidade" label="Cidade">
                      <Entrada id="cidade" value={dados.cidade} onChange={v => set('cidade', v)} autoComplete="address-level2" />
                    </Campo>
                    <Campo id="uf" label="UF">
                      <Entrada id="uf" value={dados.uf} onChange={v => set('uf', v.toUpperCase().slice(0, 2))} maxLength={2} autoComplete="address-level1" />
                    </Campo>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Histórico (já é membro) ── */}
        {etapa === 'historico' && (
          <div className="mt-4 space-y-5">
            <p className="text-base text-gray-600">Tudo aqui é opcional. Se não lembrar, pode continuar sem preencher.</p>
            <Campo id="membro_desde_ano" label="Desde que ano você é membro desta igreja?" erro={erros.membro_desde_ano}>
              <Entrada
                id="membro_desde_ano" value={dados.membro_desde_ano} onChange={v => set('membro_desde_ano', soDigitos(v).slice(0, 4))}
                erro={erros.membro_desde_ano} inputMode="numeric" placeholder="Ex.: 2010" maxLength={4}
              />
            </Campo>
            <Campo id="batismo" label="Quando você foi batizado?" ajuda="Pode ser só o ano (ex.: 2004) ou a data completa (ex.: 15/08/2004)." erro={erros.batismo}>
              <Entrada
                id="batismo" value={dados.batismo} onChange={v => set('batismo', mascaraAnoOuData(v))}
                erro={erros.batismo} inputMode="numeric" placeholder="Ano ou dd/mm/aaaa" maxLength={10}
              />
            </Campo>
            <div>
              <p className="text-base font-semibold text-gray-800 mb-2">Como você entrou na igreja?</p>
              <Escolha
                opcoes={(['batismo', 'transferencia', 'aclamacao', 'nao_sei'] as FormaIngresso[]).map(v => ({ value: v, label: FORMA_INGRESSO_LABELS[v] }))}
                valor={dados.ja_forma}
                onChange={v => set('ja_forma', (dados.ja_forma === v ? '' : v) as Dados['ja_forma'])}
                cor={primaryColor}
                colunas={2}
              />
            </div>
            <Campo id="igreja_origem_hist" label="Veio de outra igreja? Qual?" ajuda="Deixe em branco se esta foi sua primeira igreja.">
              <Entrada id="igreja_origem_hist" value={dados.igreja_origem} onChange={v => set('igreja_origem', v)} />
            </Campo>
            {dados.igreja_origem.trim() && (
              <Campo id="igreja_origem_cidade_hist" label="Cidade dessa igreja">
                <Entrada id="igreja_origem_cidade_hist" value={dados.igreja_origem_cidade} onChange={v => set('igreja_origem_cidade', v)} placeholder="Ex.: Contagem - MG" />
              </Campo>
            )}
          </div>
        )}

        {/* ── Revisão + consentimento ── */}
        {etapa === 'revisao' && (
          <div className="mt-4 space-y-4">
            <p className="text-base text-gray-600">Confira se está tudo certo. Para corrigir, toque em “Alterar”.</p>

            {dados.tipo === 'quer_ser_membro' && (
              <Resumo titulo={TITULOS.ingresso} onAlterar={() => irPara('ingresso')}>
                <Linha rotulo="Caminho" valor={dados.forma ? FORMA_INGRESSO_LABELS[dados.forma] : ''} />
                {dados.igreja_origem && <Linha rotulo="Igreja anterior" valor={[dados.igreja_origem, dados.igreja_origem_cidade].filter(Boolean).join(' — ')} />}
                {dados.forma === 'transferencia' && (
                  <Linha rotulo="Carta" valor={dados.entrega_presencial ? 'Vou entregar pessoalmente' : carta ? 'Anexada' : '—'} />
                )}
                {perguntaCurso && <Linha rotulo={config.curso_nome ?? 'Curso'} valor={dados.curso === 'sim' ? 'Já participei' : 'Ainda não participei'} />}
              </Resumo>
            )}

            <Resumo titulo={TITULOS.dados} onAlterar={() => irPara('dados')}>
              {fotoUrl && <img src={fotoUrl} alt="" className="w-16 h-16 rounded-full object-cover mb-2" />}
              <Linha rotulo="Nome" valor={dados.nome} />
              <Linha rotulo="CPF" valor={dados.cpf} />
              <Linha rotulo="Nascimento" valor={dados.nascimento} />
              <Linha rotulo="Sexo" valor={dados.sexo ? SEXO_LABELS[dados.sexo] : ''} />
              {dados.estado_civil && <Linha rotulo="Estado civil" valor={ESTADO_CIVIL_LABELS[dados.estado_civil]} />}
              {menor && <Linha rotulo="Responsável" valor={`${dados.responsavel_nome} · ${dados.responsavel_celular}`} />}
            </Resumo>

            <Resumo titulo={TITULOS.contato} onAlterar={() => irPara('contato')}>
              <Linha rotulo="Celular" valor={`${dados.celular}${dados.whatsapp ? ' (WhatsApp)' : ''}`} />
              {dados.email && <Linha rotulo="E-mail" valor={dados.email} />}
              {(dados.logradouro || dados.cidade) && (
                <Linha
                  rotulo="Endereço"
                  valor={[
                    [dados.logradouro, dados.numero].filter(Boolean).join(', '),
                    dados.complemento, dados.bairro, [dados.cidade, dados.uf].filter(Boolean).join('/'), dados.cep,
                  ].filter(Boolean).join(' · ')}
                />
              )}
            </Resumo>

            {dados.tipo === 'ja_membro' && (dados.membro_desde_ano || dados.batismo || dados.ja_forma || dados.igreja_origem) && (
              <Resumo titulo={TITULOS.historico} onAlterar={() => irPara('historico')}>
                {dados.membro_desde_ano && <Linha rotulo="Membro desde" valor={dados.membro_desde_ano} />}
                {dados.batismo && <Linha rotulo="Batismo" valor={dados.batismo} />}
                {dados.ja_forma && <Linha rotulo="Entrou por" valor={FORMA_INGRESSO_LABELS[dados.ja_forma]} />}
                {dados.igreja_origem && <Linha rotulo="Igreja anterior" valor={[dados.igreja_origem, dados.igreja_origem_cidade].filter(Boolean).join(' — ')} />}
              </Resumo>
            )}

            {/* Consentimento LGPD — específico e destacado (dado sensível) */}
            <div className={`p-4 rounded-xl border-2 ${erros.consentimento ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-3 text-gray-900">
                <ShieldCheck size={20} className="text-green-600" />
                <p className="text-base font-semibold">Proteção dos seus dados</p>
              </div>
              <CheckGrande
                marcado={dados.consentimento}
                onChange={v => set('consentimento', v)}
                invalido={!!erros.consentimento}
              >
                {menor
                  ? <>Sou o responsável legal por {dados.nome.trim().split(' ')[0] || 'esta pessoa'} e autorizo a {igreja} a guardar e usar estes dados para o cadastro de membros, conforme a LGPD.</>
                  : resumoConsentimentoMembro({ igreja })}
              </CheckGrande>
              <button type="button" onClick={() => setVerTermos(v => !v)} className="mt-2 ml-10 text-sm underline text-gray-700">
                {verTermos ? 'Esconder o texto completo' : 'Ler o texto completo'}
              </button>
              {verTermos && (
                <div className="mt-3 ml-10 space-y-3 text-sm text-gray-700 max-h-72 overflow-y-auto pr-1">
                  {termosConsentimentoMembro({ igreja, contato: config.contato_privacidade }).map(t => (
                    <div key={t.id}>
                      <p className="font-semibold text-gray-900">{t.titulo}</p>
                      <p>{t.texto}</p>
                    </div>
                  ))}
                </div>
              )}
              <Erro msg={erros.consentimento} />

              <div className="mt-4 pt-4 border-t border-gray-200">
                <CheckGrande marcado={dados.comunicacoes} onChange={v => set('comunicacoes', v)}>
                  {textoConsentimentoComunicacoes({ igreja })} <span className="text-gray-500">(opcional)</span>
                </CheckGrande>
              </div>
            </div>

            {erroEnvio && (
              <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-xl text-base text-red-800">{erroEnvio}</div>
            )}
          </div>
        )}

        {/* ── Navegação ── */}
        <div className="mt-8 flex flex-col-reverse sm:flex-row gap-3">
          {indice > 0 && (
            <button
              type="button"
              onClick={voltar}
              disabled={enviando}
              className="flex items-center justify-center gap-1 py-4 px-6 text-lg font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-2xl hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronLeft size={22} /> Voltar
            </button>
          )}
          {etapa === 'revisao' ? (
            <button
              type="button"
              onClick={enviar}
              disabled={enviando}
              className="flex-1 flex items-center justify-center gap-2 py-4 text-lg font-semibold text-white rounded-2xl disabled:opacity-60"
              style={{ backgroundColor: primaryColor }}
            >
              {enviando && <Loader2 size={22} className="animate-spin" />}
              {enviando ? 'Enviando…' : 'Enviar cadastro'}
            </button>
          ) : (
            <button
              type="button"
              onClick={avancar}
              className="flex-1 py-4 text-lg font-semibold text-white rounded-2xl"
              style={{ backgroundColor: primaryColor }}
            >
              Continuar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Foto de exemplo (feminina/masculina conforme o sexo escolhido; as duas se ainda não escolheu) + orientações
const DICAS_FOTO = [
  'Rosto de frente, olhando para a câmera',
  'Lugar bem iluminado, de preferência com luz natural',
  'Fundo liso, sem outras pessoas',
  'Sem óculos escuros, boné ou chapéu',
  'Dos ombros para cima, sem filtros',
]

function ExemploFoto({ sexo }: { sexo: '' | MembroSexo }) {
  const exemplos = [
    { sexo: 'feminino', src: '/exemplos/foto-exemplo-feminina.webp' },
    { sexo: 'masculino', src: '/exemplos/foto-exemplo-masculina.webp' },
  ].filter(e => !sexo || e.sexo === sexo)
  return (
    <div className="mb-5 flex flex-col sm:flex-row items-center gap-4 p-3 bg-gray-50 rounded-xl">
      <div className="flex gap-2 shrink-0">
        {exemplos.map(e => (
          <div key={e.sexo} className="relative">
            <img src={e.src} alt="Exemplo de foto" width={96} height={96} className="w-24 h-24 rounded-xl object-cover" />
            <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-semibold">Exemplo</span>
          </div>
        ))}
      </div>
      <ul className="space-y-1 text-sm text-gray-700">
        {DICAS_FOTO.map(d => (
          <li key={d} className="flex gap-2"><Check size={16} className="shrink-0 mt-0.5 text-green-600" />{d}</li>
        ))}
      </ul>
    </div>
  )
}

// Até 4 dígitos fica como ano (2004); a partir do 5º vira data (15/08/2004)
function mascaraAnoOuData(v: string): string {
  const d = soDigitos(v).slice(0, 8)
  return d.length <= 4 ? d : maskData(d)
}

// ── Peças de UI (grandes, alto contraste, rótulo sempre visível) ──

function Erro({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="mt-2 text-base text-red-600" role="alert">{msg}</p>
}

function Campo({ id, label, ajuda, erro, children }: {
  id: string
  label: React.ReactNode
  ajuda?: string
  erro?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-base font-semibold text-gray-800 mb-1">{label}</label>
      {ajuda && <p id={`${id}-ajuda`} className="text-sm text-gray-500 mb-2">{ajuda}</p>}
      {children}
      <Erro msg={erro} />
    </div>
  )
}

function Entrada({ id, value, onChange, erro, type = 'text', ...rest }: {
  id: string
  value: string
  onChange: (v: string) => void
  erro?: string
  type?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  placeholder?: string
  maxLength?: number
  autoComplete?: string
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      aria-invalid={erro ? 'true' : undefined}
      className={`w-full px-4 py-3.5 text-lg text-gray-900 bg-white border-2 rounded-xl outline-none transition placeholder:text-gray-400 focus:border-[var(--cor)] ${erro ? 'border-red-400' : 'border-gray-300'}`}
      {...rest}
    />
  )
}

function OpcaoCard({ selecionado, onClick, icone, titulo, texto, cor }: {
  selecionado: boolean
  onClick: () => void
  icone?: React.ReactNode
  titulo: string
  texto: string
  cor: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selecionado}
      className={`w-full text-left flex gap-4 p-4 sm:p-5 rounded-2xl border-2 transition ${selecionado ? 'shadow-sm' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
      style={selecionado ? { borderColor: cor, backgroundColor: `${cor}0d` } : {}}
    >
      {icone && <span className="shrink-0 mt-0.5" style={{ color: selecionado ? cor : '#6b7280' }}>{icone}</span>}
      <span className="flex-1">
        <span className="block text-lg font-semibold text-gray-900">{titulo}</span>
        <span className="block text-base text-gray-600 mt-0.5">{texto}</span>
      </span>
      <span
        className="shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center mt-0.5"
        style={{ borderColor: selecionado ? cor : '#d1d5db', backgroundColor: selecionado ? cor : 'transparent' }}
      >
        {selecionado && <Check size={16} className="text-white" />}
      </span>
    </button>
  )
}

function Escolha({ opcoes, valor, onChange, cor, erro, colunas }: {
  opcoes: Array<{ value: string; label: string }>
  valor: string
  onChange: (v: string) => void
  cor: string
  erro?: string
  colunas?: number
}) {
  return (
    <div className={colunas === 2 ? 'grid grid-cols-2 gap-2' : 'flex gap-2'} role="group">
      {opcoes.map(o => {
        const sel = valor === o.value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={sel}
            className={`flex-1 px-3 py-3.5 text-base font-semibold rounded-xl border-2 transition ${sel ? 'text-white' : `bg-white text-gray-700 hover:bg-gray-50 ${erro ? 'border-red-400' : 'border-gray-300'}`}`}
            style={sel ? { backgroundColor: cor, borderColor: cor } : {}}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function CheckGrande({ marcado, onChange, children, invalido, className = '' }: {
  marcado: boolean
  onChange: (v: boolean) => void
  children: React.ReactNode
  invalido?: boolean
  className?: string
}) {
  return (
    <label className={`flex items-start gap-3 cursor-pointer ${className}`}>
      <input
        type="checkbox"
        checked={marcado}
        onChange={e => onChange(e.target.checked)}
        aria-invalid={invalido ? 'true' : undefined}
        className="mt-0.5 w-7 h-7 shrink-0 rounded accent-[var(--cor)]"
      />
      <span className="text-base text-gray-800">{children}</span>
    </label>
  )
}

function Resumo({ titulo, onAlterar, children }: { titulo: string; onAlterar: () => void; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <p className="text-base font-semibold text-gray-900">{titulo}</p>
        <button type="button" onClick={onAlterar} className="text-base font-medium underline text-gray-700 px-1">Alterar</button>
      </div>
      <dl className="space-y-1">{children}</dl>
    </div>
  )
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex flex-wrap gap-x-2 text-base">
      <dt className="text-gray-500">{rotulo}:</dt>
      <dd className="text-gray-900 break-words">{valor || '—'}</dd>
    </div>
  )
}
