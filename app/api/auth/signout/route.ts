import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase-server'

// Cookies que não podem sobreviver ao logout (simulação do superadmin e preview de role)
const COOKIES_APP = ['sa_imp_org_id', 'sa_imp_role', 'os_admin_preview_role']
// Só os cookies de sessão DESTE projeto Supabase (em localhost o navegador mistura cookies de vários projetos)
const PREFIXO_SESSAO = `sb-${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split('.')[0]}-auth-token`

async function sair(request: NextRequest) {
  // 303: o navegador segue com GET (307 repetiria o POST em /entrar)
  const response = NextResponse.redirect(new URL('/entrar', request.url), { status: 303 })
  try {
    const supabase = await createClient()
    // Se a chamada ao Supabase falhar (token expirado, rede), o supabase-js NÃO apaga a sessão —
    // por isso os cookies são removidos manualmente logo abaixo
    await supabase.auth.signOut()
  } catch (err) {
    console.error('[auth/signout]', err)
  }
  try {
    const cookieStore = await cookies()
    for (const { name } of cookieStore.getAll()) {
      if (name.startsWith(PREFIXO_SESSAO) || COOKIES_APP.includes(name)) {
        response.cookies.set(name, '', { path: '/', expires: new Date(0) })
      }
    }
  } catch (err) {
    console.error('[auth/signout] cookies', err)
  }
  // Sempre redireciona — o usuário nunca fica parado nesta URL
  return response
}

export const POST = sair
// GET também sai: cobre navegação direta, recarregar a página ou formulário enviado como GET
export const GET = sair
