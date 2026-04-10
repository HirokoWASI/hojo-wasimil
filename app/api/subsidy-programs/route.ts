import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('subsidy_programs')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const { name, shortName, organizer, description, officialUrl } = await req.json()
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('subsidy_programs')
    .insert({ name, short_name: shortName ?? null, organizer: organizer ?? null, description: description ?? null, official_url: officialUrl ?? null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
