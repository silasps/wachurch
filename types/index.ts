export type UserRole =
  | 'superadmin'
  | 'admin'
  | 'funcionario'
  | 'professor'
  | 'aluno'
  | 'responsavel'

export type AlunoStatus = 'aguardando' | 'ativo' | 'inativo' | 'concluido'
export type TurmaStatus = 'ativa' | 'encerrada' | 'pausada'
export type MatriculaStatus = 'ativa' | 'trancada' | 'concluida'
export type CandidaturaStatus = 'pendente' | 'aprovada' | 'recusada' | 'cancelada'
export type SolicitacaoStatus = 'pendente' | 'aprovada' | 'recusada' | 'cancelada'
export type NecessidadeStatus = 'aberta' | 'encerrada' | 'pausada'
export type SitePostCategoria = 'projeto' | 'noticia' | 'galeria'
export type SiteTemplate =
  | 'minimalista'
  | 'comunitario'
  | 'institucional'
  | 'colorido'
  | 'galeria'

export type CorPrimaria =
  | 'azul-oceano'
  | 'verde-floresta'
  | 'laranja-energia'
  | 'roxo-criativo'
  | 'vermelho-forca'
  | 'rosa-acolhedor'
  | 'amarelo-alegria'
  | 'cinza-nobre'
  | 'indigo-confianca'
  | 'teal-equilibrio'

// Tipo de conta e módulos licenciados (ver lib/modulos.ts)
export type OrgTipo = 'igreja' | 'projeto_social'
export type Modulo = 'igreja' | 'social'

// ---- Database row types ----

export interface Organization {
  id: string
  slug: string
  nome: string
  cnpj: string | null
  plano: string
  tipo: OrgTipo
  modulos: Modulo[]
  ativo: boolean
  created_at: string
  email_contato: string | null
  telefone: string | null
}

export interface Profile {
  id: string
  org_id: string
  nome: string
  email: string
  telefone: string | null
  role: UserRole
  ativo: boolean
  avatar_url: string | null
  created_at: string
}

export interface Aluno {
  id: string
  org_id: string
  profile_id: string | null
  nome: string
  cpf_encrypted: string | null
  data_nascimento: string | null
  telefone: string | null
  endereco: Record<string, string>
  status: AlunoStatus
  data_admissao: string | null
  observacoes: string | null
  created_at: string
}

export interface Responsavel {
  id: string
  org_id: string
  profile_id: string | null
  nome: string
  email: string | null
  telefone: string | null
  parentesco: string | null
  created_at: string
}

export interface Turma {
  id: string
  org_id: string
  nome: string
  descricao: string | null
  professor_id: string | null
  capacidade: number | null
  status: TurmaStatus
  horario: HorarioItem[]
  created_at: string
}

export interface HorarioItem {
  dia: string
  hora_inicio: string
  hora_fim: string
}

export interface Matricula {
  id: string
  org_id: string
  turma_id: string
  aluno_id: string
  status: MatriculaStatus
  data_matricula: string
  created_at: string
}

export interface Encontro {
  id: string
  org_id: string
  turma_id: string
  data: string
  hora_inicio: string | null
  hora_fim: string | null
  conteudo: string | null
  created_at: string
}

export interface Presenca {
  id: string
  org_id: string
  encontro_id: string
  aluno_id: string
  presente: boolean
  justificativa: string | null
  documento_url: string | null
  created_at: string
}

export interface Material {
  id: string
  org_id: string
  turma_id: string
  nome: string
  descricao: string | null
  url: string | null
  tipo: string
  created_at: string
}

export interface Atividade {
  id: string
  org_id: string
  turma_id: string
  professor_id: string | null
  titulo: string
  descricao: string | null
  data_entrega: string | null
  pontuacao_maxima: number | null
  created_at: string
}

export interface Entrega {
  id: string
  org_id: string
  atividade_id: string
  aluno_id: string
  conteudo: string | null
  arquivo_url: string | null
  nota: number | null
  feedback: string | null
  created_at: string
}

export interface Avaliacao {
  id: string
  org_id: string
  aluno_id: string
  turma_id: string | null
  professor_id: string | null
  tipo: string
  descricao: string | null
  pontuacao: number | null
  periodo: string | null
  created_at: string
}

