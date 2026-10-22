import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { resolveOrgFromHost, getSiteConfig } from '@/lib/tenant'
import { getSession } from '@/lib/auth'
import { getLoginDestination } from '@/lib/auth'
import LoginForm from './login-form'
import { coresDoSite } from '@/lib/cores'

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>
}) {
  const params = await searchParams
  const headersList = await headers()
  const host = headersList.get('host') || 'localhost'

  // Usuário já logado? Redireciona
  const session = await getSession()
  if (session) {
    redirect(params.redirect || getLoginDestination(session.profile.role))
  }

  // Resolve org pelo host para exibir branding
  const tenantResult = await resolveOrgFromHost(host)
  const siteConfig = tenantResult
    ? await getSiteConfig(tenantResult.org.id)
    : null

  const orgName = siteConfig
    ? (siteConfig.hero_titulo || tenantResult?.org.nome || 'Ostrick Social')
    : 'Ostrick Social'

  const logoUrl = siteConfig?.logo_url || null
  const colors = coresDoSite(siteConfig)

  return (
    <div className="min-h-screen flex">
      {/* Painel lateral com branding */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 text-white"
        style={{ backgroundColor: colors.primary }}
      >
        {logoUrl ? (
          <img src={logoUrl} alt={orgName} className="h-20 w-auto mb-8 object-contain" />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center mb-8">
            <span className="text-3xl font-bold text-white">
              {orgName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <h1 className="text-3xl font-bold text-center mb-3">{orgName}</h1>
        <p className="text-white/80 text-center text-lg max-w-sm">
          Plataforma de gestão para igrejas e projetos sociais
        </p>
      </div>

      {/* Formulário de login */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-gray-50">
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            {logoUrl ? (
              <img src={logoUrl} alt={orgName} className="h-14 w-auto mb-3 object-contain" />
            ) : (
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-3"
                style={{ backgroundColor: colors.primary }}
              >
                <span className="text-2xl font-bold text-white">
                  {orgName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <h1 className="text-xl font-bold text-gray-900">{orgName}</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Entrar na plataforma</h2>
            <p className="text-sm text-gray-500 mb-6">Use seu email e senha cadastrados</p>

            <LoginForm primaryColor={colors.primary} />
          </div>
        </div>
      </div>
    </div>
  )
}
