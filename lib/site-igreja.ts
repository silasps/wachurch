// Dados e utilidades da página pública da igreja (layouts Perfil e Editorial)
import type { Endereco, HorarioCulto, SiteConfig } from '@/types'

const soDigitos = (v: string) => v.replace(/\D/g, '')

export function enderecoTexto(c: Pick<SiteConfig, 'endereco' | 'contato'>): string {
  const e: Endereco = c.endereco ?? {}
  return [
    [e.logradouro, e.numero].filter(Boolean).join(', '), e.complemento, e.bairro,
    [e.cidade, e.uf].filter(Boolean).join(' - '), e.cep && `CEP ${e.cep}`,
  ].filter(Boolean).join(' · ') || c.contato?.endereco || ''
}

export const cidadeUf = (c: Pick<SiteConfig, 'endereco'>) =>
  [c.endereco?.cidade, c.endereco?.uf].filter(Boolean).join(' - ')

export const mapaUrl = (nome: string, endereco: string) =>
  endereco ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${nome} ${endereco}`)}` : null

// Mapa incorporado sem chave de API
export const mapaEmbedUrl = (endereco: string) =>
  endereco ? `https://www.google.com/maps?q=${encodeURIComponent(endereco)}&output=embed` : null

export function linkWhatsapp(numero?: string) {
  const d = soDigitos(numero ?? '')
  if (d.length < 10) return null
  return `https://wa.me/${d.length <= 11 ? `55${d}` : d}`
}

export function linkRede(valor: string | undefined, base: string) {
  if (!valor?.trim()) return null
  return /^https?:\/\//.test(valor) ? valor : `${base}${valor.replace(/^@/, '')}`
}

// ── Horários de culto ──
const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']
const ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']

function indiceDia(dia: string): number {
  const d = dia.trim().toLowerCase()
  return DIAS.findIndex(x => x === d || x.startsWith(d.slice(0, 3)))
}

// Data de hoje no fuso de Brasília (o servidor da Vercel roda em UTC)
function hojeBrasilia(): { ano: number; mes: number; dia: number; semana: number } {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short' })
      .formatToParts(new Date()).map(x => [x.type, x.value])
  )
  const semana = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday)
  return { ano: Number(p.year), mes: Number(p.month), dia: Number(p.day), semana }
}

export interface CultoInfo extends HorarioCulto {
  abrev: string
  diaDoMes: number | null
  /** "Adicionar à agenda" (Google Agenda, repetição semanal) */
  agendaUrl: string | null
}

export function cultosComProximaData(horarios: HorarioCulto[], igreja: string, endereco: string): CultoInfo[] {
  const hoje = hojeBrasilia()
  return horarios.filter(h => h.dia || h.hora).map(h => {
    const i = indiceDia(h.dia)
    if (i < 0) return { ...h, abrev: h.dia.slice(0, 3), diaDoMes: null, agendaUrl: null }
    const data = new Date(Date.UTC(hoje.ano, hoje.mes - 1, hoje.dia + ((i - hoje.semana + 7) % 7)))
    const [hh, mm] = (h.hora || '00:00').split(':').map(Number)
    const ymd = `${data.getUTCFullYear()}${String(data.getUTCMonth() + 1).padStart(2, '0')}${String(data.getUTCDate()).padStart(2, '0')}`
    const inicio = `${ymd}T${String(hh).padStart(2, '0')}${String(mm || 0).padStart(2, '0')}00`
    const fim = `${ymd}T${String((hh + 2) % 24).padStart(2, '0')}${String(mm || 0).padStart(2, '0')}00`
    const agendaUrl = 'https://calendar.google.com/calendar/render?' + new URLSearchParams({
      action: 'TEMPLATE',
      text: `${h.nome || 'Culto'} · ${igreja}`,
      dates: `${inicio}/${fim}`,
      ctz: 'America/Sao_Paulo',
      recur: `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[i]}`,
      location: endereco,
    }).toString()
    return { ...h, abrev: ABREV[i], diaDoMes: data.getUTCDate(), agendaUrl }
  })
}
