// Constantes e regras do módulo Igreja (membros) — sem dependências de servidor,
// usadas pelo formulário público, pelo painel admin e pelas rotas de API.

import type {
  CaminhoIngresso, EstadoCivil, FormaIngresso, MembresiaConfig, MembroSexo, MembroSituacao,
} from '@/types'

export const BUCKET_MEMBROS = 'membros-arquivos'

// Limites de upload — a Vercel aceita no máximo 4,5 MB por requisição, então
// foto + carta precisam caber juntas num único envio
export const FOTO_MAX_BYTES = 2 * 1024 * 1024
export const CARTA_MAX_BYTES = Math.floor(3.5 * 1024 * 1024)
export const FOTO_MIME = ['image/jpeg', 'image/png', 'image/webp']
export const CARTA_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

export const SITUACAO_LABELS: Record<MembroSituacao, string> = {
  pendente: 'Para conferir',
  candidato: 'Candidato',
  ativo: 'Ativo',
  inativo: 'Inativo',
  recusado: 'Recusado',
}

export const SITUACAO_COLORS: Record<MembroSituacao, string> = {
  pendente:  'bg-yellow-100 text-yellow-800',
  candidato: 'bg-blue-100 text-blue-700',
  ativo:     'bg-green-100 text-green-700',
  inativo:   'bg-gray-100 text-gray-500',
  recusado:  'bg-red-100 text-red-700',
}

export const FORMA_INGRESSO_LABELS: Record<FormaIngresso, string> = {
  aclamacao: 'Aclamação',
  transferencia: 'Transferência',
  batismo: 'Batismo',
  nao_sei: 'Não sei / não lembro',
}

export const SEXO_LABELS: Record<MembroSexo, string> = {
  feminino: 'Feminino',
  masculino: 'Masculino',
}

export const ESTADO_CIVIL_LABELS: Record<EstadoCivil, string> = {
  solteiro: 'Solteiro(a)',
  casado: 'Casado(a)',
  uniao_estavel: 'União estável',
  divorciado: 'Divorciado(a)',
  viuvo: 'Viúvo(a)',
}

export const MOTIVOS_INATIVACAO = [
  'Transferido para outra igreja',
  'Desligado a pedido',
  'Desligado pela igreja',
  'Falecido',
  'Outro',
]

export const CAMINHOS_INGRESSO: CaminhoIngresso[] = ['aclamacao', 'transferencia', 'batismo']

// Explicações padrão de cada caminho — cada igreja pode reescrever em membresia_config
export const TEXTOS_PADRAO_INGRESSO: Record<CaminhoIngresso, { titulo: string; texto: string }> = {
  aclamacao: {
    titulo: 'Por aclamação',
    texto: 'Em uma assembleia, a igreja reconhece você publicamente e o recebe como membro. ' +
      'Geralmente é o caminho de quem já foi batizado em outra igreja evangélica e não tem carta de transferência.',
  },
  transferencia: {
    titulo: 'Por transferência',
    texto: 'Você é membro de outra igreja e vai trazer uma carta de transferência (ou de recomendação) dela. ' +
      'A carta pode ser enviada por foto ou PDF, ou entregue pessoalmente na secretaria.',
  },
  batismo: {
    titulo: 'Pelo batismo',
    texto: 'Você ainda não foi batizado e quer se batizar para fazer parte da igreja.',
  },
}

// Campos da configuração que podem ir para o navegador (formulário público)
export type MembresiaConfigPublica = Pick<
  MembresiaConfig,
  | 'formulario_aberto' | 'curso_nome' | 'curso_descricao' | 'curso_caminhos'
  | 'texto_aclamacao' | 'texto_transferencia' | 'texto_batismo'
  | 'contato_privacidade' | 'mensagem_sucesso'
>

export const MEMBRESIA_CONFIG_PADRAO: MembresiaConfigPublica = {
  formulario_aberto: true,
  curso_nome: null,
  curso_descricao: null,
  curso_caminhos: ['batismo'],
  texto_aclamacao: null,
  texto_transferencia: null,
  texto_batismo: null,
  contato_privacidade: null,
  mensagem_sucesso: null,
}

export function textoIngresso(config: MembresiaConfigPublica, caminho: CaminhoIngresso): string {
  const custom = config[`texto_${caminho}` as const]?.trim()
  return custom || TEXTOS_PADRAO_INGRESSO[caminho].texto
}

// A pergunta "Você já participou do {curso}?" aparece neste caminho?
export function cursoSeAplica(config: MembresiaConfigPublica, caminho: string | null | undefined): boolean {
  return !!config.curso_nome?.trim() && !!caminho && (config.curso_caminhos as string[]).includes(caminho)
}

export const ANO_MINIMO = 1900

// Canal para o titular exercer seus direitos (LGPD art. 18): o configurado, ou o contato da org
export function contatoPrivacidade(
  config: Pick<MembresiaConfigPublica, 'contato_privacidade'>,
  org: { email_contato: string | null; telefone: string | null },
): string | null {
  return config.contato_privacidade?.trim() || org.email_contato || org.telefone || null
}
