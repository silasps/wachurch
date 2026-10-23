import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { resolveOrgId } from '@/lib/org'
import { CONTENT_TYPE_WEBP, ehImagemRaster, paraWebp } from '@/lib/imagem-server'
import { createServiceClient } from '@/lib/supabase-server'

const BUCKET = 'site-assets'
const MAX_SIZE = 8 * 1024 * 1024

async function ensureBucket(supabase: Awaited<ReturnType<typeof createServiceClient>>) {
  const { data: buckets } = await supabase.storage.listBuckets()
  if (buckets?.some(b => b.id === BUCKET)) return
  await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_SIZE,
    allowedMimeTypes: ['image/webp', 'image/png', 'image/jpeg', 'image/svg+xml'],
  })
}

export async function POST(req: Request) {
  const { profile } = await requireRole(['admin', 'superadmin'])
  const orgId = await resolveOrgId(profile)
  if (!orgId) return NextResponse.json({ error: 'Organização não identificada' }, { status: 400 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const slot = (formData.get('slot') as string | null) ?? 'img'

  if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'Imagem muito grande (máx 8MB)' }, { status: 400 })

  const supabase = await createServiceClient()
  await ensureBucket(supabase)

  // Toda imagem vira WebP (SVG é vetorial e segue como está)
  const svg = file.type === 'image/svg+xml'
  if (!svg && !ehImagemRaster(file.type)) {
    return NextResponse.json({ error: 'Envie uma imagem (JPG, PNG ou WebP)' }, { status: 400 })
  }
  let conteudo: Buffer
  try {
    conteudo = svg ? Buffer.from(await file.arrayBuffer()) : await paraWebp(file, { maxLado: 2400, qualidade: 82 })
  } catch {
    return NextResponse.json({ error: 'Não foi possível processar esta imagem' }, { status: 400 })
  }
  const path = `${orgId}/${slot}-${Date.now()}.${svg ? 'svg' : 'webp'}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, conteudo, { contentType: svg ? file.type : CONTENT_TYPE_WEBP, upsert: true })

  if (error) {
    console.error('[imagem upload]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)

  return NextResponse.json({ url: publicUrl })
}
