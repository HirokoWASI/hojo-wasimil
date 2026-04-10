import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { clientId, applicationId, clientFields, appFields } = body

  const supabase = createServiceClient()

  if (clientId && clientFields) {
    const { error } = await supabase.from('clients').update(clientFields).eq('id', clientId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (applicationId && appFields) {
    const { error } = await supabase.from('applications').update(appFields).eq('id', applicationId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
