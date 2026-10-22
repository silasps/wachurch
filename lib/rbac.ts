import type { UserRole } from '@/types'

export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Super Admin',
  admin: 'Administrador',
  funcionario: 'Funcionário',
  professor: 'Professor',
  aluno: 'Aluno',
  responsavel: 'Responsável',
}

export const ROLE_LEVEL: Record<UserRole, number> = {
  superadmin: 100,
  admin: 80,
  funcionario: 50,
  professor: 30,
  aluno: 10,
  responsavel: 10,
}

export function getRoleLevel(role: UserRole | null | undefined): number {
  if (!role) return 0
  return ROLE_LEVEL[role] ?? 0
}

// Permissões do painel /admin
export const canVerDashboard: (role: UserRole) => boolean = () => true
export const canVerAlunos           = (role: UserRole) => getRoleLevel(role) >= ROLE_LEVEL.funcionario
export const canVerTurmas           = (role: UserRole) => getRoleLevel(role) >= ROLE_LEVEL.funcionario
export const canGerenciarUsuarios   = (role: UserRole) => getRoleLevel(role) >= ROLE_LEVEL.admin
export const canGerenciarVoluntariado = (role: UserRole) => getRoleLevel(role) >= ROLE_LEVEL.admin
export const canGerenciarSite       = (role: UserRole) => getRoleLevel(role) >= ROLE_LEVEL.admin
export const canGerenciarConfiguracoes = (role: UserRole) => getRoleLevel(role) >= ROLE_LEVEL.admin

// Permissões do módulo financeiro
export const canVerFinanceiro       = (role: UserRole) => getRoleLevel(role) >= ROLE_LEVEL.funcionario
export const canGerenciarFinanceiro = (role: UserRole) => getRoleLevel(role) >= ROLE_LEVEL.admin

// Permissões do módulo igreja (membros) — a secretaria usa o role funcionario
export const canVerMembros          = (role: UserRole) => getRoleLevel(role) >= ROLE_LEVEL.funcionario
export const canGerenciarMembros    = (role: UserRole) => getRoleLevel(role) >= ROLE_LEVEL.funcionario
export const canConfigurarMembresia = (role: UserRole) => getRoleLevel(role) >= ROLE_LEVEL.admin

// Roles que o superadmin pode simular no painel /admin
export const PREVIEW_ROLES: Array<{ value: UserRole; label: string; desc: string }> = [
  { value: 'admin',      label: 'Administrador', desc: 'Acesso total à organização' },
  { value: 'funcionario', label: 'Funcionário',  desc: 'Sem usuários, site e configurações' },
]
