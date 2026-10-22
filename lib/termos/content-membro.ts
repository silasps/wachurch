// Texto de consentimento LGPD do cadastro de membros (Lei 13.709/2018)
// Filiação a organização religiosa é dado pessoal sensível (art. 5º, II) — exige
// consentimento específico e destacado (art. 11, I).
//
// IMPORTANTE: ao alterar qualquer texto abaixo, incremente a VERSAO. O servidor grava a
// versão e o hash sha256 do texto exibido em `consentimentos`, como prova do que foi aceito.
// Recomenda-se revisão jurídica antes de usar em produção.

import type { TermoSection } from './content-aluno'

export const CONSENTIMENTO_MEMBRO_VERSAO = '2026-10-v1'

interface Params {
  igreja: string
  contato: string | null
}

export function resumoConsentimentoMembro({ igreja }: Pick<Params, 'igreja'>): string {
  return `Autorizo a ${igreja} a guardar e usar meus dados para o cadastro de membros, ` +
    'conforme a Lei Geral de Proteção de Dados (LGPD).'
}

export function textoConsentimentoComunicacoes({ igreja }: Pick<Params, 'igreja'>): string {
  return `Aceito receber comunicados da ${igreja} (avisos, eventos e programação) por WhatsApp ou e-mail. ` +
    'Posso cancelar quando quiser.'
}

export function termosConsentimentoMembro({ igreja, contato }: Params): TermoSection[] {
  const canal = contato?.trim() || 'a secretaria da igreja'
  return [
    {
      id: 'controlador',
      titulo: 'Quem cuida dos seus dados',
      texto: `A ${igreja} é a responsável (controladora) pelos dados deste cadastro. ` +
        'A plataforma Ostrick Social apenas armazena as informações em nome da igreja (operadora), ' +
        'com segurança, e não as usa para nenhuma outra finalidade.',
    },
    {
      id: 'finalidade',
      titulo: 'Para que usamos',
      texto: 'Para identificar você como membro ou candidato a membro, organizar o processo de membresia ' +
        '(aclamação, transferência ou batismo), manter o rol de membros atualizado e entrar em contato sobre ' +
        'o seu cadastro. Comunicados gerais só serão enviados se você marcar a opção separada para isso.',
    },
    {
      id: 'sensivel',
      titulo: 'Dado sensível',
      texto: 'A informação de que você é membro de uma igreja é considerada dado pessoal sensível pela LGPD ' +
        '(art. 5º, II). Por isso, ela só é tratada com o seu consentimento específico (art. 11, I), e o acesso ' +
        'fica restrito à secretaria e à liderança autorizada da igreja.',
    },
    {
      id: 'dados',
      titulo: 'O que coletamos e por quê',
      texto: 'Nome, CPF (para diferenciar pessoas com nomes parecidos e evitar cadastros duplicados), data de ' +
        'nascimento, sexo, estado civil, telefone, e-mail e endereço (opcionais), foto (opcional, para ' +
        'identificação), informações sobre como você entrou ou quer entrar na igreja e, quando for o caso, a ' +
        'carta de transferência. Não pedimos RG, renda, dados de saúde ou documentos pessoais.',
    },
    {
      id: 'compartilhamento',
      titulo: 'Compartilhamento',
      texto: 'Seus dados não são vendidos nem compartilhados com terceiros para publicidade. Só podem ser ' +
        'compartilhados quando a lei exigir ou por ordem judicial.',
    },
    {
      id: 'prazo',
      titulo: 'Por quanto tempo guardamos',
      texto: 'Enquanto você for membro ou estiver no processo de membresia. Depois disso, pelo tempo necessário ' +
        'para os registros históricos da igreja e para cumprir obrigações legais — ou até você pedir a exclusão.',
    },
    {
      id: 'direitos',
      titulo: 'Seus direitos',
      texto: 'Você pode, a qualquer momento, confirmar se temos seus dados, ver quais são, corrigi-los, pedir a ' +
        `exclusão e revogar este consentimento (art. 18 da LGPD). Para isso, fale com: ${canal}.`,
    },
    {
      id: 'menores',
      titulo: 'Menores de idade',
      texto: 'Se o cadastro for de alguém com menos de 18 anos, o consentimento deve ser dado pelo pai, pela mãe ' +
        'ou pelo responsável legal, que informa seu nome e telefone no formulário.',
    },
  ]
}

// Texto canônico (o que é "assinado") — base do hash gravado em consentimentos.texto_hash
export function textoCanonicoConsentimentoMembro(params: Params): string {
  return [
    `Versão ${CONSENTIMENTO_MEMBRO_VERSAO}`,
    resumoConsentimentoMembro(params),
    ...termosConsentimentoMembro(params).map(t => `${t.titulo}\n${t.texto}`),
  ].join('\n\n')
}

export function textoCanonicoComunicacoes(params: Pick<Params, 'igreja'>): string {
  return `Versão ${CONSENTIMENTO_MEMBRO_VERSAO}\n\n${textoConsentimentoComunicacoes(params)}`
}
