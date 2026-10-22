import { ShieldCheck } from 'lucide-react'
import { getSiteConfig } from '@/lib/tenant'
import { getMembresiaConfig } from '@/lib/membros-server'
import { contatoPrivacidade } from '@/lib/membros'
import { CONSENTIMENTO_MEMBRO_VERSAO, termosConsentimentoMembro } from '@/lib/termos/content-membro'
import { coresDoSite } from '@/lib/cores'
import type { Organization } from '@/types'
import { TenantHeader } from '../_components/tenant-header'

// Aviso de privacidade da igreja (controladora) — usado em /privacidade e /s/[slug]/privacidade
export default async function PrivacidadeView({ org, basePath = '' }: { org: Organization; basePath?: string }) {
  const [siteConfig, config] = await Promise.all([getSiteConfig(org.id), getMembresiaConfig(org.id)])
  const cor = coresDoSite(siteConfig).primary
  const contato = contatoPrivacidade(config, org)
  const termos = termosConsentimentoMembro({ igreja: org.nome, contato })

  return (
    <div className="min-h-screen bg-gray-50">
      <TenantHeader nome={org.nome} logoUrl={siteConfig?.logo_url ?? null} cor={cor} voltarHref={basePath || '/'} />

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
