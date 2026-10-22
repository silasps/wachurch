import { requireRole } from '@/lib/auth'
import { requireModulo } from '@/lib/org'

// Módulo Projeto Social — bloqueia contas cuja licença não inclui o módulo
export default async function TurmasLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole(['admin', 'funcionario', 'superadmin'])
  await requireModulo(profile, 'social')
  return children
}
