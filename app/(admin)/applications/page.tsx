import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Application } from '@/types/database'

const STATUS_COLORS: Record<string, string> = {
  '適格審査中': 'bg-yellow-100 text-yellow-700',
  '書類準備中': 'bg-blue-100 text-blue-700',
  '申請中': 'bg-purple-100 text-purple-700',
  '採択待ち': 'bg-orange-100 text-orange-700',
  '採択済': 'bg-green-100 text-green-700',
  '不採択': 'bg-neutral-100 text-neutral-600',
}

export default async function ApplicationsPage() {
  const supabase = createClient()

  const { data: applications } = await supabase
    .from('applications')
    .select('*, clients(name, email, contact_name)')
    .order('created_at', { ascending: false })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">申請案件一覧</h1>
        <span className="text-sm text-neutral-400">{applications?.length ?? 0}件</span>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500">顧客名</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500">補助金</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500">ステータス</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500">申請期限</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500">スコア</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500">担当者</th>
            </tr>
          </thead>
          <tbody>
            {(applications ?? []).map((app: Application & { clients?: { name: string; email: string } }) => (
              <tr
                key={app.id}
                className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors"
              >
                <td className="px-4 py-3">
                  <Link href={`/applications/${app.id}`} className="font-medium text-neutral-800 hover:text-accent">
                    {app.clients?.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-neutral-600 max-w-[200px] truncate">
                  {app.subsidy_type}
                  {app.subsidy_frame && (
                    <span className="ml-1 text-neutral-400">/ {app.subsidy_frame}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${STATUS_COLORS[app.status] ?? ''}`}>
                    {app.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-600">
                  {app.deadline
                    ? new Date(app.deadline).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  {app.score !== null ? (
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full"
                          style={{ width: `${app.score}%` }}
                        />
                      </div>
                      <span className="text-neutral-600">{app.score}</span>
                    </div>
                  ) : (
                    <span className="text-neutral-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-neutral-600">{app.cs_name ?? '—'}</td>
              </tr>
            ))}
            {!applications?.length && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-neutral-400">
                  申請案件はありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
