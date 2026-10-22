// Utilitários de imagem para o NAVEGADOR (canvas) — recorte e compressão antes do upload.
// Reduzir no cliente deixa o envio rápido em conexões ruins e cabe no limite de 4,5 MB da Vercel.

export interface AreaPixels {
  x: number
  y: number
  width: number
  height: number
}

function carregarImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

// Prefere WebP (mais leve); navegadores sem suporte a codificar WebP devolvem outro formato → usa JPEG.
// O servidor converte para WebP de qualquer forma antes de gravar.
async function canvasParaBlob(canvas: HTMLCanvasElement, qualidade: number): Promise<Blob> {
  const gerar = (tipo: string) => new Promise<Blob | null>(resolve => canvas.toBlob(resolve, tipo, qualidade))
  const webp = await gerar('image/webp')
  if (webp?.type === 'image/webp') return webp
  const jpeg = await gerar('image/jpeg')
  if (!jpeg) throw new Error('Falha ao processar imagem')
  return jpeg
}

// Recorta a área escolhida e limita o maior lado a `maxLado` px (JPEG)
export async function recortarImagem(src: string, area: AreaPixels, maxLado = 800, qualidade = 0.85): Promise<Blob> {
  const img = await carregarImagem(src)
  const escala = Math.min(1, maxLado / Math.max(area.width, area.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(area.width * escala)
  canvas.height = Math.round(area.height * escala)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height)
  return canvasParaBlob(canvas, qualidade)
}

// Reduz uma foto inteira (ex.: carta fotografada) mantendo a proporção (JPEG)
export async function reduzirImagem(file: File, maxLado = 2000, qualidade = 0.8): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const img = await carregarImagem(url)
    const escala = Math.min(1, maxLado / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * escala)
    canvas.height = Math.round(img.naturalHeight * escala)
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvasParaBlob(canvas, qualidade)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function lerComoDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// HEIC/HEIF (padrão do iPhone): só o Safari decodifica. Nos outros navegadores converte para JPEG
// antes de recortar/reduzir. A biblioteca (~1 MB) só é baixada quando aparece um arquivo HEIC.
export function ehHeic(file: File): boolean {
  return /image\/hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)
}

export async function normalizarImagem(file: File): Promise<File> {
  if (!ehHeic(file)) return file
  // Safari abre HEIC nativamente — não precisa baixar o conversor
  const url = URL.createObjectURL(file)
  const abreNativo = await imagemAbre(url)
  URL.revokeObjectURL(url)
  if (abreNativo) return file
  const { default: heic2any } = await import('heic2any')
  const convertido = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })
  const blob = Array.isArray(convertido) ? convertido[0] : convertido
  return new File([blob], file.name.replace(/\.(heic|heif)$/i, '') + '.jpg', { type: 'image/jpeg' })
}

// Confirma que o navegador consegue exibir a imagem (evita abrir o recorte vazio)
export async function imagemAbre(src: string): Promise<boolean> {
  try {
    await carregarImagem(src)
    return true
  } catch {
    return false
  }
}

// Cor predominante de uma imagem (média dos pixels coloridos, ignorando branco/preto/cinza).
// Usada em "Usar a cor do logo". Exige CORS liberado na imagem (Supabase Storage público libera).
export async function corPredominante(url: string): Promise<string | null> {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = url })
  const lado = 120
  const escala = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(img.naturalWidth * escala))
  canvas.height = Math.max(1, Math.round(img.naturalHeight * escala))
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const soma = [0, 0, 0]
  let n = 0
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]]
    if (a < 128 || Math.max(r, g, b) - Math.min(r, g, b) < 80) continue
    soma[0] += r; soma[1] += g; soma[2] += b; n++
  }
  if (!n) return null
  return '#' + soma.map(v => Math.round(v / n).toString(16).padStart(2, '0')).join('')
}
