import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const applicationId = req.nextUrl.searchParams.get('applicationId')
  if (!applicationId) return NextResponse.json([], { status: 200 })

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: true })

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const { applicationId, content, senderType, senderName } = await req.json()
  if (!applicationId || !content) {
    return NextResponse.json({ error: 'missing params' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('messages')
    .insert({
      application_id: applicationId,
      sender_type: senderType ?? 'cs',
      sender_name: senderName ?? 'CS',
      content,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
