import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
  const { record } = await req.json()

  // 顧客からのメッセージのみ処理
  if (record.sender_type !== 'customer') {
    return new Response('skip', { status: 200 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: app } = await supabase
    .from('applications')
    .select('*, clients(*)')
    .eq('id', record.application_id)
    .single()

  if (!app?.cs_email) return new Response('no cs_email', { status: 200 })

  const appUrl = Deno.env.get('NEXT_PUBLIC_APP_URL') ?? 'https://hojo.wasimil.jp'

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
    },
    body: JSON.stringify({
      from: `WASIMIL補助金ポータル <noreply@wasimil.jp>`,
      to: [app.cs_email],
      subject: `[チャット] ${app.clients.name} から新着メッセージ`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
          <h3 style="color: #1a1814;">${app.clients.name} から新着メッセージ</h3>
          <p style="color: #5a5650;">送信者: ${record.sender_name}</p>
          <blockquote style="border-left: 3px solid #c45c1a; margin: 16px 0; padding: 12px 16px; background: #fff8f0; color: #3a3730;">
            ${record.content}
          </blockquote>
          <a href="${appUrl}/applications/${record.application_id}"
             style="display: inline-block; background: #c45c1a; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            ポータルで返信する
          </a>
        </div>
      `,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Resend error:', err)
    return new Response(`Resend error: ${err}`, { status: 500 })
  }

  return new Response('ok', { status: 200 })
})
