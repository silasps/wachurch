import { headers } from 'next/headers'
import { resolveOrgFromHost, getSiteConfig } from '@/lib/tenant'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import FacaParteForm from './faca-parte-form'
import { coresDoSite } from '@/lib/cores'

export default async function FacaPartePage() {
  const headersList = await headers()
  const host = headersList.get('host') || 'localhost'

  const tenantResult = await resolveOrgFromHost(host)
  if (!tenantResult) notFound()

  const siteConfig = await getSiteConfig(tenantResult.org.id)
  const colors = coresDoSite(siteConfig)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header simples */}
      <div className="py-8 text-center text-white px-4" style={{ backgroundColor: colors.primary }}>
        {siteConfig?.logo_url && (
          <img src={siteConfig.logo_url} alt="" className="h-12 w-auto mx-auto mb-4 object-contain" />
        )}
        <h1 className="text-2xl font-bold">{tenantResult.org.nome}</h1>
        <Link href="/" className="text-white/70 text-sm mt-1 inline-block hover:text-white">← Voltar ao site</Link>
      </div>

      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Quero fazer parte!</h2>
          <p className="text-gray-500 text-sm mb-6">
            Preencha o formulário abaixo e entraremos em contato para dar continuidade ao seu cadastro.
          </p>
          <FacaParteForm orgId={tenantResult.org.id} primaryColor={colors.primary} />
        </div>
      </div>
    </div>
  )
}
