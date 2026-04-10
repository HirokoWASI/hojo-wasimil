import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(req: NextRequest) {
  // CRON_SECRET 認証
  const auth = req.headers.get('Authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createServiceClient()

  // 期限14日以内・未完了の案件を取得
  const { data: urgentApps, error } = await supabase
    .from('applications')
    .select('*, clients(email, name, contact_name)')
    .gte('deadline', new Date().toISOString().split('T')[0])
    .lte(
      'deadline',
      new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    )
    .not('status', 'in', '("採択済","不採択")')

  if (error) {
    console.error('Cron fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results = []

  for (const app of urgentApps ?? []) {
    // 未提出書類を確認
    const { data: pendingDocs } = await supabase
      .from('documents')
      .select('name')
      .eq('application_id', app.id)
      .in('status', ['未提出', '差し戻し'])

    const daysLeft = Math.ceil(
      (new Date(app.deadline!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )

    const pendingDocsList = (pendingDocs ?? []).map((d) => `・${d.name}`).join('\n')

    const subject = `【補助金申請】期限まで残り${daysLeft}日のお知らせ - ${app.subsidy_type}`
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #c45c1a; font-size: 18px;">${app.clients.name} ご担当者様</h2>
        <p style="color: #3a3730; line-height: 1.7;">
          <strong>${app.subsidy_type}</strong>の申請期限まで残り<strong style="color: #b83232;">${daysLeft}日</strong>となっています。
        </p>
        ${pendingDocs?.length ? `
        <div style="background: #fff8f0; border-left: 3px solid #c45c1a; padding: 16px; margin: 16px 0;">
          <p style="font-weight: bold; margin-bottom: 8px;">未提出・差し戻し書類:</p>
          <pre style="font-family: sans-serif; margin: 0; color: #5a5650;">${pendingDocsList}</pre>
        </div>
        ` : ''}
        <p style="color: #3a3730;">お早めにポータルよりご対応ください。</p>
        <hr style="border: none; border-top: 1px solid #e8e6e1; margin: 24px 0;" />
        <p style="font-size: 12px; color: #9b9890;">担当: ${app.cs_name ?? '株式会社AZOO'}</p>
      </div>
    `

    try {
      await resend.emails.send({
        from: `${process.env.RESEND_FROM_NAME ?? '株式会社AZOO'} <${process.env.RESEND_FROM_EMAIL ?? 'noreply@wasimil.jp'}>`,
        to: [app.clients.email],
        subject,
        html,
      })

      await supabase.from('email_logs').insert({
        application_id: app.id,
        type: 'deadline_alert',
        subject,
        to_email: app.clients.email,
        status: 'sent',
      })

      results.push({ clientName: app.clients.name, status: 'sent' })
    } catch (err: any) {
      console.error(`Failed to send alert for ${app.clients.name}:`, err)
      results.push({ clientName: app.clients.name, status: 'failed', error: err.message })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}
