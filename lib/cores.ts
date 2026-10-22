import { COLOR_PALETTE, type CorPrimaria, type SiteConfig } from '@/types'

// Cores do site de uma org: a cor personalizada (hex da marca) tem prioridade sobre a paleta.
//   marca     → cor exata da marca (acentos; fundo escuro)
//   primary   → versão com contraste ≥ 4.5:1 com texto branco (botões, cabeçalhos com texto branco)
//   secondary → tom claro de apoio

type Rgb = [number, number, number]

const hexParaRgb = (hex: string): Rgb => {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const rgbParaHex = (rgb: Rgb) => '#' + rgb.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')

function luminancia(hex: string): number {
  const [r, g, b] = hexParaRgb(hex).map(v => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contraste(a: string, b: string): number {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

export const ehHex = (v: string | null | undefined): v is string => !!v && /^#[0-9a-fA-F]{6}$/.test(v)

// Mistura com preto/branco (t de 0 a 1)
export const escurecer = (hex: string, t: number) => rgbParaHex(hexParaRgb(hex).map(v => v * (1 - t)) as Rgb)
export const clarear = (hex: string, t: number) => rgbParaHex(hexParaRgb(hex).map(v => v + (255 - v) * t) as Rgb)

// Escurece até o texto branco ficar legível (WCAG AA)
export function paraTextoBranco(hex: string): string {
  let cor = hex
  for (let i = 0; i < 20 && contraste(cor, '#ffffff') < 4.5; i++) cor = escurecer(hex, (i + 1) * 0.04)
  return cor
}

// Texto mais legível sobre uma cor de fundo
export const corDeTexto = (fundo: string) => (contraste(fundo, '#ffffff') >= contraste(fundo, '#111111') ? '#ffffff' : '#111111')

export function coresDoSite(config: Pick<SiteConfig, 'cor_primaria' | 'cor_personalizada'> | null | undefined) {
  if (ehHex(config?.cor_personalizada)) {
    const marca = config.cor_personalizada
    return { marca, primary: paraTextoBranco(marca), secondary: clarear(marca, 0.6) }
  }
  const p = COLOR_PALETTE[config?.cor_primaria as CorPrimaria] || COLOR_PALETTE['azul-oceano']
  return { marca: p.primary, primary: p.primary, secondary: p.secondary }
}
