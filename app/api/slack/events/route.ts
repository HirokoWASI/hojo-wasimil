import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const body = JSON.parse(rawBody)

  // Slack URL Verification チャレンジ
  if (body.type === 'url_verification') {
    return NextResponse.json({ challenge: body.challenge })
  }

  // HMAC-SHA256 署名検証
  const timestamp = req.headers.get('x-slack-request-timestamp')
  const slackSignature = req.headers.get('x-slack-signature')
  const signingSecret = process.env.SLACK_SIGNING_SECRET!

  if (!timestamp || !slackSignature) {
    return NextResponse.json({ error: '署名ヘッダーがありません' }, { status: 401 })
  }

  // リプレイ攻撃防止: 5分以上前のリクエストを拒否
  const reqTime = parseInt(timestamp, 10)
  if (Math.abs(Date.now() / 1000 - reqTime) > 300) {
    return NextResponse.json({ error: 'リクエストが古すぎます' }, { status: 401 })
  }

  const sig = createHmac('sha256', signingSecret)
    .update(`v0:${timestamp}:${rawBody}`)
    .digest('hex')

  if (`v0=${sig}` !== slackSignature) {
    return NextResponse.json({ error: '署名が無効です' }, { status: 401 })
  }

  if (body.type !== 'event_callback') {
    return NextResponse.json({ ok: true })
  }

  const event = body.event

  // メッセージイベントのみ処理
  if (event.type !== 'message') {
    return NextResponse.json({ ok: true })
  }

  // Bot自身のメッセージは無視
  if (event.bot_id || event.subtype) {
    return NextResponse.json({ ok: true })
  }

  const supabase = createServiceClient()

  // チャンネルから application_id を特定
  const channelId = event.channel
  const { data: channelInfo } = await supabase
    .from('applications')
    .select('id, cs_name')
    .eq('slack_channel', channelId)
    .single()

  if (!channelInfo) {
    // Slackチャンネル名（# prefix）でも検索
    const { data: byName } = await supabase
      .from('applications')
      .select('id, cs_name')
      .eq('slack_channel', `#${channelId}`)
      .single()

    if (!byName) {
      return NextResponse.json({ ok: true })
    }

    // messagesテーブルに保存
    await supabase.from('messages').insert({
      application_id: byName.id,
      sender_type: 'cs',
      sender_name: byName.cs_name ?? 'CS担当',
      content: event.text,
      from_slack: true,
      slack_ts: event.ts,
      slack_channel: channelId,
    })

    return NextResponse.json({ ok: true })
  }

  await supabase.from('messages').insert({
    application_id: channelInfo.id,
    sender_type: 'cs',
    sender_name: channelInfo.cs_name ?? 'CS担当',
    content: event.text,
    from_slack: true,
    slack_ts: event.ts,
    slack_channel: channelId,
  })

  return NextResponse.json({ ok: true })
}
