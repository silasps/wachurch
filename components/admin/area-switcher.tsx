'use client'

import { useTransition } from 'react'
import { Church, HeartHandshake, Loader2 } from 'lucide-react'
import { trocarArea } from '@/lib/actions/area'
import { AREA_LABELS } from '@/lib/modulos'
import type { Modulo } from '@/types'

const ICONES: Record<Modulo, typeof Church> = { igreja: Church, social: HeartHandshake }

// Seletor Igreja | Projeto Social — aparece quando o usuário acessa as duas áreas
export function AreaSwitcher({ areas, areaAtiva, primaryColor }: {
  areas: Modulo[]
  areaAtiva: Modulo | null
  primaryColor: string
}) {
  const [pendente, startTransition] = useTransition()
  if (areas.length < 2) return null

  return (
    <div className="flex p-1 bg-gray-100 rounded-xl gap-1" role="tablist" aria-label="Área do painel">
      {areas.map(area => {
        const ativa = area === areaAtiva
        const Icone = ICONES[area]
        return (
          <button
            key={area}
            type="button"
            role="tab"
            aria-selected={ativa}
            disabled={pendente}
            onClick={() => !ativa && startTransition(() => trocarArea(area))}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-70 ${ativa ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            style={ativa ? { color: primaryColor } : {}}
          >
            {pendente && !ativa ? <Loader2 size={14} className="animate-spin" /> : <Icone size={14} />}
            {AREA_LABELS[area]}
          </button>
        )
      })}
    </div>
  )
}
