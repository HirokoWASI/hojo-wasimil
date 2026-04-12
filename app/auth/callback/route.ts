import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // ユーザーのメールを確認
      const { data: { user } } = await supabase.auth.getUser()
      const email = user?.email ?? ''

      // @wasimil.com ドメインチェック
      if (!email.endsWith('@wasimil.com')) {
        await supabase.auth.signOut()
        return NextResponse.redirect(`${origin}/login?error=domain`)
      }

      // allowed_users テーブルに登録されているかチェック
      const serviceClient = createServiceClient()
      const { data: allowedUser } = await serviceClient
        .from('allowed_users')
        .select('id, is_active')
        .eq('email', email)
        .eq('is_active', true)
        .single()

      if (!allowedUser) {
        await supabase.auth.signOut()
        return NextResponse.redirect(`${origin}/login?error=not_invited`)
      }

      // 最終ログイン日時を更新
      await serviceClient
        .from('allowed_users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', allowedUser.id)

      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
