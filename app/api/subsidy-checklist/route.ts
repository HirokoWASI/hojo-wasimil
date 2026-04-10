import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// POST: チェックリスト初期化
export async function POST(req: NextRequest) {
  const { applicationId, items } = await req.json()
  if (!applicationId || !items?.length) {
    return NextResponse.json({ error: 'missing params' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // 既存チェックがあれば返す
  const { data: existing } = await supabase
    .from('application_checklist')
    .select('*')
    .eq('application_id', applicationId)
    .order('step_order')

  if (existing && existing.length > 0) {
    return NextResponse.json(existing)
  }

  const rows = items.map((item: { key: string; label: string; order: number }) => ({
    application_id: applicationId,
    step_key: item.key,
    step_label: item.label,
    step_order: item.order,
    completed: false,
  }))

  const { data, error } = await supabase
    .from('application_checklist')
    .insert(rows)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH: チェック項目の更新
export async function PATCH(req: NextRequest) {
  const { id, completed } = await req.json()
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

  const supabase = createServiceClient()

  const { error } = await supabase
    .from('application_checklist')
    .update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
