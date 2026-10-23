// Regras de função (role) e áreas de acesso dos usuários de uma org — usadas no form e nas APIs
import type { Modulo, UserRole } from '@/types'

export const ROLES_DA_ORG: Array<{ value: UserRole; label: string; desc: string; modulo?: Modulo }> = [
  { value: 'admin',       label: 'Administrador', desc: 'Acesso total às áreas marcadas, inclusive usuários e configurações' },
  { value: 'funcionario', label: 'Funcionário',   desc: 'Secretaria e operação (membros, alunos, financeiro), sem usuários/site/configurações' },
  { value: 'professor',   label: 'Professor',     desc: 'Painel do professor: turmas, chamada e materiais', modulo: 'social' },
]

// Funções disponíveis conforme a licença (professor só existe com o Projeto Social)
export function rolesDisponiveis(modulosOrg: Modulo[]) {
  return ROLES_DA_ORG.filter(r => !r.modulo || modulosOrg.includes(r.modulo))
}

// Normaliza as áreas pedidas: só módulos da org; todas marcadas = null (acompanha a licença);
// professor fica sempre só no Projeto Social.
export function normalizarAreas(pedidas: unknown, modulosOrg: Modulo[], role: string): Modulo[] | null {
  if (role === 'professor') return modulosOrg.length > 1 ? ['social'] : null
  const validas = (Array.isArray(pedidas) ? pedidas : []).filter((a): a is Modulo => modulosOrg.includes(a as Modulo))
  if (!validas.length || validas.length === modulosOrg.length) return null
  return validas
}
