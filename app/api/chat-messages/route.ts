import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN ?? ''

export async function GET(req: NextRequest) {
  const applicationId = req.nextUrl.searchParams.get('applicationId')
  if (!applicationId) return NextResponse.json([], { status: 200 })

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: true })

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const { applicationId, content, senderType, senderName } = await req.json()
  if (!applicationId || !content) {
    return NextResponse.json({ error: 'missing params' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // メッセージ保存
  const { data, error } = await supabase
    .from('messages')
    .insert({
      application_id: applicationId,
      sender_type: senderType ?? 'cs',
      sender_name: senderName ?? 'CS',
      content,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Slack連携: アプリケーションのslack_channelに投稿
  if (SLACK_BOT_TOKEN) {
    try {
      const { data: app } = await supabase
        .from('applications')
        .select('slack_channel, clients(name)')
        .eq('id', applicationId)
        .single()

      const channel = app?.slack_channel
      if (channel) {
        const clientName = ((app.clients as unknown) as { name: string } | null)?.name ?? ''
        const prefix = senderType === 'customer' ? `[${clientName}] ${senderName}` : `[CS] ${senderName}`
        await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ channel, text: `${prefix}: ${content}` }),
        })
      }
    } catch {
      // Slack投稿失敗してもメッセージ保存は成功しているのでエラーにしない
    }
  }

  return NextResponse.json(data)
}
