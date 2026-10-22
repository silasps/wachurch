import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { LICENCAS, isLicencaId } from '@/lib/modulos'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(['superadmin'])
  } catch {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const { plano, ativo, licenca } = body

  const update: Record<string, unknown> = { plano, ativo }
  if (licenca !== undefined) {
    if (!isLicencaId(licenca)) return NextResponse.json({ error: 'Licença inválida' }, { status: 400 })
    update.tipo = LICENCAS[licenca].tipo
    update.modulos = LICENCAS[licenca].modulos
  }

  const supabase = await createServiceClient()
  const { error } = await supabase
    .from('organizations')
    .update(update)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
