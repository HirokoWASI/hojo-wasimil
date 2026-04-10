import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const DOC_TEMPLATES: Record<string, string> = {
  'IT導入計画書': `以下の情報を基に、IT導入補助金申請用の「IT導入計画書」のドラフトを作成してください。
具体的な数値と根拠を含め、審査員を説得できる内容にしてください。

【必須項目】
1. 導入するITツールの概要（WASSIMILの機能）
2. 現状の業務課題と問題点
3. IT導入による解決策と期待効果
4. 導入スケジュール（月次）
5. 賃金引上げ計画（デジタル化基盤導入枠の場合）
6. セキュリティ対策`,
  '事業計画書': `IT導入補助金の事業計画書を作成してください。
以下の要素を含めた説得力のある計画書を作成してください：

【必須項目】
1. 事業概要と現状分析
2. 経営課題の特定
3. IT導入の目的と目標数値
4. 期待される効果（定量的指標含む）
5. 導入後の運用体制`,
}

export async function POST(req: NextRequest) {
  const { applicationId, docType } = await req.json()

  if (!applicationId || !docType) {
    return NextResponse.json({ error: 'applicationId と docType が必要です' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: app } = await supabase
    .from('applications')
    .select('*, clients(*)')
    .eq('id', applicationId)
    .single()

  if (!app) {
    return NextResponse.json({ error: '案件が見つかりません' }, { status: 404 })
  }

  const template = DOC_TEMPLATES[docType] ?? `${docType}のドラフトを作成してください。`

  const contextInfo = `
【顧客情報】
- 顧客名: ${app.clients.name}
- 補助金: ${app.subsidy_type}
- 申請枠: ${app.subsidy_frame ?? '未設定'}
- AIスコア: ${app.score ?? '未診断'}
- AI診断枠: ${app.ai_result?.frame ?? '未診断'}
`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      system: `あなたはIT導入補助金申請の専門家です。
ホテル・旅館向けのシステム（WASSIMIL）の導入計画書を作成します。
WASSIMILはホテル予約・フロント業務・顧客管理を一元化するSaaSです。
実用的で審査に通りやすい書類を日本語で作成してください。`,
      messages: [
        {
          role: 'user',
          content: `${contextInfo}\n\n${template}`,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response')

    return NextResponse.json({ draft: content.text, docType })
  } catch (err: any) {
    console.error('Draft generation error:', err)
    return NextResponse.json({ error: err.message ?? '生成エラー' }, { status: 500 })
  }
}
