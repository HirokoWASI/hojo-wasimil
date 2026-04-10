import { NextRequest, NextResponse } from 'next/server'
import FirecrawlApp from '@mendable/firecrawl-js'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const EXTRACT_PROMPT = `あなたは日本の補助金・助成金の専門家です。
提供されたウェブページのテキストから補助金情報を抽出し、必ず以下のJSON形式のみで回答してください。
補助金・助成金の情報が見つからない場合は {"found": false} のみを返してください。
JSON以外のテキストは出力しないでください。

{
  "found": true,
  "name": "<補助金・助成金の正式名称>",
  "organizer": "<主管省庁・自治体・機関>",
  "targetBusiness": "<対象となる事業者・業種>",
  "subsidyAmount": "<補助金額（上限等）>",
  "subsidyRate": "<補助率>",
  "applicationStart": "<申請受付開始日>",
  "applicationEnd": "<申請締切日>",
  "eligibleExpenses": ["<対象経費1>"],
  "requirements": ["<申請要件1>"],
  "procedures": ["<手順1>"],
  "requiredDocs": ["<必要書類1>"],
  "contactInfo": "<問い合わせ先>",
  "notes": ["<注意事項1>"],
  "summary": "<80字以内の概要>",
  "itRelated": <true/false>,
  "hotelRelated": <true/false>
}`

// sourceId 指定 or 全ソース
export async function POST(req: NextRequest) {
  const { sourceId } = await req.json().catch(() => ({}))

  if (!process.env.FIRECRAWL_API_KEY) {
    return NextResponse.json({ error: 'FIRECRAWL_API_KEY が設定されていません' }, { status: 500 })
  }

  const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY })
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const supabase = createClient()

  const query = supabase.from('subsidy_sources').select('*').eq('active', true)
  if (sourceId) query.eq('id', sourceId)
  const { data: sources, error: srcErr } = await query.order('created_at')
  if (srcErr || !sources?.length) {
    return NextResponse.json({ error: srcErr?.message ?? 'ソースが見つかりません' }, { status: 404 })
  }

  const results: { sourceId: string; sourceName: string; status: string; name?: string }[] = []

  for (const source of sources) {
    try {
      const scraped = await firecrawl.scrape(source.url, { formats: ['markdown'] }) as { markdown?: string }
      const content = scraped.markdown ?? ''
      if (!content || content.length < 100) {
        results.push({ sourceId: source.id, sourceName: source.name, status: 'ページ内容なし' })
        continue
      }

      const keywords: string[] = source.keywords ?? []
      const hasKeyword = keywords.length === 0 || keywords.some((kw: string) => content.includes(kw))
      if (!hasKeyword) {
        results.push({ sourceId: source.id, sourceName: source.name, status: 'キーワード不一致' })
        continue
      }

      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        system: EXTRACT_PROMPT,
        messages: [{ role: 'user', content: `URL: ${source.url}\n\n${content.slice(0, 10000)}` }],
      })

      const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        results.push({ sourceId: source.id, sourceName: source.name, status: '解析失敗' })
        continue
      }

      const data = JSON.parse(jsonMatch[0])
      if (!data.found || !data.name) {
        results.push({ sourceId: source.id, sourceName: source.name, status: '補助金情報なし' })
      } else {
        const { data: existing } = await supabase
          .from('collected_subsidies')
          .select('id')
          .eq('source_id', source.id)
          .eq('name', data.name)
          .single()

        if (existing) {
          await supabase.from('collected_subsidies').update({
            organizer: data.organizer, target_business: data.targetBusiness,
            subsidy_amount: data.subsidyAmount, subsidy_rate: data.subsidyRate,
            application_start: data.applicationStart, application_end: data.applicationEnd,
            eligible_expenses: data.eligibleExpenses ?? [], requirements: data.requirements ?? [],
            procedures: data.procedures ?? [], required_docs: data.requiredDocs ?? [],
            contact_info: data.contactInfo, notes: data.notes ?? [],
            summary: data.summary, it_related: data.itRelated, hotel_related: data.hotelRelated,
            updated_at: new Date().toISOString(),
          }).eq('id', existing.id)
          results.push({ sourceId: source.id, sourceName: source.name, status: '更新', name: data.name })
        } else {
          await supabase.from('collected_subsidies').insert({
            source_id: source.id, source_url: source.url,
            name: data.name, organizer: data.organizer, target_business: data.targetBusiness,
            subsidy_amount: data.subsidyAmount, subsidy_rate: data.subsidyRate,
            application_start: data.applicationStart, application_end: data.applicationEnd,
            eligible_expenses: data.eligibleExpenses ?? [], requirements: data.requirements ?? [],
            procedures: data.procedures ?? [], required_docs: data.requiredDocs ?? [],
            contact_info: data.contactInfo, notes: data.notes ?? [],
            summary: data.summary, it_related: data.itRelated, hotel_related: data.hotelRelated,
            is_new: true,
          })
          results.push({ sourceId: source.id, sourceName: source.name, status: '新規追加', name: data.name })
        }

        await supabase.from('subsidy_sources')
          .update({ last_crawled_at: new Date().toISOString() })
          .eq('id', source.id)
      }
    } catch (e: unknown) {
      results.push({ sourceId: source.id, sourceName: source.name, status: `エラー: ${e instanceof Error ? e.message : 'unknown'}` })
    }
  }

  return NextResponse.json({ success: true, processed: sources.length, results })
}
