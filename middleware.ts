import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request: { headers: request.headers } })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options as any))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // 管理画面のパス（/dashboard, /applications, /subsidy-lookup 等）
  const isAdminPath = path.startsWith('/dashboard') || path.startsWith('/applications') || path.startsWith('/subsidy-lookup') || path.startsWith('/subsidy-collect') || path.startsWith('/screening') || path.startsWith('/draft') || path.startsWith('/chat')

  if (isAdminPath && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // ログイン済みの場合、/login にアクセスしたらダッシュボードへ
  if (path === '/login' && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api|portal).*)'],
}
