import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
  const { record, old_record, type } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: app } = await supabase
    .from('applications')
    .select('*, clients(*)')
    .eq('id', record.application_id)
    .single()

  if (!app) return new Response('app not found', { status: 404 })

  const channel = app.slack_channel
  if (!channel) return new Response('no slack channel', { status: 200 })

  let message = ''

  if (type === 'INSERT') {
    message = `📄 *${app.clients.name}* から書類が提出されました\n書類名: ${record.name}\n担当: ${app.cs_name ?? 'AZOO'}`
  } else if (type === 'UPDATE') {
    if (record.status === '差し戻し' && old_record?.status !== '差し戻し') {
      message = `↩️ *${app.clients.name}* への差し戻しが設定されました\n書類名: ${record.name}\nコメント: ${record.note ?? ''}`
    } else if (record.status === '承認済' && old_record?.status !== '承認済') {
      message = `✅ *${app.clients.name}* の書類を承認しました\n書類名: ${record.name}`
    }
  }

  if (!message) return new Response('no action', { status: 200 })

  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${Deno.env.get('SLACK_BOT_TOKEN')}`,
    },
    body: JSON.stringify({ channel, text: message }),
  })

  const result = await res.json()
  if (!result.ok) {
    console.error('Slack API error:', result.error)
    return new Response(`Slack error: ${result.error}`, { status: 500 })
  }

  return new Response('ok', { status: 200 })
})
