'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Building2, CheckCircle2, XCircle } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { formatDate } from '@/lib/utils'
import type { Organization } from '@/types'
import { LICENCAS, getLicencaId } from '@/lib/modulos'
import { maskCnpj } from '@/lib/mascaras'
import OrgForm from './org-form'

export default function OrganizacoesList({ orgs }: { orgs: Organization[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  function handleSuccess() {
    setOpen(false)
    router.refresh()
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Organizações</h1>
          <p className="text-gray-400 text-sm mt-1">{orgs?.length ?? 0} organizações cadastradas</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500 transition"
        >
          <Plus size={16} />
          Nova organização
        </button>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden overflow-x-auto">
        {!orgs?.length ? (
          <div className="py-16 text-center text-gray-500">
            <Building2 size={40} className="mx-auto mb-3 opacity-30" />
            <p>Nenhuma organização cadastrada ainda.</p>
            <button
              onClick={() => setOpen(true)}
              className="inline-block mt-4 text-blue-400 hover:text-blue-300 text-sm"
            >
              Criar a primeira organização →
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 text-xs uppercase tracking-wide">
                <th className="px-6 py-4 text-left font-medium">Organização</th>
                <th className="px-6 py-4 text-left font-medium">Slug</th>
                <th className="px-6 py-4 text-left font-medium">Licença</th>
                <th className="px-6 py-4 text-left font-medium">Plano</th>
                <th className="px-6 py-4 text-left font-medium">Status</th>
                <th className="px-6 py-4 text-left font-medium">Criada em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {orgs.map((org: Organization) => (
                <tr key={org.id} className="hover:bg-white/5 transition">
                  <td className="px-6 py-4">
                    <Link href={`/superadmin/organizacoes/${org.id}`} className="flex items-center gap-3 group">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <span className="text-xs font-bold text-blue-400">
                          {org.nome.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-white group-hover:text-blue-400 transition">{org.nome}</p>
                        {org.cnpj && <p className="text-xs text-gray-500">{maskCnpj(org.cnpj)}</p>}
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-400">{org.slug}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${org.tipo === 'igreja' ? 'bg-violet-500/20 text-violet-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                      {LICENCAS[getLicencaId(org)].label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 bg-white/10 rounded-full text-xs capitalize">
                      {org.plano}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {org.ativo ? (
                      <span className="flex items-center gap-1.5 text-emerald-400 text-xs">
                        <CheckCircle2 size={14} /> Ativa
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-red-400 text-xs">
                        <XCircle size={14} /> Inativa
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">{formatDate(org.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Nova Organização"
        description="Crie uma nova organização na plataforma e configure o primeiro administrador."
      >
        <OrgForm onSuccess={handleSuccess} onCancel={() => setOpen(false)} />
      </Modal>
    </div>
  )
}
