'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Cropper from 'react-easy-crop'
import type { Area, Point } from 'react-easy-crop'
import { Camera, ImageIcon, X, Check, Loader2, ZoomIn, ZoomOut, UserRound } from 'lucide-react'
import { ehHeic, imagemAbre, lerComoDataUrl, normalizarImagem, recortarImagem } from '@/lib/imagem'

interface PhotoPickerProps {
  /** URL para exibir (objeto local ou URL assinada) */
  previewUrl: string | null
  onChange: (foto: Blob | null) => void
  primaryColor?: string
  /** Botões e textos maiores (formulário público) */
  grande?: boolean
}

// Seleção de foto de rosto: "Tirar foto" (câmera frontal) ou "Escolher da galeria",
// recorte quadrado e compressão no navegador (~800 px JPEG). Não faz upload — devolve o Blob.
export function PhotoPicker({ previewUrl, onChange, primaryColor = '#1e40af', grande = false }: PhotoPickerProps) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const galeriaRef = useRef<HTMLInputElement>(null)
  const [src, setSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [area, setArea] = useState<Area | null>(null)
  const [processando, setProcessando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // Trava o scroll da página enquanto o recorte está aberto
  useEffect(() => {
    if (!src) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [src])

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setErro(null)
    if (!file.type.startsWith('image/') && !ehHeic(file)) {
      setErro('Escolha uma imagem (foto).')
      return
    }
    setProcessando(true)
    try {
      const dataUrl = await lerComoDataUrl(await normalizarImagem(file))
      if (!(await imagemAbre(dataUrl))) throw new Error('formato')
      setSrc(dataUrl)
      setZoom(1)
      setCrop({ x: 0, y: 0 })
    } catch {
      setErro('Não foi possível abrir esta foto. Tente outra ou tire uma nova pela câmera.')
    } finally {
      setProcessando(false)
    }
  }

  const onCropComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), [])

  async function confirmar() {
    if (!src || !area) return
    setProcessando(true)
    try {
      onChange(await recortarImagem(src, area))
      setSrc(null)
    } catch {
      setErro('Não foi possível processar a foto. Tente outra.')
    } finally {
      setProcessando(false)
    }
  }

  const tamanho = grande ? 'w-32 h-32' : 'w-24 h-24'
  const botao = grande
    ? 'flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-base font-semibold rounded-xl border-2 transition'
    : 'flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition'

  return (
    <div>
      <input ref={cameraRef} type="file" accept="image/*" capture="user" className="hidden" onChange={onFile} />
      <input ref={galeriaRef} type="file" accept="image/*,.heic,.heif" className="hidden" onChange={onFile} />

      <div className="flex flex-col items-center gap-3">
        <div
          className={`${tamanho} rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow flex items-center justify-center`}
        >
          {previewUrl ? (
            <img src={previewUrl} alt="Sua foto" className="w-full h-full object-cover" />
          ) : (
            <UserRound size={grande ? 56 : 40} className="text-gray-300" />
          )}
        </div>

        <div className="flex gap-2 w-full max-w-sm">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className={`${botao} text-white border-transparent`}
            style={{ backgroundColor: primaryColor }}
          >
            {processando && !src ? <Loader2 size={grande ? 20 : 16} className="animate-spin" /> : <Camera size={grande ? 20 : 16} />}
            {processando && !src ? 'Abrindo…' : previewUrl ? 'Tirar outra' : 'Tirar foto'}
          </button>
          <button
            type="button"
            onClick={() => galeriaRef.current?.click()}
            className={`${botao} border-gray-300 text-gray-700 bg-white hover:bg-gray-50`}
          >
            <ImageIcon size={grande ? 20 : 16} />
            Galeria
          </button>
        </div>

        {previewUrl && (
          <button type="button" onClick={() => onChange(null)} className="text-sm text-red-600 hover:text-red-700 underline">
            Remover foto
          </button>
        )}
        {erro && <p className="text-sm text-red-600">{erro}</p>}
      </div>

      {src && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-black/95">
          <div className="flex items-center justify-between px-4 py-3 shrink-0">
            <button type="button" onClick={() => setSrc(null)} className="text-white/80 hover:text-white p-2" aria-label="Cancelar">
              <X size={24} />
            </button>
            <p className="text-white text-base font-medium">Ajuste sua foto</p>
            <span className="w-10" />
          </div>

          <div className="relative flex-1">
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>

          <div className="shrink-0 px-4 pt-4 pb-6 space-y-4">
            <div className="flex items-center gap-3 max-w-md mx-auto">
              <button type="button" onClick={() => setZoom(z => Math.max(1, z - 0.2))} className="text-white/80 p-1" aria-label="Diminuir zoom">
                <ZoomOut size={22} />
              </button>
              <input
                type="range" min={1} max={3} step={0.05} value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                className="flex-1 accent-white"
                aria-label="Zoom"
              />
              <button type="button" onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="text-white/80 p-1" aria-label="Aumentar zoom">
                <ZoomIn size={22} />
              </button>
            </div>
            <p className="text-center text-white/60 text-sm">Arraste para centralizar o rosto</p>
            <button
              type="button"
              onClick={confirmar}
              disabled={processando}
              className="w-full max-w-md mx-auto flex items-center justify-center gap-2 py-4 bg-white text-gray-900 text-lg font-semibold rounded-2xl disabled:opacity-60"
            >
              {processando ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
              Usar esta foto
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
