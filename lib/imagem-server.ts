import sharp from 'sharp'

// Regra do sistema: TODA imagem enviada é gravada no Storage em WebP.
// A conversão é feita aqui no servidor (garantida em qualquer navegador); o navegador
// também tenta enviar em WebP para deixar o upload mais leve, mas não dependemos disso.
//
// Também corrige a rotação pela orientação EXIF e remove os metadados (EXIF/GPS) —
// fotos de celular costumam carregar a localização de onde foram tiradas.

export const CONTENT_TYPE_WEBP = 'image/webp'

export function ehImagemRaster(mime: string): boolean {
  return /^image\/(jpeg|png|webp|gif|avif|tiff)$/i.test(mime)
}

export async function paraWebp(
  file: File | Buffer,
  { maxLado = 2000, qualidade = 82 }: { maxLado?: number; qualidade?: number } = {},
): Promise<Buffer> {
  const entrada = Buffer.isBuffer(file) ? file : Buffer.from(await file.arrayBuffer())
  return sharp(entrada, { failOn: 'error' })
    .rotate()
    .resize({ width: maxLado, height: maxLado, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: qualidade })
    .toBuffer()
}
