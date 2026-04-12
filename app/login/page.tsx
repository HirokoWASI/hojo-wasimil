'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const C = {
  bg: '#f5f4f0', surface: '#ffffff', border: '#e5e2da',
  ink: '#1a1814', inkMid: '#5a5650', inkFaint: '#9b9890',
  accent: '#c45c1a', accentBg: '#fdf0e8',
  red: '#b83232', redBg: '#fdf0f0',
  blue: '#1a5fa8', blueBg: '#eaf2fc',
} as const

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // URL params for error messages from callback
  useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const err = params.get('error')
      if (err === 'domain') setError('@wasimil.com のアカウントのみ利用可能です')
      if (err === 'not_invited') setError('このアカウントは招待されていません。管理者に連絡してください。')
      if (err === 'auth') setError('認証に失敗しました。もう一度お試しください。')
    }
  })

  async function handleGoogleLogin() {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { hd: 'wasimil.com' },
      },
    })
    if (error) {
      setError('Googleログインに失敗しました')
      setLoading(false)
    }
  }

  // パスワードログイン（フォールバック）
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('メールアドレスまたはパスワードが正しくありません')
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: "'Hiragino Kaku Gothic ProN','Hiragino Sans',Meiryo,sans-serif" }}>
      <div style={{ background: C.surface, borderRadius: 16, padding: '40px 32px', maxWidth: 400, width: '100%', border: `1px solid ${C.border}`, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 48, height: 48, background: C.accent, borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 12 }}>補</div>
          <div style={{ fontSize: 11, color: C.inkFaint, marginBottom: 2 }}>株式会社AZOO</div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.ink }}>補助金管理システム</h1>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: C.inkFaint }}>@wasimil.com アカウントでログイン</p>
        </div>

        {/* Google OAuth ボタン */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: C.surface, color: C.ink, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 20px', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginBottom: 16, opacity: loading ? 0.6 : 1 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          {loading ? 'ログイン中...' : 'Googleでログイン'}
        </button>

        {error && (
          <div style={{ background: C.redBg, color: C.red, borderRadius: 8, padding: '10px 14px', fontSize: 12, marginBottom: 12, textAlign: 'center' }}>
            {error}
          </div>
        )}

        <div style={{ fontSize: 11, color: C.inkFaint, textAlign: 'center', marginBottom: 12 }}>
          招待された @wasimil.com アカウントのみ利用可能です
        </div>

        {/* パスワードログイン（折りたたみ） */}
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
          <button onClick={() => setShowPassword(!showPassword)} style={{ background: 'transparent', border: 'none', color: C.inkFaint, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', padding: 0, width: '100%', textAlign: 'center' }}>
            {showPassword ? '▲ パスワードログインを閉じる' : '▼ パスワードでログイン'}
          </button>
          {showPassword && (
            <form onSubmit={handlePasswordLogin} style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="メールアドレス" required style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', fontFamily: 'inherit', color: C.ink }} />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="パスワード" required style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', fontFamily: 'inherit', color: C.ink }} />
              <button type="submit" disabled={loading} style={{ background: C.accent, color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {loading ? 'ログイン中...' : 'ログイン'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
