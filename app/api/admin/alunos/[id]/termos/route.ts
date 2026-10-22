import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { temModulo } from '@/lib/org'
import { getSession, isAdmin } from '@/lib/auth'

interface Params { params: Promise<{ id: string }> }

export async function GET(req: Request, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session || (!isAdmin(session.profile.role) && session.profile.role !== 'funcionario')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }
  if (!(await temModulo(session.profile, 'social'))) {
    return NextResponse.json({ error: 'Módulo Projeto Social não está disponível nesta licença' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('termos_ficha')
    .select('id, tipo, status, signed_at, signed_by_name, signed_by_email, expires_at, created_at, token')
    .eq('aluno_id', id)
    .eq('org_id', session.profile.org_id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ termos: data })
}

export async function POST(req: Request, { params }: Params) {
  const { id } = await params
  const session = await getSession()
  if (!session || (!isAdmin(session.profile.role) && session.profile.role !== 'funcionario')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }
  if (!(await temModulo(session.profile, 'social'))) {
    return NextResponse.json({ error: 'Módulo Projeto Social não está disponível nesta licença' }, { status: 403 })
  }

  const supabase = await createClient()

  // Verifica se o aluno pertence à org
  const { data: aluno } = await supabase
    .from('alunos')
    .select('id, nome, email')
    .eq('id', id)
    .eq('org_id', session.profile.org_id)
    .single()

  if (!aluno) return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 })

  const { data: termo, error } = await supabase
    .from('termos_ficha')
    .insert({
      org_id: session.profile.org_id,
      aluno_id: id,
      tipo: 'ficha_aluno',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select('token')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const link = `${siteUrl}/termos/${termo.token}`

  // Envia por email se configurado
  if (process.env.RESEND_API_KEY && aluno.email) {
    const from = `${process.env.EMAIL_FROM_NAME ?? 'Projeto Social'} <${process.env.EMAIL_FROM ?? 'noreply@ostricksocial.com.br'}>`
    const html = `<!DOCTYPE html><html lang="pt-BR"><body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<table width="100%" style="padding:32px 16px;background:#f5f5f5;"><tr><td align="center">
<table width="560" style="background:#fff;border-radius:16px;overflow:hidden;max-width:560px;width:100%;">
<tr><td style="background:#1d4ed8;padding:28px 40px;text-align:center;">
  <p style="margin:0;font-size:20px;font-weight:700;color:#fff;">Projeto Social</p>
  <p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.6);">Ficha de matrícula digital</p>
</td></tr>
<tr><td style="padding:36px 40px;">
  <p style="font-size:15px;color:#333;margin:0 0 16px;">Olá, <strong>${aluno.nome.split(' ')[0]}</strong>!</p>
  <p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 24px;">
    O projeto enviou sua ficha de matrícula para assinatura digital. Por favor, leia com atenção os termos e assine pelo link abaixo.
  </p>
  <a href="${link}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:14px;font-weight:700;margin-bottom:24px;">
    ✍️ Assinar ficha e termos
  </a>
  <p style="font-size:12px;color:#94a3b8;margin:0;">Link válido por 30 dias.</p>
</td></tr>
</table></td></tr></table>
</body></html>`

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: aluno.email, subject: 'Assine sua ficha de matrícula — Projeto Social', html }),
    }).catch(err => console.error('[Termos] Email erro:', err))
  }

  return NextResponse.json({ token: termo.token, link }, { status: 201 })
}
