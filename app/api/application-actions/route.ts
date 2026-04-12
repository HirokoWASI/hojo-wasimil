import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { action, applicationId } = await req.json()
  if (!applicationId) return NextResponse.json({ error: 'applicationId required' }, { status: 400 })

  const supabase = createServiceClient()

  if (action === 'archive') {
    await supabase.from('applications').update({ archived: true, archived_at: new Date().toISOString() }).eq('id', applicationId)
    return NextResponse.json({ success: true })
  }

  if (action === 'unarchive') {
    await supabase.from('applications').update({ archived: false, archived_at: null }).eq('id', applicationId)
    return NextResponse.json({ success: true })
  }

  if (action === 'delete') {
    // 関連データも削除
    await supabase.from('application_checklist').delete().eq('application_id', applicationId)
    await supabase.from('documents').delete().eq('application_id', applicationId)
    await supabase.from('messages').delete().eq('application_id', applicationId)
    await supabase.from('email_logs').delete().eq('application_id', applicationId)
    await supabase.from('screening_logs').delete().eq('application_id', applicationId)
    await supabase.from('applications').delete().eq('id', applicationId)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'invalid action' }, { status: 400 })
}
