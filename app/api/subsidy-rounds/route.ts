import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('subsidy_rounds')
    .select('*')
    .order('application_start', { ascending: true })
  if (error) return NextResponse.json([], { status: 200 })
  return NextResponse.json(data ?? [])
}
