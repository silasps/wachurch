import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { Lock } from 'lucide-react'
import { resolveOrgFromHost, getSiteConfig } from '@/lib/tenant'
import { orgTemModulo } from '@/lib/modulos'
import { getMembresiaConfig } from '@/lib/membros-server'
import { contatoPrivacidade, type MembresiaConfigPublica } from '@/lib/membros'
import { TenantHeader } from '../_components/tenant-header'
import CadastroMembroWizard from './cadastro-membro-wizard'
import { coresDoSite } from '@/lib/cores'

async function getTenantIgreja() {
  const host = (await headers()).get('host') || 'localhost'
  const tenant = await resolveOrgFromHost(host)
  if (!tenant || !orgTemModulo(tenant.org, 'igreja')) return null
  return tenant.org
}

export async function generateMetadata(): Promise<Metadata> {
  const org = await getTenantIgreja()
  return {
    title: org ? `Cadastro de membros · ${org.nome}` : 'Cadastro de membros',
    robots: { index: false },
  }
}

export default async function CadastroMembroPage() {
  const org = await getTenantIgreja()
  if (!org) notFound()

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
      <TenantHeader nome={org.nome} logoUrl={siteConfig?.logo_url ?? null} cor={cor} />

      <div className="max-w-xl mx-auto px-4 py-6 sm:py-10">
        {config.formulario_aberto ? (
          <CadastroMembroWizard igreja={org.nome} orgSlug={org.slug} primaryColor={cor} config={configPublica} />
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
