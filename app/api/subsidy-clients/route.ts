import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient as createSalesClient } from '@supabase/supabase-js'

const SALES_SUPABASE_URL = process.env.SALES_SUPABASE_URL ?? 'https://bnqejljedwkmlkykdhcr.supabase.co'
const SALES_SUPABASE_KEY = process.env.SALES_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJucWVqbGplZHdrbWxreWtkaGNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMTI5NDcsImV4cCI6MjA5MDc4ODk0N30.sYscNcRoIBFbITzMNIfE0bW15UHBhQ3hYcgrExdus0E'

const REQUIRED_DOCS = [
  '履歴事項全部証明書',
  '法人税納税証明書',
  '事業計画書',
  '見積書（AZOO発行）',
  'gBizIDプライム確認',
]

async function createRequiredDocs(supabase: ReturnType<typeof createServiceClient>, applicationId: string) {
  await supabase.from('documents').insert(
    REQUIRED_DOCS.map(name => ({
      application_id: applicationId,
      name,
      required: true,
      status: '未提出',
    }))
  )
}

// GET: Sales Pipeline の deals を取得（同期候補）
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('mode')

  if (mode === 'sales-deals') {
    if (!SALES_SUPABASE_URL || !SALES_SUPABASE_KEY) {
      return NextResponse.json({ error: 'Sales Pipeline 環境変数が未設定です' }, { status: 500 })
    }
    const sales = createSalesClient(SALES_SUPABASE_URL, SALES_SUPABASE_KEY)
    const { data: deals, error } = await sales
      .from('deals')
      .select('id, facility_name, stage, expected_mrr, initial_fee, room_count, notes, company_id, companies(name)')
      .in('stage', ['SQL確度A', 'SQL確度B', '成約'])
      .eq('is_closed', false)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // 既に同期済みの deal_id を取得
    const supabase = createServiceClient()
    const { data: existingClients } = await supabase
      .from('clients')
      .select('sales_deal_id')
      .not('sales_deal_id', 'is', null)

    const syncedIds = new Set((existingClients ?? []).map(c => c.sales_deal_id))

    const result = (deals ?? []).map(d => ({
      ...d,
      company_name: ((d.companies as unknown) as { name: string } | null)?.name ?? '',
      already_synced: syncedIds.has(d.id),
    }))

    return NextResponse.json(result)
  }

  return NextResponse.json({ error: 'invalid mode' }, { status: 400 })
}

// POST: 顧客登録（手動 or Sales同期）
export async function POST(req: NextRequest) {
  const body = await req.json()
  const supabase = createServiceClient()

  if (body.mode === 'sync-from-sales') {
    // Sales Pipeline から同期
    const { dealId } = body
    if (!dealId) return NextResponse.json({ error: 'dealId required' }, { status: 400 })
    if (!SALES_SUPABASE_URL || !SALES_SUPABASE_KEY) {
      return NextResponse.json({ error: 'Sales Pipeline 環境変数が未設定です' }, { status: 500 })
    }

    // 重複チェック
    const { data: existing } = await supabase
      .from('clients')
      .select('id')
      .eq('sales_deal_id', dealId)
      .single()
    if (existing) {
      return NextResponse.json({ error: '既に同期済みです', clientId: existing.id }, { status: 409 })
    }

    // Sales から deal 情報取得
    const sales = createSalesClient(SALES_SUPABASE_URL, SALES_SUPABASE_KEY)
    const { data: deal, error: dealErr } = await sales
      .from('deals')
      .select('*, companies(name)')
      .eq('id', dealId)
      .single()

    if (dealErr || !deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    const companyName = ((deal.companies as unknown) as { name: string } | null)?.name ?? ''
    const clientName = deal.facility_name || companyName || '未設定'

    // clients 作成
    const { data: client, error: clientErr } = await supabase
      .from('clients')
      .insert({
        name: clientName,
        email: '',
        facility_name: deal.facility_name,
        room_count: deal.room_count,
        expected_mrr: deal.expected_mrr,
        sales_deal_id: deal.id,
      })
      .select()
      .single()

    if (clientErr) return NextResponse.json({ error: clientErr.message }, { status: 500 })

    // applications 作成
    const quoteAmount = (deal.initial_fee ?? 0) + (deal.expected_mrr ?? 0) * 12
    const { data: app, error: appErr } = await supabase
      .from('applications')
      .insert({
        client_id: client.id,
        subsidy_type: 'デジタル化・AI導入補助金',
        subsidy_frame: '通常枠',
        status: '適格審査中',
        tool_name: 'WASIMIL',
        quote_amount: quoteAmount > 0 ? quoteAmount : null,
        notes: deal.notes ?? null,
      })
      .select()
      .single()

    if (appErr) return NextResponse.json({ error: appErr.message }, { status: 500 })

    await createRequiredDocs(supabase, app.id)

    return NextResponse.json({ success: true, clientId: client.id, applicationId: app.id })
  }

  // 手動登録
  const { name, email, contactName, facilityName, roomCount, phone, subsidyType, programId, roundId, assignedTo } = body

  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .insert({
      name,
      email: email ?? '',
      contact_name: contactName ?? null,
      facility_name: facilityName ?? null,
      room_count: roomCount ?? null,
      phone: phone ?? null,
    })
    .select()
    .single()

  if (clientErr) return NextResponse.json({ error: clientErr.message }, { status: 500 })

  const { data: app, error: appErr } = await supabase
    .from('applications')
    .insert({
      client_id: client.id,
      subsidy_type: subsidyType ?? 'デジタル化・AI導入補助金',
      subsidy_frame: subsidyType === 'デジタル化・AI導入補助金' ? '通常枠' : null,
      status: '適格審査中',
      tool_name: 'WASIMIL',
      program_id: programId ?? null,
      round_id: roundId ?? null,
      assigned_to: assignedTo ?? null,
    })
    .select()
    .single()

  if (appErr) return NextResponse.json({ error: appErr.message }, { status: 500 })

  await createRequiredDocs(supabase, app.id)

  return NextResponse.json({ success: true, clientId: client.id, applicationId: app.id })
}
