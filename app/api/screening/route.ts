import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const body = await req.json()
  const { clientName, employees, revenue, hasHistory, currentSystem, note, applicationId } = body

  if (!clientName) {
    return NextResponse.json({ error: 'clientName は必須です' }, { status: 400 })
  }

  const systemPrompt = `あなたはIT導入補助金の専門家アドバイザーです。
WASSIMILはIT導入支援事業者として登録済みであり、提供するSaaSツールは補助金対象として認定されています。
顧客（ホテル・旅館等）のIT導入補助金2025の適格性を診断し、必ず以下のJSON形式のみで回答してください。
JSON以外のテキストは出力しないでください。

{
  "score": <0-100の整数>,
  "eligible": <true/false>,
  "frame": "<推奨申請枠>",
  "maxAmount": "<最大補助額>",
  "subsidyRate": "<補助率>",
  "reasons": ["<理由1>", "<理由2>", "<理由3>"],
  "requiredDocs": ["<書類1>", "<書類2>", ...],
  "risks": ["<注意点1>"],
  "nextAction": "<次のアクション>"
}`

  const userMessage = `以下の顧客情報を基にIT導入補助金2025の適格性を診断してください。

顧客名: ${clientName}
従業員数: ${employees ?? '不明'}名
年商: ${revenue ? `${revenue}万円` : '不明'}
補助金申請歴: ${hasHistory ?? '不明'}
現在のシステム: ${currentSystem ?? '特になし'}
備考: ${note ?? 'なし'}`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
      system: systemPrompt,
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    const result = JSON.parse(content.text)

    // screening_logs に保存
    const supabase = createServiceClient()
    const { data: log } = await supabase
      .from('screening_logs')
      .insert({
        application_id: applicationId ?? null,
        client_name: clientName,
        score: result.score,
        eligible: result.eligible,
        frame: result.frame,
        result,
      })
      .select()
      .single()

    // 案件がある場合はスコアと ai_result を更新
    if (applicationId) {
      await supabase
        .from('applications')
        .update({
          score: result.score,
          subsidy_frame: result.frame,
          ai_result: result,
        })
        .eq('id', applicationId)
    }

    return NextResponse.json({ result, logId: log?.id })
  } catch (err: any) {
    console.error('Screening error:', err)
    return NextResponse.json({ error: err.message ?? '診断エラー' }, { status: 500 })
  }
}
