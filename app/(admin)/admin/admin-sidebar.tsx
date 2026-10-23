'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, GraduationCap, BookOpen,
  Heart, Globe, Settings, LogOut, ChevronRight, MoreHorizontal, DollarSign, Church,
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import {
  canVerDashboard, canVerAlunos, canVerTurmas,
  canGerenciarUsuarios, canGerenciarVoluntariado,
  canGerenciarSite, canGerenciarConfiguracoes,
  canVerFinanceiro, canVerMembros,
  ROLE_LABELS,
} from '@/lib/rbac'
import { AreaSwitcher } from '@/components/admin/area-switcher'
import type { Modulo, UserRole } from '@/types'

interface AdminSidebarProps {
  orgName: string
  logoUrl: string | null
  primaryColor: string
  userNome: string
  userRole: UserRole
  effectiveRole: UserRole
  /** Módulos da licença da org */
  modulosOrg: Modulo[]
  /** Áreas que o usuário acessa (licença ∩ permissões dele) */
  areas: Modulo[]
  areaAtiva: Modulo | null
}

// area: item só aparece na área ativa do painel (sem area = comum às duas áreas)
const NAV_ITEMS: Array<{
  label: string
  href: string
  icon: typeof LayoutDashboard
  can: (role: UserRole) => boolean
  area?: Modulo
}> = [
  { label: 'Dashboard',    href: '/admin',               icon: LayoutDashboard, can: canVerDashboard },
  { label: 'Membros',      href: '/admin/membros',       icon: Church,          can: canVerMembros, area: 'igreja' },
  { label: 'Usuários',     href: '/admin/usuarios',      icon: Users,           can: canGerenciarUsuarios },
  { label: 'Alunos',       href: '/admin/alunos',        icon: GraduationCap,   can: canVerAlunos, area: 'social' },
  { label: 'Turmas',       href: '/admin/turmas',        icon: BookOpen,        can: canVerTurmas, area: 'social' },
  { label: 'Financeiro',   href: '/admin/financeiro',    icon: DollarSign,      can: canVerFinanceiro },
  { label: 'Voluntariado', href: '/admin/voluntariado',  icon: Heart,           can: canGerenciarVoluntariado, area: 'social' },
  { label: 'Site',         href: '/admin/site',          icon: Globe,           can: canGerenciarSite },
  { label: 'Config',       href: '/admin/configuracoes', icon: Settings,        can: canGerenciarConfiguracoes },
]

const MAX_PRIMARY = 4

