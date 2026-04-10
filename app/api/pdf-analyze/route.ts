import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  let pdfBase64: string
  let mediaType = 'application/pdf' as const

  const contentType = req.headers.get('content-type') ?? ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'fileが必要です' }, { status: 400 })
    }
    const buffer = await file.arrayBuffer()
    pdfBase64 = Buffer.from(buffer).toString('base64')
  } else {
    const body = await req.json()
    if (body.url) {
      const res = await fetch(body.url)
      if (!res.ok) throw new Error(`PDF取得失敗: ${res.status}`)
      const buffer = await res.arrayBuffer()
      pdfBase64 = Buffer.from(buffer).toString('base64')
    } else if (body.base64) {
      pdfBase64 = body.base64
    } else {
      return NextResponse.json({ error: 'url または base64 が必要です' }, { status: 400 })
    }
  }

  const systemPrompt = `あなたは補助金申請の専門家です。
提供されたPDFは補助金の公募要項です。以下のJSON形式のみで回答してください。

{
  "subsidyName": "<補助金名>",
  "frames": ["<申請枠1>", "<申請枠2>"],
  "subsidyRates": {"<枠名>": "<補助率>"},
  "maxAmounts": {"<枠名>": "<最大補助額>"},
  "deadline": "<申請期限 YYYY-MM-DD または '不明'>",
  "requiredDocs": ["<書類1>", "<書類2>"],
  "wasmilCompatibility": "<WASSIMILのSaaSの適合性評価>",
  "summary": "<200字以内の概要>"
}`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: pdfBase64,
              },
            } as any,
            {
              type: 'text',
              text: 'この補助金要項を解析してください。',
            },
          ],
        },
      ],
      system: systemPrompt,
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    const result = JSON.parse(content.text)
    return NextResponse.json({ result })
  } catch (err: any) {
    console.error('PDF analyze error:', err)
    return NextResponse.json({ error: err.message ?? '解析エラー' }, { status: 500 })
  }
}
