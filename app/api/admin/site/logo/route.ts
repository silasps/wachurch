import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { resolveOrgId } from '@/lib/org'
import { CONTENT_TYPE_WEBP, paraWebp } from '@/lib/imagem-server'
import { createServiceClient } from '@/lib/supabase-server'

const BUCKET = 'site-assets'

async function ensureBucket(supabase: Awaited<ReturnType<typeof createServiceClient>>) {
  const { data: buckets } = await supabase.storage.listBuckets()
  if (buckets?.some(b => b.id === BUCKET)) return

  await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/webp', 'image/png', 'image/jpeg', 'image/svg+xml'],
  })
}

export async function POST(req: Request) {
  const { profile } = await requireRole(['admin', 'superadmin'])
  const orgId = await resolveOrgId(profile)
  if (!orgId) return NextResponse.json({ error: 'Organização não identificada' }, { status: 400 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Imagem muito grande (máx 5MB)' }, { status: 400 })

  const supabase = await createServiceClient()

  await ensureBucket(supabase)

  const path = `${orgId}/logo-${Date.now()}.webp`
  let conteudo: Buffer
  try {
    conteudo = await paraWebp(file, { maxLado: 800, qualidade: 90 })
  } catch {
    return NextResponse.json({ error: 'Não foi possível processar esta imagem' }, { status: 400 })
  }

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, conteudo, { contentType: CONTENT_TYPE_WEBP, upsert: true })

  if (error) {
    console.error('[logo upload]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)

  return NextResponse.json({ url: publicUrl })
}