export default function AdminSidebar({
  orgName, logoUrl, primaryColor, userNome, userRole, effectiveRole, modulosOrg, areas, areaAtiva,
}: AdminSidebarProps) {
  const pathname = usePathname()
  const [maisOpen, setMaisOpen] = useState(false)

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

  // Financeiro pertence ao Projeto Social; em contas sem esse módulo continua comum
  const areaDoItem = (item: (typeof NAV_ITEMS)[number]): Modulo | undefined =>
    item.href === '/admin/financeiro' ? (modulosOrg.includes('social') ? 'social' : undefined) : item.area

  const visibleItems = NAV_ITEMS.filter(item => {
    if (!item.can(effectiveRole)) return false
    const area = areaDoItem(item)
    return !area || (areas.includes(area) && area === areaAtiva)
  })

  const showMais = visibleItems.length > MAX_PRIMARY
  const primaryItems = showMais ? visibleItems.slice(0, MAX_PRIMARY) : visibleItems
  const overflowItems = showMais ? visibleItems.slice(MAX_PRIMARY) : []

  return (
    <>
      {/* Sidebar — desktop only */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col bg-white border-r border-gray-200">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
          {logoUrl ? (
            <img src={logoUrl} alt={orgName} className="h-8 w-8 object-contain rounded" />
          ) : (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ backgroundColor: primaryColor }}
            >
              {orgName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-sm font-semibold text-gray-900 truncate">{orgName}</span>
        </div>

        {areas.length > 1 && (
          <div className="px-3 pt-3">
            <AreaSwitcher areas={areas} areaAtiva={areaAtiva} primaryColor={primaryColor} />
          </div>
        )}

        <nav className="flex-1 px-3 py-4 overflow-auto">
          <div className="space-y-0.5">
              {visibleItems.map(({ label, href, icon: Icon }) => {
                const active = isActive(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition group',
                      active ? 'text-white font-medium' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    )}
                    style={active ? { backgroundColor: primaryColor } : {}}
                  >
                    <Icon size={16} className={active ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'} />
                    {label === 'Site' ? 'Site Público' : label === 'Config' ? 'Configurações' : label}
                    {active && <ChevronRight size={14} className="ml-auto text-white/70" />}
                  </Link>
                )
              })}
          </div>
        </nav>

        <div className="px-3 pb-4 border-t border-gray-100 pt-3">
          <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
              style={{ backgroundColor: primaryColor }}
            >
              {getInitials(userNome)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">{userNome}</p>
              <p className="text-xs text-gray-400">{ROLE_LABELS[userRole]}</p>
            </div>
          </div>
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition"
            >
              <LogOut size={15} />
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* Bottom nav — mobile only */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-100 flex items-stretch">
        {primaryItems.map(({ label, href, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMaisOpen(false)}
              className="flex flex-1 flex-col items-center justify-center pt-2 pb-3 gap-0.5"
            >
              <div
                className="px-5 py-1 rounded-full transition-colors"
                style={active ? { backgroundColor: `${primaryColor}18` } : {}}
              >
                <Icon size={20} style={{ color: active ? primaryColor : '#9ca3af' }} />
              </div>
              <span className="text-[10px] font-medium" style={{ color: active ? primaryColor : '#9ca3af' }}>
                {label}
              </span>
            </Link>
          )
        })}

        {showMais ? (
          <button
            onClick={() => setMaisOpen(v => !v)}
            className="flex flex-1 flex-col items-center justify-center pt-2 pb-3 gap-0.5"
          >
            <div className={cn('px-5 py-1 rounded-full transition-colors', maisOpen ? 'bg-gray-100' : '')}>
              <MoreHorizontal size={20} className={maisOpen ? 'text-gray-700' : 'text-gray-400'} />
            </div>
            <span className={cn('text-[10px] font-medium', maisOpen ? 'text-gray-700' : 'text-gray-400')}>Mais</span>
          </button>
        ) : (
          <form action="/api/auth/signout" method="post" className="flex flex-1">
            <button type="submit" className="flex flex-1 flex-col items-center justify-center pt-2 pb-3 gap-0.5">
              <div className="px-5 py-1 rounded-full">
                <LogOut size={20} className="text-gray-400" />
              </div>
              <span className="text-[10px] font-medium text-gray-400">Sair</span>
            </button>
          </form>
        )}
      </nav>

      {/* Bottom Sheet "Mais" */}
      <div
        className={cn('lg:hidden fixed inset-0 z-50 bg-black/40 transition-opacity duration-300', maisOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none')}
        onClick={() => setMaisOpen(false)}
      />
      <div
        className={cn(
          'lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out',
          maisOpen ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-1" />
        <div className="px-3 pb-8 pt-2">
          {overflowItems.map(({ label, href, icon: Icon }) => {
            const active = isActive(href)
            const displayLabel = label === 'Site' ? 'Site Público' : label === 'Config' ? 'Configurações' : label
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMaisOpen(false)}
                className="flex items-center gap-4 px-4 py-3.5 rounded-xl transition-colors"
                style={active ? { color: primaryColor, backgroundColor: `${primaryColor}10` } : { color: '#374151' }}
              >
                <Icon size={22} style={{ color: active ? primaryColor : '#6b7280' }} />
                <span className="text-sm font-medium">{displayLabel}</span>
                {active && <ChevronRight size={16} className="ml-auto" style={{ color: primaryColor }} />}
              </Link>
            )
          })}
          <div className="my-2 border-t border-gray-100" />
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="flex items-center gap-4 px-4 py-3.5 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors w-full"
            >
              <LogOut size={22} className="text-gray-400" />
              <span className="text-sm font-medium">Sair</span>
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
