// Máscaras e validações de campos brasileiros (CPF, telefone, CEP, data)
// Funções puras — usadas tanto no navegador quanto nas rotas de API.

export function soDigitos(value: string): string {
  return value.replace(/\D/g, '')
}

export function maskPhone(value: string): string {
  const d = soDigitos(value).slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export function maskCep(value: string): string {
  const d = soDigitos(value).slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// Celular/telefone com DDD: 10 ou 11 dígitos
export function isValidPhone(value: string): boolean {
  const d = soDigitos(value)
  return d.length === 10 || d.length === 11
}

export function maskCpf(value: string): string {
  const d = soDigitos(value).slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

// Valida os dígitos verificadores do CPF
export function isValidCpf(value: string): boolean {
  const d = soDigitos(value)
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false
  const calc = (len: number) => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i)
    const rest = (sum * 10) % 11
    return rest === 10 ? 0 : rest
  }
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10])
}

// CPF parcialmente oculto para listagens: ***.456.789-**
export function cpfOculto(value: string | null | undefined): string {
  const d = soDigitos(value ?? '')
  if (d.length !== 11) return '—'
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`
}

// Data digitada como DD/MM/AAAA (mais fácil que o seletor nativo para quem tem mais idade)
export function maskData(value: string): string {
  const d = soDigitos(value).slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}

// DD/MM/AAAA → AAAA-MM-DD (ou null se inválida)
export function parseDataBR(value: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim())
  if (!m) return null
  const [, dd, mm, aaaa] = m
  const dia = Number(dd), mes = Number(mm), ano = Number(aaaa)
  const date = new Date(Date.UTC(ano, mes - 1, dia))
  if (date.getUTCFullYear() !== ano || date.getUTCMonth() !== mes - 1 || date.getUTCDate() !== dia) return null
  return `${aaaa}-${mm}-${dd}`
}

// AAAA-MM-DD → DD/MM/AAAA
export function formatDataBR(iso: string | null | undefined): string {
  if (!iso) return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ''
}

// Idade em anos completos a partir de AAAA-MM-DD
export function calcularIdade(iso: string, hoje: Date = new Date()): number {
  const [ano, mes, dia] = iso.split('-').map(Number)
  let idade = hoje.getFullYear() - ano
  const m = hoje.getMonth() + 1 - mes
  if (m < 0 || (m === 0 && hoje.getDate() < dia)) idade--
  return idade
}

export function maskCnpj(value: string): string {
  const d = soDigitos(value).slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

// Valida os dígitos verificadores do CNPJ
export function isValidCnpj(value: string): boolean {
  const d = soDigitos(value)
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false
  const calc = (len: number) => {
    const pesos = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const sum = pesos.reduce((acc, p, i) => acc + Number(d[i]) * p, 0)
    const rest = sum % 11
    return rest < 2 ? 0 : 11 - rest
  }
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13])
}

// Requisitos de senha exibidos abaixo do campo e checados no servidor
export const REQUISITOS_SENHA: Array<{ id: string; label: string; ok: (s: string) => boolean }> = [
  { id: 'tamanho',   label: 'Pelo menos 8 caracteres', ok: s => s.length >= 8 },
  { id: 'maiuscula', label: 'Uma letra maiúscula',     ok: s => /[A-Z]/.test(s) },
  { id: 'minuscula', label: 'Uma letra minúscula',     ok: s => /[a-z]/.test(s) },
  { id: 'numero',    label: 'Um número',               ok: s => /\d/.test(s) },
]

export function isSenhaForte(senha: string): boolean {
  return REQUISITOS_SENHA.every(r => r.ok(senha))
}
