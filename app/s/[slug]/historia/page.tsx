import { RotaEditorialSlug } from '@/app/(public)/_components/rota-editorial'

export default async function HistoriaPorSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  return <RotaEditorialSlug slug={(await params).slug} pagina="historia" />
}
