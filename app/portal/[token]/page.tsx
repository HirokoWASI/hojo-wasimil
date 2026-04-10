import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { PortalClient } from './PortalClient'

interface Props {
  params: { token: string }
}

export default async function PortalPage({ params }: Props) {
  const supabase = createServiceClient()

  // トークンでクライアントを検索
  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('portal_token', params.token)
    .single()

  if (error || !client) {
    return notFound()
  }

  // トークン期限チェック
  if (client.token_expires_at && new Date(client.token_expires_at) < new Date()) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="card max-w-md w-full p-8 text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-neutral-800 mb-2">リンクの有効期限が切れました</h1>
          <p className="text-sm text-neutral-500 mb-6">
            このポータルURLの有効期限が過ぎています。
            <br />担当者までご連絡ください。
          </p>
          <a
            href={`mailto:${client.email}`}
            className="btn-primary inline-block"
          >
            担当者に連絡する
          </a>
        </div>
      </div>
    )
  }

  // 申請案件一覧を取得
  const { data: applications } = await supabase
    .from('applications')
    .select('*')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })

  // 書類一覧を取得（全案件）
  const appIds = (applications ?? []).map((a) => a.id)
  const { data: documents } = appIds.length > 0
    ? await supabase
        .from('documents')
        .select('*')
        .in('application_id', appIds)
        .order('updated_at', { ascending: false })
    : { data: [] }

  // 最新のAI診断ログ
  const { data: screeningLogs } = appIds.length > 0
    ? await supabase
        .from('screening_logs')
        .select('*')
        .in('application_id', appIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  return (
    <PortalClient
      client={client}
      applications={applications ?? []}
      documents={documents ?? []}
      screeningLogs={screeningLogs ?? []}
    />
  )
}
