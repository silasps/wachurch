import { createServiceClient } from '@/lib/supabase-server'
import { formatDate } from '@/lib/utils'
import type { Profile, Organization } from '@/types'
import { AREA_LABELS, areasDoUsuario, modulosDaOrg } from '@/lib/modulos'

export default async function UsuariosPage() {
  const supabase = await createServiceClient()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*, organizations(nome, slug, modulos)')
    .order('created_at', { ascending: false })

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Usuários</h1>
        <p className="text-gray-400 text-sm mt-1">{profiles?.length ?? 0} usuários em toda a plataforma</p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-gray-400 text-xs uppercase tracking-wide">
              <th className="px-5 py-4 text-left font-medium">Usuário</th>
              <th className="px-5 py-4 text-left font-medium">Organização</th>
              <th className="px-5 py-4 text-left font-medium">Role</th>
              <th className="px-5 py-4 text-left font-medium">Áreas</th>
              <th className="px-5 py-4 text-left font-medium">Status</th>
              <th className="px-5 py-4 text-left font-medium">Cadastrado em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {profiles?.map((p: Profile & { organizations: Pick<Organization, 'nome' | 'slug' | 'modulos'> | null }) => (
              <tr key={p.id} className="hover:bg-white/5 transition">
                <td className="px-5 py-3">
                  <p className="font-medium text-white">{p.nome}</p>
                  <p className="text-xs text-gray-500">{p.email}</p>
                </td>
                <td className="px-5 py-3">
                  {p.organizations ? (
                    <span className="text-sm text-gray-300">{p.organizations.nome}</span>
                  ) : (
                    <span className="text-xs text-gray-600 italic">— plataforma —</span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    p.role === 'superadmin' ? 'bg-purple-500/20 text-purple-400' :
                    p.role === 'admin' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-white/10 text-gray-300'
                  }`}>{p.role}</span>
                </td>
                <td className="px-5 py-3">
                  {p.organizations ? (() => {
                    // Igreja / Projeto Social / as duas — licença da org ∩ áreas do usuário
                    const areas = areasDoUsuario(p, p.organizations)
                    const texto = areas.length > 1 && areas.length === modulosDaOrg(p.organizations).length
                      ? 'Igreja + Projeto Social'
                      : areas.map(a => AREA_LABELS[a]).join(', ') || '—'
                    return <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500/15 text-amber-300 whitespace-nowrap">{texto}</span>
                  })() : <span className="text-xs text-gray-600">—</span>}
                </td>
                <td className="px-5 py-3">
                  <span className={`text-xs ${p.ativo ? 'text-emerald-400' : 'text-red-400'}`}>
                    {p.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-500 text-xs">{formatDate(p.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
