import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('allowed_users')
    .select('*')
    .order('created_at', { ascending: true })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const { email, name, role } = await req.json()
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })
  if (!email.endsWith('@wasimil.com')) return NextResponse.json({ error: '@wasimil.com のみ招待可能' }, { status: 400 })

  const supabase = createServiceClient()
  const { error } = await supabase.from('allowed_users').insert({ email, name: name ?? null, role: role ?? 'member' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest) {
  const { id, is_active } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const supabase = createServiceClient()
  await supabase.from('allowed_users').update({ is_active }).eq('id', id)
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const supabase = createServiceClient()
  await supabase.from('allowed_users').delete().eq('id', id)
  return NextResponse.json({ success: true })
}
