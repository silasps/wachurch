import { RotaEditorialSlug } from '@/app/(public)/_components/rota-editorial'

export default async function CultosPorSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  return <RotaEditorialSlug slug={(await params).slug} pagina="cultos" />
}
