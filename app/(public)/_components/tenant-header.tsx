import Link from 'next/link'

// Cabeçalho simples das páginas públicas de um tenant (cadastro, privacidade…)
export function TenantHeader({ nome, logoUrl, cor }: { nome: string; logoUrl: string | null; cor: string }) {
  return (
    <div className="py-6 sm:py-8 text-center text-white px-4" style={{ backgroundColor: cor }}>
      {logoUrl && (
        <img src={logoUrl} alt="" className="h-12 w-auto mx-auto mb-3 object-contain" />
      )}
      <h1 className="text-xl sm:text-2xl font-bold">{nome}</h1>
      <Link href="/" className="text-white/80 text-sm mt-1 inline-block hover:text-white">← Voltar ao site</Link>
    </div>
  )
}
