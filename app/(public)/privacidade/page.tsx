import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import { resolveOrgFromHost, getSiteConfig } from '@/lib/tenant'
import { orgTemModulo } from '@/lib/modulos'
import { getMembresiaConfig } from '@/lib/membros-server'
import { contatoPrivacidade } from '@/lib/membros'
import { CONSENTIMENTO_MEMBRO_VERSAO, termosConsentimentoMembro } from '@/lib/termos/content-membro'
import { TenantHeader } from '../_components/tenant-header'
import { coresDoSite } from '@/lib/cores'

export const metadata: Metadata = { title: 'Aviso de privacidade' }

// Aviso de privacidade da igreja (controladora) sobre o cadastro de membros
export default async function PrivacidadePage() {
  const host = (await headers()).get('host') || 'localhost'
  const tenant = await resolveOrgFromHost(host)
  if (!tenant || !orgTemModulo(tenant.org, 'igreja')) notFound()
  const org = tenant.org

  const [siteConfig, config] = await Promise.all([getSiteConfig(org.id), getMembresiaConfig(org.id)])
  const cor = coresDoSite(siteConfig).primary
  const contato = contatoPrivacidade(config, org)
  const termos = termosConsentimentoMembro({ igreja: org.nome, contato })

  return (
    <div className="min-h-screen bg-gray-50">
      <TenantHeader nome={org.nome} logoUrl={siteConfig?.logo_url ?? null} cor={cor} />

      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck size={28} className="text-green-600" />
            <h2 className="text-2xl font-bold text-gray-900">Aviso de privacidade</h2>
          </div>
          <p className="text-base text-gray-600 mb-8">
            Como a {org.nome} cuida dos dados do cadastro de membros, conforme a Lei Geral de Proteção de Dados
            (Lei 13.709/2018).
          </p>

          <div className="space-y-6">
            {termos.map(t => (
              <section key={t.id}>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{t.titulo}</h3>
                <p className="text-base text-gray-700 leading-relaxed">{t.texto}</p>
              </section>
            ))}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Segurança</h3>
              <p className="text-base text-gray-700 leading-relaxed">
                Os dados ficam em servidores com acesso restrito e criptografia em trânsito. Fotos e documentos são
                guardados em área privada, visível apenas para a equipe autorizada da igreja, e o CPF aparece
                parcialmente oculto nas listagens.
              </p>
            </section>
          </div>

          <p className="mt-10 text-xs text-gray-400">Versão do texto: {CONSENTIMENTO_MEMBRO_VERSAO}</p>
        </div>
      </div>
    </div>
  )
}
