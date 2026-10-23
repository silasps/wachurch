'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { COOKIE_AREA } from '@/lib/modulos'
import type { Modulo } from '@/types'

// Seletor Igreja | Projeto Social do painel (a validação contra as áreas do usuário é feita na leitura)
export async function trocarArea(area: Modulo) {
  if (area !== 'igreja' && area !== 'social') return
  ;(await cookies()).set(COOKIE_AREA, area, { path: '/', sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 })
  redirect('/admin')
}
