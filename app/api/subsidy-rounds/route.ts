import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const programId = req.nextUrl.searchParams.get('programId')
  const supabase = createServiceClient()

  let query = supabase.from('subsidy_rounds').select('*').order('application_start', { ascending: true })
  if (programId) query = query.eq('program_id', programId)

  const { data } = await query
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const { programId, roundName, applicationStart, applicationEnd, grantDecisionDate } = await req.json()
  if (!programId || !roundName) return NextResponse.json({ error: 'missing params' }, { status: 400 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('subsidy_rounds')
    .insert({
      program_id: programId,
      round_name: roundName,
      application_start: applicationStart ?? null,
      application_end: applicationEnd ?? null,
      grant_decision_date: grantDecisionDate ?? null,
      is_current: false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
