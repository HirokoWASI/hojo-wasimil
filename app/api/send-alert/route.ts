import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { applicationId, type, subject, body: emailBody } = body

  if (!applicationId || !type || !subject || !emailBody) {
    return NextResponse.json({ error: '必須パラメータが不足しています' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: app, error: appError } = await supabase
    .from('applications')
    .select('*, clients(email, name)')
    .eq('id', applicationId)
    .single()

  if (appError || !app) {
    return NextResponse.json({ error: '案件が見つかりません' }, { status: 404 })
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `${process.env.RESEND_FROM_NAME ?? '株式会社AZOO'} <${process.env.RESEND_FROM_EMAIL ?? 'noreply@wasimil.jp'}>`,
      to: [app.clients.email],
      replyTo: app.cs_email ?? undefined,
      subject,
      html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <pre style="white-space: pre-wrap; font-family: sans-serif; line-height: 1.7; color: #3a3730;">${emailBody}</pre>
        <hr style="border: none; border-top: 1px solid #e8e6e1; margin: 24px 0;" />
        <p style="font-size: 12px; color: #9b9890;">
          担当: ${app.cs_name ?? '株式会社AZOO'}<br />
          ${app.cs_email ?? ''}
        </p>
      </div>`,
    })

    if (error) throw error

    // メールログ記録
    await supabase.from('email_logs').insert({
      application_id: applicationId,
      type,
      subject,
      to_email: app.clients.email,
      status: 'sent',
    })

    return NextResponse.json({ success: true, id: data?.id })
  } catch (err: any) {
    console.error('Resend error:', err)
    return NextResponse.json({ error: err.message ?? '送信エラー' }, { status: 500 })
  }
}
