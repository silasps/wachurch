// Validação e normalização dos dados de um membro — usada pelas rotas de API
// (formulário público é estrito; cadastro pela secretaria é mais flexível).

import { ANO_MINIMO, CAMINHOS_INGRESSO } from '@/lib/membros'
import { calcularIdade, isValidCpf, isValidEmail, isValidPhone, maskPhone, soDigitos } from '@/lib/mascaras'
import type { Endereco, Membro } from '@/types'

export type DadosMembro = Pick<Membro,
  | 'nome' | 'cpf' | 'data_nascimento' | 'sexo' | 'estado_civil'
  | 'celular' | 'celular_whatsapp' | 'email' | 'endereco'
  | 'tipo_cadastro' | 'forma_ingresso' | 'igreja_origem' | 'igreja_origem_cidade'
  | 'carta_entrega_presencial' | 'fez_curso_integracao'
  | 'ano_batismo' | 'data_batismo' | 'membro_desde_ano'
  | 'responsavel_nome' | 'responsavel_celular' | 'aceita_comunicacoes'
>

type Entrada = Record<string, unknown>

const SEXOS = ['feminino', 'masculino']
const ESTADOS_CIVIS = ['solteiro', 'casado', 'uniao_estavel', 'divorciado', 'viuvo']
const FORMAS = [...CAMINHOS_INGRESSO, 'nao_sei']
const CAMPOS_ENDERECO: Array<keyof Endereco> = ['cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf']

const texto = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const bool = (v: unknown) => v === true || v === 'true' || v === 'sim'

function ano(v: unknown): number | null {
  const n = Number(texto(v, 4))
  if (!n) return null
  return Number.isInteger(n) && n >= ANO_MINIMO && n <= new Date().getFullYear() ? n : NaN
}

function endereco(v: unknown): Endereco {
  let obj: unknown = v
  if (typeof v === 'string') {
    try { obj = JSON.parse(v) } catch { obj = {} }
  }
  const out: Endereco = {}
  if (obj && typeof obj === 'object') {
    for (const campo of CAMPOS_ENDERECO) {
      const valor = texto((obj as Record<string, unknown>)[campo], 120)
      if (valor) out[campo] = campo === 'uf' ? valor.toUpperCase().slice(0, 2) : valor
    }
  }
  return out
}

