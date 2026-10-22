import { Lock } from 'lucide-react'
import { getSiteConfig } from '@/lib/tenant'
import { getMembresiaConfig } from '@/lib/membros-server'
import { contatoPrivacidade, type MembresiaConfigPublica } from '@/lib/membros'
import { coresDoSite } from '@/lib/cores'
import type { Organization } from '@/types'
import { TenantHeader } from '../_components/tenant-header'
import CadastroMembroWizard from './cadastro-membro-wizard'

// Usada em /cadastro (host do tenant) e em /s/[slug]/cadastro (qualquer host).
// basePath: prefixo dos links internos ('' ou '/s/<slug>')
export default async function CadastroView({ org, basePath = '' }: { org: Organization; basePath?: string }) {
  const [siteConfig, config] = await Promise.all([getSiteConfig(org.id), getMembresiaConfig(org.id)])
  const cor = coresDoSite(siteConfig).primary

  // Só os campos que podem ir para o navegador
  const configPublica: MembresiaConfigPublica = {
    formulario_aberto: config.formulario_aberto,
    curso_nome: config.curso_nome,
    curso_descricao: config.curso_descricao,
    curso_caminhos: config.curso_caminhos,
    texto_aclamacao: config.texto_aclamacao,
    texto_transferencia: config.texto_transferencia,
    texto_batismo: config.texto_batismo,
    contato_privacidade: contatoPrivacidade(config, org),
    mensagem_sucesso: config.mensagem_sucesso,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TenantHeader nome={org.nome} logoUrl={siteConfig?.logo_url ?? null} cor={cor} voltarHref={basePath || '/'} />

      <div className="max-w-xl mx-auto px-4 py-6 sm:py-10">
        {config.formulario_aberto ? (
          <CadastroMembroWizard igreja={org.nome} orgSlug={org.slug} primaryColor={cor} config={configPublica} basePath={basePath} />
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <Lock size={40} className="mx-auto mb-4 text-gray-300" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Cadastro fechado no momento</h2>
            <p className="text-base text-gray-600">
              Procure a secretaria da igreja para fazer ou atualizar seu cadastro.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
