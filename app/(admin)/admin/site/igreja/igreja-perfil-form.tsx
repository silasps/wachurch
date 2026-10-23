'use client'

import { useState } from 'react'
import { Loader2, Check, Plus, Trash2 } from 'lucide-react'
import { SiteImageUploader } from '../_components/site-image-uploader'
import { maskCep, soDigitos } from '@/lib/mascaras'
import { buscarCep } from '@/lib/cep'
import type { Endereco, HorarioCulto, Lider, SiteConfig } from '@/types'

const input = 'w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
const label = 'block text-sm font-medium text-gray-700 mb-1'
const card = 'bg-white rounded-xl border border-gray-200 p-5 space-y-4'
const DIAS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

export default function IgrejaPerfilForm({ config }: { config: SiteConfig | null }) {
  const [bio, setBio] = useState(config?.bio ?? '')
  const [nomeCurto, setNomeCurto] = useState(config?.nome_curto ?? '')
  const [boasVindas, setBoasVindas] = useState(config?.boas_vindas ?? '')
  const [slogan, setSlogan] = useState(config?.slogan ?? '')
  const [denominacao, setDenominacao] = useState(config?.denominacao ?? '')
  const [anoFundacao, setAnoFundacao] = useState(config?.ano_fundacao ? String(config.ano_fundacao) : '')
  const [capaUrl, setCapaUrl] = useState(config?.capa_url ?? '')
  const [historia, setHistoria] = useState(config?.historia ?? '')
  const [missao, setMissao] = useState(config?.missao ?? '')
  const [endereco, setEndereco] = useState<Endereco>(config?.endereco ?? {})
  const [horarios, setHorarios] = useState<HorarioCulto[]>(config?.horarios?.length ? config.horarios : [{ dia: 'Domingo', hora: '', nome: '' }])
  const [lideranca, setLideranca] = useState<Lider[]>(config?.lideranca ?? [])
  const [loading, setLoading] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const setEnd = (campo: keyof Endereco, valor: string) => setEndereco(e => ({ ...e, [campo]: valor }))

  async function onCep(valor: string) {
    const cep = maskCep(valor)
    setEnd('cep', cep)
    const r = await buscarCep(cep)
    if (r) setEndereco(e => ({ ...e, ...r, logradouro: r.logradouro || e.logradouro }))
  }

  function editarLista<T>(lista: T[], set: (l: T[]) => void, i: number, campo: keyof T, valor: string) {
    set(lista.map((item, idx) => (idx === i ? { ...item, [campo]: valor } : item)))
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro(null)
    setSalvo(false)
    try {
      const res = await fetch('/api/admin/site/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bio: bio.trim() || null,
          nome_curto: nomeCurto.trim() || null,
          boas_vindas: boasVindas.trim() || null,
          slogan: slogan.trim() || null,
          denominacao: denominacao.trim() || null,
          ano_fundacao: anoFundacao ? Number(anoFundacao) : null,
          capa_url: capaUrl || null,
          historia: historia.trim() || null,
          missao: missao.trim() || null,
          endereco,
          horarios: horarios.filter(h => h.dia || h.hora || h.nome),
          lideranca: lideranca.filter(l => l.nome.trim()),
        }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Erro ao salvar')
      setSalvo(true)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={salvar} className="space-y-6">
      <div className={card}>
        <p className="font-semibold text-gray-900">Apresentação</p>
        <div>
          <p className={label}>Imagem de capa</p>
          <SiteImageUploader currentUrl={capaUrl} slot="capa" aspect={3} modalTitle="Ajustar capa" hint="Foto da igreja ou do culto · formato largo" onSaved={setCapaUrl} />
        </div>
        <div>
          <label htmlFor="bio" className={label}>Frase de apresentação</label>
          <input id="bio" value={bio} onChange={e => setBio(e.target.value)} maxLength={160} placeholder="Ex.: Uma família para pertencer, crescer e servir." className={input} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="nome-curto" className={label}>Nome curto / sigla</label>
            <input id="nome-curto" value={nomeCurto} onChange={e => setNomeCurto(e.target.value)} maxLength={30} placeholder="Ex.: SIBALT" className={input} />
          </div>
          <div>
            <label htmlFor="boas-vindas" className={label}>Linha de boas-vindas</label>
            <input id="boas-vindas" value={boasVindas} onChange={e => setBoasVindas(e.target.value)} maxLength={60} placeholder="Aqui há lugar para você" className={input} />
          </div>
        </div>
        <div>
          <label htmlFor="slogan" className={label}>Slogan (frase principal do topo)</label>
          <input id="slogan" value={slogan} onChange={e => setSlogan(e.target.value)} maxLength={140} placeholder="Se vazio, usa a frase de apresentação" className={input} />
          <p className="mt-1 text-xs text-gray-500">Usados no layout Editorial (Site → Aparência).</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="den" className={label}>Denominação</label>
            <input id="den" value={denominacao} onChange={e => setDenominacao(e.target.value)} placeholder="Ex.: Batista" className={input} />
          </div>
          <div>
            <label htmlFor="ano" className={label}>Ano de fundação</label>
            <input id="ano" value={anoFundacao} onChange={e => setAnoFundacao(soDigitos(e.target.value).slice(0, 4))} inputMode="numeric" placeholder="Ex.: 1985" className={input} />
          </div>
        </div>
      </div>

      <div className={card}>
        <p className="font-semibold text-gray-900">Horários de culto</p>
        {horarios.map((h, i) => (
          <div key={i} className="grid grid-cols-[1fr_6rem_auto] sm:grid-cols-[10rem_6rem_1fr_auto] gap-2 items-center">
            <select value={h.dia} onChange={e => editarLista(horarios, setHorarios, i, 'dia', e.target.value)} className={input} aria-label="Dia">
              <option value="">Dia</option>
              {DIAS.map(d => <option key={d}>{d}</option>)}
            </select>
            <input type="time" value={h.hora} onChange={e => editarLista(horarios, setHorarios, i, 'hora', e.target.value)} className={input} aria-label="Hora" />
            <div className="col-span-2 sm:col-span-1 order-last sm:order-none grid grid-cols-[1fr_7rem] gap-2">
              <input value={h.nome} onChange={e => editarLista(horarios, setHorarios, i, 'nome', e.target.value)} placeholder="Ex.: Culto da família" className={input} aria-label="Nome do culto" />
              <input value={h.publico ?? ''} onChange={e => editarLista(horarios, setHorarios, i, 'publico', e.target.value)} placeholder="Público" maxLength={16} className={input} aria-label="Público (ex.: Jovens)" />
            </div>
            <button type="button" onClick={() => setHorarios(horarios.filter((_, idx) => idx !== i))} className="p-2 text-gray-400 hover:text-red-600" aria-label="Remover horário">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setHorarios([...horarios, { dia: '', hora: '', nome: '' }])} className="flex items-center gap-1.5 text-sm text-blue-600 font-medium">
          <Plus size={15} /> Adicionar horário
        </button>
      </div>

      <div className={card}>
        <p className="font-semibold text-gray-900">Endereço</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label htmlFor="cep" className={label}>CEP</label>
            <input id="cep" value={endereco.cep ?? ''} onChange={e => onCep(e.target.value)} inputMode="numeric" maxLength={9} className={input} />
          </div>
          <div className="col-span-2 sm:col-span-3">
            <label htmlFor="rua" className={label}>Rua</label>
            <input id="rua" value={endereco.logradouro ?? ''} onChange={e => setEnd('logradouro', e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor="num" className={label}>Número</label>
            <input id="num" value={endereco.numero ?? ''} onChange={e => setEnd('numero', e.target.value)} className={input} />
          </div>
          <div className="sm:col-span-3">
            <label htmlFor="bairro" className={label}>Bairro</label>
            <input id="bairro" value={endereco.bairro ?? ''} onChange={e => setEnd('bairro', e.target.value)} className={input} />
          </div>
          <div className="col-span-2 sm:col-span-3">
            <label htmlFor="cidade" className={label}>Cidade</label>
            <input id="cidade" value={endereco.cidade ?? ''} onChange={e => setEnd('cidade', e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor="uf" className={label}>UF</label>
            <input id="uf" value={endereco.uf ?? ''} onChange={e => setEnd('uf', e.target.value.toUpperCase().slice(0, 2))} maxLength={2} className={input} />
          </div>
        </div>
      </div>

      <div className={card}>
        <div>
          <label htmlFor="missao" className={label}>Nossa missão</label>
          <textarea id="missao" value={missao} onChange={e => setMissao(e.target.value)} rows={2} placeholder="Ex.: Conhecer a Cristo e torná-lo conhecido." className={input} />
        </div>
        <label htmlFor="historia" className="font-semibold text-gray-900 block">Nossa história</label>
        <textarea id="historia" value={historia} onChange={e => setHistoria(e.target.value)} rows={8} placeholder="Como a igreja começou, marcos importantes, quem somos hoje…" className={input} />
        <p className="text-xs text-gray-500">
          Dicas de formatação: <code># Título</code> numa linha sozinha · <code>## Capítulo</code> abre um capítulo na página História · <code>**negrito**</code> · um parágrafo inteiro em <code>**negrito**</code> vira citação em destaque · linhas começando com <code>- </code> viram lista. Deixe uma linha em branco entre parágrafos.
        </p>
      </div>

      <div className={card}>
        <p className="font-semibold text-gray-900">Liderança</p>
        {lideranca.map((l, i) => (
          <div key={i} className="grid sm:grid-cols-[8rem_1fr] gap-3 p-3 border border-gray-100 rounded-lg">
            <SiteImageUploader currentUrl={l.foto_url} slot={`lider-${i}`} aspect={1} modalTitle="Foto" hint="Foto de rosto" onSaved={url => editarLista(lideranca, setLideranca, i, 'foto_url', url)} />
            <div className="space-y-2">
              <input value={l.nome} onChange={e => editarLista(lideranca, setLideranca, i, 'nome', e.target.value)} placeholder="Nome" className={input} aria-label="Nome" />
              <input value={l.cargo} onChange={e => editarLista(lideranca, setLideranca, i, 'cargo', e.target.value)} placeholder="Ex.: Pastor titular" className={input} aria-label="Cargo" />
              <textarea value={l.mensagem ?? ''} onChange={e => editarLista(lideranca, setLideranca, i, 'mensagem', e.target.value)} rows={2} maxLength={400} placeholder="Mensagem curta (opcional) — aparece no destaque de liderança" className={input} aria-label="Mensagem" />
              <button type="button" onClick={() => setLideranca(lideranca.filter((_, idx) => idx !== i))} className="text-xs text-red-600">Remover</button>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => setLideranca([...lideranca, { nome: '', cargo: '', foto_url: '' }])} className="flex items-center gap-1.5 text-sm text-blue-600 font-medium">
          <Plus size={15} /> Adicionar líder
        </button>
      </div>

      {erro && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{erro}</div>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={loading} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {loading ? <Loader2 size={15} className="animate-spin" /> : salvo ? <Check size={15} /> : null}
          {salvo ? 'Salvo' : 'Salvar'}
        </button>
        <p className="text-xs text-gray-500">Logo, cores, contatos e redes sociais ficam em Aparência e Conteúdo.</p>
      </div>
    </form>
  )
}
