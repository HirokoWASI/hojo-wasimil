import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()

  const { data: apps, error } = await supabase
    .from('applications')
    .select('*, clients(id, name, email, contact_name, gbiz_id, corporate_number, phone, employee_count)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json([], { status: 200 })

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