export function validarDadosMembro(
  entrada: Entrada,
  { estrito }: { estrito: boolean },
): { dados: DadosMembro; erros: Record<string, string>; idade: number | null } {
  const erros: Record<string, string> = {}

  const nome = texto(entrada.nome, 150).replace(/\s+/g, ' ')
  if (nome.length < 3) erros.nome = 'Informe o nome completo.'

  const cpf = soDigitos(texto(entrada.cpf, 20))
  if (cpf && !isValidCpf(cpf)) erros.cpf = 'CPF inválido. Confira os números.'
  else if (!cpf && estrito) erros.cpf = 'Informe o CPF.'

  const nascimento = texto(entrada.data_nascimento, 10)
  let idade: number | null = null
  if (nascimento) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nascimento)) {
      erros.data_nascimento = 'Data de nascimento inválida.'
    } else {
      idade = calcularIdade(nascimento)
      if (idade < 0 || idade > 120) erros.data_nascimento = 'Data de nascimento inválida.'
    }
  } else if (estrito) {
    erros.data_nascimento = 'Informe a data de nascimento.'
  }

  const sexo = texto(entrada.sexo, 20)
  if (sexo && !SEXOS.includes(sexo)) erros.sexo = 'Opção inválida.'
  else if (!sexo && estrito) erros.sexo = 'Escolha uma opção.'

  const estadoCivil = texto(entrada.estado_civil, 20)
  if (estadoCivil && !ESTADOS_CIVIS.includes(estadoCivil)) erros.estado_civil = 'Opção inválida.'

  const celular = soDigitos(texto(entrada.celular, 20))
  if (celular && !isValidPhone(celular)) erros.celular = 'Celular inválido. Use DDD + número.'
  else if (!celular && estrito) erros.celular = 'Informe um celular para contato.'

  const email = texto(entrada.email, 150).toLowerCase()
  if (email && !isValidEmail(email)) erros.email = 'E-mail inválido.'

  const tipoCadastro = entrada.tipo_cadastro === 'quer_ser_membro' ? 'quer_ser_membro' : 'ja_membro'

  const forma = texto(entrada.forma_ingresso, 20)
  if (forma && !FORMAS.includes(forma)) erros.forma_ingresso = 'Opção inválida.'
  if (tipoCadastro === 'quer_ser_membro' && !CAMINHOS_INGRESSO.includes(forma as never)) {
    erros.forma_ingresso = 'Escolha como você quer se tornar membro.'
  }

  const igrejaOrigem = texto(entrada.igreja_origem, 150)
  const igrejaOrigemCidade = texto(entrada.igreja_origem_cidade, 100)
  if (estrito && tipoCadastro === 'quer_ser_membro' && forma === 'transferencia') {
    if (!igrejaOrigem) erros.igreja_origem = 'Informe o nome da igreja de origem.'
    if (!igrejaOrigemCidade) erros.igreja_origem_cidade = 'Informe a cidade da igreja de origem.'
  }

  const anoBatismo = ano(entrada.ano_batismo)
  if (Number.isNaN(anoBatismo)) erros.ano_batismo = 'Ano inválido.'
  const dataBatismo = texto(entrada.data_batismo, 10)
  if (dataBatismo && (!/^\d{4}-\d{2}-\d{2}$/.test(dataBatismo) || dataBatismo > new Date().toISOString().slice(0, 10))) {
    erros.data_batismo = 'Data do batismo inválida.'
  }
  const membroDesde = ano(entrada.membro_desde_ano)
  if (Number.isNaN(membroDesde)) erros.membro_desde_ano = 'Ano inválido.'

  const responsavelNome = texto(entrada.responsavel_nome, 150)
  const responsavelCelular = soDigitos(texto(entrada.responsavel_celular, 20))
  if (estrito && idade !== null && idade < 18) {
    if (!responsavelNome) erros.responsavel_nome = 'Informe o nome do responsável.'
    if (!isValidPhone(responsavelCelular)) erros.responsavel_celular = 'Informe o celular do responsável.'
  }

  const curso = entrada.fez_curso_integracao
  const fezCurso = curso === undefined || curso === null || curso === '' ? null : bool(curso)

  const dados: DadosMembro = {
    nome,
    cpf: cpf || null,
    data_nascimento: nascimento || null,
    sexo: (sexo || null) as DadosMembro['sexo'],
    estado_civil: (estadoCivil || null) as DadosMembro['estado_civil'],
    celular: celular ? maskPhone(celular) : null,
    celular_whatsapp: entrada.celular_whatsapp === undefined ? true : bool(entrada.celular_whatsapp),
    email: email || null,
    endereco: endereco(entrada.endereco),
    tipo_cadastro: tipoCadastro,
    forma_ingresso: (forma || null) as DadosMembro['forma_ingresso'],
    igreja_origem: igrejaOrigem || null,
    igreja_origem_cidade: igrejaOrigemCidade || null,
    carta_entrega_presencial: bool(entrada.carta_entrega_presencial),
    fez_curso_integracao: fezCurso,
    ano_batismo: Number.isNaN(anoBatismo) ? null : anoBatismo ?? (dataBatismo && !erros.data_batismo ? Number(dataBatismo.slice(0, 4)) : null),
    data_batismo: dataBatismo && !erros.data_batismo ? dataBatismo : null,
    membro_desde_ano: Number.isNaN(membroDesde) ? null : membroDesde,
    responsavel_nome: responsavelNome || null,
    responsavel_celular: responsavelCelular ? maskPhone(responsavelCelular) : null,
    aceita_comunicacoes: bool(entrada.aceita_comunicacoes),
  }

  return { dados, erros, idade }
}
