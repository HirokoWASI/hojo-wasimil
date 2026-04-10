import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { clientId, expiryDays } = await req.json()

  if (!clientId || typeof expiryDays !== 'number') {
    return NextResponse.json({ error: 'clientId と expiryDays が必要です' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiryDays)

  const { data, error } = await supabase
    .from('clients')
    .update({
      portal_token: crypto.randomUUID(),
      token_expires_at: expiresAt.toISOString(),
      token_sent_at: new Date().toISOString(),
    })
    .eq('id', clientId)
    .select('portal_token, token_expires_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://hojo.wasimil.jp'
  const url = `${appUrl}/portal/${data.portal_token}`

  return NextResponse.json({
    url,
    token: data.portal_token,
    expiresAt: data.token_expires_at,
  })
}
