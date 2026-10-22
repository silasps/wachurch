'use client'

import { useRef, useState } from 'react'
import { Camera, Paperclip, FileText, Loader2, X } from 'lucide-react'
import { ehHeic, normalizarImagem, reduzirImagem } from '@/lib/imagem'

interface DocumentPickerProps {
  arquivo: File | null
  onChange: (arquivo: File | null) => void
  /** Tamanho máximo do PDF em bytes (imagens são reduzidas no navegador) */
  maxPdfBytes: number
  primaryColor?: string
  grande?: boolean
}

// Seleção de documento: foto (câmera traseira, reduzida para ~2000 px JPEG) ou PDF.
export function DocumentPicker({ arquivo, onChange, maxPdfBytes, primaryColor = '#1e40af', grande = false }: DocumentPickerProps) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const arquivoRef = useRef<HTMLInputElement>(null)
  const [processando, setProcessando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setErro(null)

    if (file.type === 'application/pdf') {
      if (file.size > maxPdfBytes) {
        const mb = (maxPdfBytes / 1024 / 1024).toFixed(1).replace('.', ',')
        setErro(`O PDF é grande demais (máximo ${mb} MB). Tente tirar uma foto da carta.`)
        return
      }
      setPreview(null)
      onChange(file)
      return
    }

    if (!file.type.startsWith('image/') && !ehHeic(file)) {
      setErro('Envie uma foto ou um arquivo PDF.')
      return
    }

    setProcessando(true)
    try {
      const blob = await reduzirImagem(await normalizarImagem(file))
      const nome = file.name.replace(/\.[^.]+$/, '') || 'carta'
      const reduzida = new File([blob], `${nome}.${blob.type === 'image/webp' ? 'webp' : 'jpg'}`, { type: blob.type || 'image/jpeg' })
      if (preview) URL.revokeObjectURL(preview)
      setPreview(URL.createObjectURL(reduzida))
      onChange(reduzida)
    } catch {
      setErro('Não foi possível abrir esta imagem. Tente outra.')
    } finally {
      setProcessando(false)
    }
  }

  function remover() {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    onChange(null)
  }

  const botao = grande
    ? 'flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-base font-semibold rounded-xl border-2 transition'
    : 'flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition'

  return (
    <div>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
      <input ref={arquivoRef} type="file" accept="image/*,.heic,.heif,application/pdf" className="hidden" onChange={onFile} />

      {arquivo ? (
        <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
          {preview ? (
            <img src={preview} alt="Carta" className="w-14 h-14 object-cover rounded-lg border border-gray-200" />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-red-50 flex items-center justify-center">
              <FileText size={26} className="text-red-500" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{arquivo.name}</p>
            <p className="text-xs text-gray-500">{(arquivo.size / 1024).toFixed(0)} KB</p>
          </div>
          <button type="button" onClick={remover} className="p-2 text-gray-400 hover:text-red-600" aria-label="Remover arquivo">
            <X size={20} />
          </button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            disabled={processando}
            className={`${botao} text-white border-transparent disabled:opacity-60`}
            style={{ backgroundColor: primaryColor }}
          >
            {processando ? <Loader2 size={20} className="animate-spin" /> : <Camera size={grande ? 20 : 16} />}
            Fotografar a carta
          </button>
          <button
            type="button"
            onClick={() => arquivoRef.current?.click()}
            disabled={processando}
            className={`${botao} border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-60`}
          >
            <Paperclip size={grande ? 20 : 16} />
            Anexar arquivo
          </button>
        </div>
      )}
      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
    </div>
  )
}