export interface Comunicado {
  id: string
  org_id: string
  turma_id: string | null
  autor_id: string | null
  titulo: string
  conteudo: string
  visivel_para: UserRole[]
  publicado: boolean
  created_at: string
}

export interface FuncaoVoluntariado {
  id: string
  org_id: string
  nome: string
  descricao: string | null
  requisitos: string | null
  created_at: string
}

export interface NecessidadeVoluntariado {
  id: string
  org_id: string
  funcao_id: string | null
  titulo: string
  descricao: string | null
  vagas: number
  data_expiracao: string | null
  status: NecessidadeStatus
  created_at: string
}

export interface CandidaturaVoluntariado {
  id: string
  org_id: string
  necessidade_id: string | null
  nome: string
  email: string
  telefone: string | null
  mensagem: string | null
  status: CandidaturaStatus
  created_at: string
}

export interface ParticipanteVoluntariado {
  id: string
  org_id: string
  candidatura_id: string | null
  profile_id: string | null
  status: string
  created_at: string
}

export interface SiteConfig {
  id: string
  org_id: string
  template_id: SiteTemplate
  cor_primaria: CorPrimaria
  cor_secundaria: string | null
  logo_url: string | null
  hero_titulo: string | null
  hero_subtitulo: string | null
  hero_cta_texto: string | null
  hero_imagem_url: string | null
  sobre_titulo: string | null
  sobre_texto: string | null
  sobre_imagem_url: string | null
  missao: string | null
  valores: string[]
  contato: {
    email?: string
    telefone?: string
    endereco?: string
    whatsapp?: string
  }
  redes_sociais: {
    instagram?: string
    facebook?: string
    youtube?: string
    linkedin?: string
  }
  secoes_ativas: string[]
  publicado: boolean
  updated_at: string
  // Cor exata da marca e tema (0012)
  cor_personalizada: string | null
  tema: 'claro' | 'escuro'
  // Perfil da igreja (0011)
  bio: string | null
  capa_url: string | null
  historia: string | null
  ano_fundacao: number | null
  denominacao: string | null
  endereco: Endereco
  horarios: HorarioCulto[]
  lideranca: Lider[]
}

export interface HorarioCulto {
  dia: string
  hora: string
  nome: string
}

export interface Lider {
  nome: string
  cargo: string
  foto_url: string
}

export interface SitePost {
  id: string
  org_id: string
  titulo: string
  conteudo: string | null
  imagem_url: string | null
  categoria: SitePostCategoria
  publicado: boolean
  ordem: number
  created_at: string
}

export interface SiteGaleria {
  id: string
  org_id: string
  titulo: string | null
  imagem_url: string
  descricao: string | null
  created_at: string
}

export interface SolicitacaoAdmissao {
  id: string
  org_id: string
  tipo: 'aluno' | 'voluntario'
  nome: string
  email: string | null
  telefone: string | null
  dados: Record<string, unknown>
  status: SolicitacaoStatus
  created_at: string
}

export interface CustomDomain {
  id: string
  org_id: string
  domain: string
  verificado: boolean
  created_at: string
}

// ---- Financeiro ----

export type LancamentoTipo = 'receita' | 'despesa'
export type LancamentoStatus = 'pendente' | 'pago' | 'cancelado' | 'atrasado'
export type LancamentoCategoria =
  | 'doacao' | 'mensalidade' | 'patrocinio' | 'subvencao' | 'prestacao_servico' | 'evento_receita'
  | 'honorario_professor' | 'folha_pagamento' | 'infraestrutura' | 'material' | 'evento_despesa' | 'administrativo' | 'outros'
export type ReferenciaFinanceiroTipo = 'professor' | 'aluno' | 'voluntario'

export interface LancamentoFinanceiro {
  id: string
  org_id: string
  tipo: LancamentoTipo
  categoria: LancamentoCategoria
  descricao: string
  valor: number
  data_lancamento: string
  data_vencimento: string | null
  data_pagamento: string | null
  status: LancamentoStatus
  referencia_tipo: ReferenciaFinanceiroTipo | null
  referencia_id: string | null
  observacoes: string | null
  created_by: string
  created_at: string
}

