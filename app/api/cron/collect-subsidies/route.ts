import { NextRequest, NextResponse } from 'next/server'
import FirecrawlApp from '@mendable/firecrawl-js'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/server'

const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY ?? '' })
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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
  "eligibleExpenses": ["<対象経費1>", "<対象経費2>"],
  "requirements": ["<申請要件1>", "<申請要件2>"],
  "procedures": ["<手順1>", "<手順2>"],
  "requiredDocs": ["<必要書類1>"],
  "contactInfo": "<問い合わせ先>",
  "notes": ["<注意事項1>"],
  "summary": "<80字以内の概要>",
  "itRelated": <IT導入・DX関連か true/false>,
  "hotelRelated": <宿泊業・ホテル・旅館向けか true/false>
}`

export async function GET(req: NextRequest) {
  // CRON_SECRET 認証
  const auth = req.headers.get('Authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createServiceClient()
  const { data: sources } = await supabase
    .from('subsidy_sources')
    .select('*')
    .eq('active', true)

  if (!sources?.length) {
    return NextResponse.json({ message: 'No active sources' })
  }

  const results: { sourceId: string; status: string; name?: string }[] = []

  for (const source of sources) {
    try {
      // Firecrawl でページをスクレイプ
      const scraped = await firecrawl.scrape(source.url, {
        formats: ['markdown'],
      }) as { markdown?: string; success?: boolean }

      const content = scraped.markdown ?? ''
      if (!content || content.length < 100) {
        results.push({ sourceId: source.id, status: 'empty' })
        continue
      }

      // キーワードフィルタ（いずれか一致するか確認）
      const keywords: string[] = source.keywords ?? []
      const hasKeyword = keywords.length === 0 || keywords.some((kw: string) => content.includes(kw))
      if (!hasKeyword) {
        results.push({ sourceId: source.id, status: 'no_keyword_match' })
        continue
      }

      // Claude で構造化抽出
      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        system: EXTRACT_PROMPT,
        messages: [{ role: 'user', content: `URL: ${source.url}\n\n${content.slice(0, 10000)}` }],
      })

      const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        results.push({ sourceId: source.id, status: 'parse_error' })
        continue
      }

      const data = JSON.parse(jsonMatch[0])
      if (!data.found || !data.name) {
        results.push({ sourceId: source.id, status: 'not_found' })
      } else {
        // 同名のものが既にあれば updated_at 更新、なければ INSERT
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
        }
        results.push({ sourceId: source.id, status: 'ok', name: data.name })
      }

      // last_crawled_at 更新
      await supabase.from('subsidy_sources')
        .update({ last_crawled_at: new Date().toISOString() })
        .eq('id', source.id)

    } catch (e: unknown) {
      results.push({ sourceId: source.id, status: `error: ${e instanceof Error ? e.message : 'unknown'}` })
    }
  }

  return NextResponse.json({ collected: results.length, results })
}
