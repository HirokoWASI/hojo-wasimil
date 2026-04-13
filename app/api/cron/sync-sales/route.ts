import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient as createSalesClient } from '@supabase/supabase-js'

const SALES_URL = process.env.SALES_SUPABASE_URL ?? 'https://bnqejljedwkmlkykdhcr.supabase.co'
const SALES_KEY = process.env.SALES_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJucWVqbGplZHdrbWxreWtkaGNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMTI5NDcsImV4cCI6MjA5MDc4ODk0N30.sYscNcRoIBFbITzMNIfE0bW15UHBhQ3hYcgrExdus0E'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('Authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createServiceClient()
  const sales = createSalesClient(SALES_URL, SALES_KEY)

  // 成約dealを取得
  const { data: deals } = await sales
    .from('deals')
    .select('id, facility_name, expected_mrr, initial_fee, room_count, notes, companies(name)')
    .eq('stage', '成約')
    .eq('is_closed', false)

  if (!deals?.length) return NextResponse.json({ synced: 0 })

  // 既に同期済みのdeal_idを取得
  const { data: existing } = await supabase
    .from('clients')
    .select('sales_deal_id')
    .not('sales_deal_id', 'is', null)

  const syncedIds = new Set((existing ?? []).map(c => c.sales_deal_id))
  const newDeals = deals.filter(d => !syncedIds.has(d.id))

  let synced = 0
  for (const deal of newDeals) {
    const companyName = ((deal.companies as unknown) as { name: string } | null)?.name ?? ''
    const clientName = deal.facility_name || companyName || '未設定'

    const { data: client } = await supabase
      .from('clients')
      .insert({ name: clientName, email: '', facility_name: deal.facility_name, room_count: deal.room_count, sales_deal_id: deal.id })
      .select()
      .single()

    if (client) {
      const quoteAmount = (deal.initial_fee ?? 0) + (deal.expected_mrr ?? 0) * 12
      await supabase.from('applications').insert({
        client_id: client.id,
        subsidy_type: 'デジタル化・AI導入補助金',
        subsidy_frame: '通常枠',
        status: '適格審査中',
        tool_name: 'WASIMIL',
        quote_amount: quoteAmount > 0 ? quoteAmount : null,
      })
      synced++
    }
  }

  return NextResponse.json({ synced, checked: deals.length })
}
