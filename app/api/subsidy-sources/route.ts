import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('subsidy_sources')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const body = await req.json()
  const { name, url, keywords } = body
  if (!name || !url) return NextResponse.json({ error: 'name と url は必須です' }, { status: 400 })
  const { data, error } = await supabase
    .from('subsidy_sources')
    .insert({ name, url, keywords: keywords ?? [] })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id は必須です' }, { status: 400 })
  const { error } = await supabase.from('subsidy_sources').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
