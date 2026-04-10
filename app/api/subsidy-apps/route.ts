import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const programId = req.nextUrl.searchParams.get('programId')
  const roundId = req.nextUrl.searchParams.get('roundId')
  const supabase = createServiceClient()

  let query = supabase
    .from('applications')
    .select('*, clients(id, name, email, contact_name, gbiz_id, corporate_number, phone, employee_count), subsidy_programs(name, short_name), subsidy_rounds(round_name)')
    .order('created_at', { ascending: false })

  if (programId) query = query.eq('program_id', programId)
  if (roundId) query = query.eq('round_id', roundId)

  const { data: apps } = await query

  const appIds = (apps ?? []).map(a => a.id)
  let checklists: Record<string, unknown[]> = {}
  if (appIds.length > 0) {
    const { data: items } = await supabase
      .from('application_checklist')
      .select('*')
      .in('application_id', appIds)
      .order('step_order', { ascending: true })
    for (const item of items ?? []) {
      const aid = item.application_id as string
      if (!checklists[aid]) checklists[aid] = []
      checklists[aid].push(item)
    }
  }

  const result = (apps ?? []).map(app => ({
    ...app,
    checklist: checklists[app.id] ?? [],
  }))

  return NextResponse.json(result)
}
