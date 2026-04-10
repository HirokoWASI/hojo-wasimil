import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('collected_subsidies')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json([], { status: 200 }) // テーブル未作成時は空配列
  return NextResponse.json(data ?? [])
}
