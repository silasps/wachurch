'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import type { Organization } from '@/types'
import { LICENCAS, PLANOS, getLicencaId, type LicencaId } from '@/lib/modulos'

export default function OrgAcoesForm({ org }: { org: Organization }) {
  const router = useRouter()
  const [plano, setPlano] = useState(org.plano)
  const [licenca, setLicenca] = useState<LicencaId>(getLicencaId(org))
  const [ativo, setAtivo] = useState(org.ativo)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function handleSave() {
    setLoading(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/superadmin/organizacoes/${org.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plano, ativo, licenca }),
      })
      if (!res.ok) throw new Error()
      setMsg('Salvo com sucesso!')
      router.refresh()
    } catch {
      setMsg('Erro ao salvar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Mobile: 2 colunas. Desktop: linha horizontal */}
      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-row sm:items-end sm:gap-4">
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs text-gray-400 mb-1">Licença</label>
          <select
            value={licenca}
            onChange={e => setLicenca(e.target.value as LicencaId)}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {(Object.keys(LICENCAS) as LicencaId[]).map(id => (
              <option key={id} value={id} className="bg-gray-900">{LICENCAS[id].label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Plano</label>
          <select
            value={plano}
            onChange={e => setPlano(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {PLANOS.map(p => (
              <option key={p.value} value={p.value} className="bg-gray-900">{p.label}</option>
            ))}
            {!PLANOS.some(p => p.value === plano) && (
              <option value={plano} className="bg-gray-900">{plano}</option>
            )}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Status</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAtivo(true)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${ativo ? 'bg-emerald-600 text-white' : 'bg-white/10 text-gray-400 hover:bg-white/20'}`}
            >
              Ativa
            </button>
            <button
              type="button"
              onClick={() => setAtivo(false)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${!ativo ? 'bg-red-700 text-white' : 'bg-white/10 text-gray-400 hover:bg-white/20'}`}
            >
              Inativa
            </button>
          </div>
        </div>
      </div>

      {/* Salvar — largura total no mobile, auto no desktop */}
      <div className="sm:flex sm:items-center sm:gap-4">
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500 transition disabled:opacity-50"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          Salvar
        </button>

        {msg && (
          <p className={`text-sm mt-2 sm:mt-0 ${msg.includes('Erro') ? 'text-red-400' : 'text-emerald-400'}`}>{msg}</p>
        )}
      </div>
    </div>
  )
}