// ---- Igreja: membros ----

export type MembroSituacao = 'pendente' | 'candidato' | 'ativo' | 'inativo' | 'recusado'
export type MembroTipoCadastro = 'ja_membro' | 'quer_ser_membro'
export type FormaIngresso = 'aclamacao' | 'transferencia' | 'batismo' | 'nao_sei'
export type CaminhoIngresso = Exclude<FormaIngresso, 'nao_sei'>
export type MembroSexo = 'feminino' | 'masculino'
export type EstadoCivil = 'solteiro' | 'casado' | 'uniao_estavel' | 'divorciado' | 'viuvo'

export interface Endereco {
  cep?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  uf?: string
}

export interface Membro {
  id: string
  org_id: string
  nome: string
  cpf: string | null
  data_nascimento: string | null
  sexo: MembroSexo | null
  estado_civil: EstadoCivil | null
  foto_path: string | null
  celular: string | null
  celular_whatsapp: boolean
  email: string | null
  endereco: Endereco
  tipo_cadastro: MembroTipoCadastro
  situacao: MembroSituacao
  motivo_inativacao: string | null
  origem: 'formulario_publico' | 'secretaria'
  forma_ingresso: FormaIngresso | null
  igreja_origem: string | null
  igreja_origem_cidade: string | null
  carta_path: string | null
  carta_entrega_presencial: boolean
  carta_recebida: boolean
  fez_curso_integracao: boolean | null
  ano_batismo: number | null
  data_batismo: string | null
  membro_desde_ano: number | null
  data_recepcao: string | null
  responsavel_nome: string | null
  responsavel_celular: string | null
  possivel_duplicado_de: string | null
  aceita_comunicacoes: boolean
  observacoes_internas: string | null
  aprovado_por: string | null
  aprovado_em: string | null
  created_at: string
  updated_at: string
}

export interface Consentimento {
  id: string
  org_id: string
  membro_id: string
  finalidade: 'cadastro_membro' | 'comunicacoes'
  versao: string
  texto_hash: string
  coletado_por: 'titular' | 'responsavel' | 'secretaria_presencial'
  ip: string | null
  user_agent: string | null
  revogado_em: string | null
  created_at: string
}

export interface MembresiaConfig {
  id: string
  org_id: string
  formulario_aberto: boolean
  curso_nome: string | null
  curso_descricao: string | null
  curso_caminhos: CaminhoIngresso[]
  texto_aclamacao: string | null
  texto_transferencia: string | null
  texto_batismo: string | null
  contato_privacidade: string | null
  mensagem_sucesso: string | null
  updated_at: string
}

// ---- Paleta de cores ----

export const COLOR_PALETTE: Record<CorPrimaria, { label: string; primary: string; secondary: string }> = {
  'azul-oceano':      { label: 'Azul Oceano',      primary: '#1e40af', secondary: '#93c5fd' },
  'verde-floresta':   { label: 'Verde Floresta',    primary: '#15803d', secondary: '#86efac' },
  'laranja-energia':  { label: 'Laranja Energia',   primary: '#c2410c', secondary: '#fdba74' },
  'roxo-criativo':    { label: 'Roxo Criativo',     primary: '#7e22ce', secondary: '#d8b4fe' },
  'vermelho-forca':   { label: 'Vermelho Força',    primary: '#b91c1c', secondary: '#fca5a5' },
  'rosa-acolhedor':   { label: 'Rosa Acolhedor',    primary: '#be185d', secondary: '#f9a8d4' },
  'amarelo-alegria':  { label: 'Amarelo Alegria',   primary: '#a16207', secondary: '#fde68a' },
  'cinza-nobre':      { label: 'Cinza Nobre',       primary: '#374151', secondary: '#d1d5db' },
  'indigo-confianca': { label: 'Índigo Confiança',  primary: '#3730a3', secondary: '#a5b4fc' },
  'teal-equilibrio':  { label: 'Teal Equilíbrio',   primary: '#0f766e', secondary: '#99f6e4' },
}

// ---- Sidebar nav types ----

export interface NavItem {
  label: string
  href: string
  icon?: string
}
