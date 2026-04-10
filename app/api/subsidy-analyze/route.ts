import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { url } = await req.json()
  if (!url) {
    return NextResponse.json({ error: 'url は必須です' }, { status: 400 })
  }

  // URLのコンテンツを取得
  let pageText = ''
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SubsidyBot/1.0)' },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()
    // HTMLタグを除去してテキストのみ抽出（簡易）
    pageText = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s{3,}/g, '\n')
      .trim()
      .slice(0, 12000) // トークン節約
  } catch (e: unknown) {
    return NextResponse.json({ error: `URLの取得に失敗しました: ${e instanceof Error ? e.message : 'Unknown error'}` }, { status: 422 })
  }

  const systemPrompt = `あなたは日本の補助金・助成金制度の専門家です。
提供されたウェブページのテキストから補助金情報を抽出し、必ず以下のJSON形式のみで回答してください。
JSON以外のテキストは出力しないでください。情報が見つからない場合は null を使用してください。

{
  "name": "<補助金・助成金の正式名称>",
  "organizer": "<主管省庁・自治体・機関>",
  "targetBusiness": "<対象となる事業者・業種>",
  "subsidyAmount": "<補助金額（上限等）>",
  "subsidyRate": "<補助率>",
  "applicationStart": "<申請受付開始日>",
  "applicationEnd": "<申請締切日>",
  "eligibleExpenses": ["<対象経費1>", "<対象経費2>"],
  "requirements": ["<申請要件1>", "<申請要件2>", "<申請要件3>"],
  "procedures": ["<手順1>", "<手順2>", "<手順3>"],
  "requiredDocs": ["<必要書類1>", "<必要書類2>"],
  "contactInfo": "<問い合わせ先>",
  "notes": ["<注意事項1>", "<注意事項2>"],
  "summary": "<100字以内の概要>",
  "itRelated": <IT導入・DX関連か true/false>,
  "hotelRelated": <宿泊業・ホテル・旅館向けか true/false>
}`

  const result = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: 'user', content: `以下のウェブページから補助金情報を抽出してください:\n\nURL: ${url}\n\n--- ページ内容 ---\n${pageText}` }],
  })

  const raw = result.content[0].type === 'text' ? result.content[0].text : ''
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return NextResponse.json({ error: '解析結果のJSON抽出に失敗しました' }, { status: 500 })
  }

  try {
    const data = JSON.parse(jsonMatch[0])
    return NextResponse.json({ success: true, data, url })
  } catch {
    return NextResponse.json({ error: 'JSON解析に失敗しました' }, { status: 500 })
  }
}
