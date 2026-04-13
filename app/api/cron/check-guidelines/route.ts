import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const PAGES_TO_CHECK = [
  'https://it-shien.smrj.go.jp/applicant/subsidy/normal/',
  'https://it-shien.smrj.go.jp/applicant/subsidy/digitalbase/',
  'https://it-shien.smrj.go.jp/applicant/subsidy/security/',
]

export async function GET(req: NextRequest) {
  const auth = req.headers.get('Authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createServiceClient()
  const changes: string[] = []

  for (const url of PAGES_TO_CHECK) {
    try {
      const res = await fetch(url)
      const html = await res.text()
      // ページ内容のハッシュを生成
      const encoder = new TextEncoder()
      const data = encoder.encode(html)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')

      // 前回のハッシュと比較
      const { data: existing } = await supabase
        .from('subsidy_sources')
        .select('id, keywords')
        .eq('url', url)
        .single()

      if (existing) {
        const prevHash = (existing.keywords ?? [])[0] ?? ''
        if (prevHash !== hash) {
          changes.push(url)
          await supabase.from('subsidy_sources').update({ keywords: [hash], last_crawled_at: new Date().toISOString() }).eq('id', existing.id)
        }
      }
    } catch { /* skip */ }
  }

  // Slack通知（変更があった場合）
  if (changes.length > 0 && process.env.SLACK_BOT_TOKEN) {
    try {
      await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: '#portal-updates', text: `⚠️ 公募要領ページに変更を検知しました:\n${changes.join('\n')}\n\nguidelines_jsonの更新が必要な可能性があります。` }),
      })
    } catch { /* ignore */ }
  }

  return NextResponse.json({ checked: PAGES_TO_CHECK.length, changes: changes.length, urls: changes })
}
