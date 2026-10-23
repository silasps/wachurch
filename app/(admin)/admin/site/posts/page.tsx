import { requireRole } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { resolveOrgId } from '@/lib/org'
import Link from 'next/link'
import { Plus, Eye, EyeOff } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { SitePost } from '@/types'

export default async function PostsPage() {
  const { profile } = await requireRole(['admin', 'superadmin'])
  // Org efetiva (a do perfil ou a simulada pelo superadmin) — service client com filtro explícito por org
  const orgId = await resolveOrgId(profile)
  const supabase = await createServiceClient()

  const { data: posts } = await supabase
    .from('site_posts')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <div>
          <a href="/admin/site" className="text-sm text-gray-400 hover:text-gray-600 mb-1 inline-block">← Site Público</a>
          <h1 className="text-2xl font-bold text-gray-900">Projetos e Notícias</h1>
        </div>
        <Link href="/admin/site/posts/novo"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
          <Plus size={16} />Nova publicação
        </Link>
      </div>

      <div className="space-y-3">
        {!posts?.length ? (
          <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
            <p className="text-gray-400 text-sm">Nenhuma publicação ainda.</p>
            <Link href="/admin/site/posts/novo" className="inline-block mt-3 text-blue-600 text-sm font-medium">
              Criar primeira publicação →
            </Link>
          </div>
        ) : (
          posts.map((post: SitePost) => (
            <div key={post.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
              {post.imagem_url && (
                <img src={post.imagem_url} alt={post.titulo} className="w-14 h-14 rounded-lg object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-gray-900 truncate">{post.titulo}</p>
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full capitalize shrink-0">{post.categoria}</span>
                </div>
                <p className="text-xs text-gray-400">{formatDate(post.created_at)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {post.publicado ? (
                  <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    <Eye size={12} /> Publicado
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                    <EyeOff size={12} /> Rascunho
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
