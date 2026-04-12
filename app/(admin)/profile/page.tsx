'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const C = {
  bg: '#f5f4f0', surface: '#ffffff', surfaceAlt: '#faf9f6',
  border: '#e5e2da', ink: '#1a1814', inkMid: '#5a5650', inkFaint: '#9b9890',
  accent: '#c45c1a', accentBg: '#fdf0e8',
  green: '#2d7a47', greenBg: '#edf7f1', greenBorder: '#a8d9b8',
  red: '#b83232',
} as const

export default function ProfilePage() {
  const [user, setUser] = useState<{ email: string; created_at: string } | null>(null)
  const [profile, setProfile] = useState<{ name: string; role: string; last_login_at: string | null } | null>(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser({ email: user.email ?? '', created_at: user.created_at })
        // プロフィール取得
        fetch('/api/users').then(res => res.json()).then(users => {
          const me = users.find((u: any) => u.email === user.email)
          if (me) { setProfile(me); setName(me.name ?? '') }
        })
      }
    })
  }, [])

  async function handleSave() {
    if (!profile || saving) return
    setSaving(true)
    await fetch('/api/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: (profile as any).id, name }) })
    setToast('保存しました')
    setTimeout(() => setToast(''), 3000)
    setSaving(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const inp = { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none', color: C.ink, width: '100%' } as const

  if (!user) return <div style={{ padding: 40, textAlign: 'center', color: C.inkFaint }}>読み込み中...</div>

  return (
    <div style={{ maxWidth: 600 }}>
      {toast && <div style={{ position: 'fixed', bottom: 24, right: 24, background: C.green, color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', zIndex: 999 }}>{toast}</div>}

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800 }}>プロフィール</h2>
        <p style={{ margin: 0, color: C.inkFaint, fontSize: 13 }}>アカウント情報の確認・編集</p>
      </div>

      {/* アカウント情報 */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: C.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, flexShrink: 0 }}>
            {(name || user.email)[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.ink }}>{name || user.email.split('@')[0]}</div>
            <div style={{ fontSize: 13, color: C.inkFaint }}>{user.email}</div>
            {profile && <div style={{ fontSize: 11, color: C.accent, marginTop: 2, fontWeight: 600 }}>{profile.role === 'admin' ? '管理者' : 'メンバー'}</div>}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: C.inkFaint, fontWeight: 600, display: 'block', marginBottom: 4 }}>表示名</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="表示名を入力" style={inp} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: C.inkFaint, fontWeight: 600, display: 'block', marginBottom: 4 }}>メールアドレス</label>
            <input value={user.email} readOnly style={{ ...inp, background: C.surfaceAlt, color: C.inkFaint }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, color: C.inkFaint, fontWeight: 600, display: 'block', marginBottom: 4 }}>アカウント作成日</label>
              <div style={{ fontSize: 13, color: C.inkMid }}>{new Date(user.created_at).toLocaleDateString('ja-JP')}</div>
            </div>
            {profile?.last_login_at && (
              <div>
                <label style={{ fontSize: 11, color: C.inkFaint, fontWeight: 600, display: 'block', marginBottom: 4 }}>最終ログイン</label>
                <div style={{ fontSize: 13, color: C.inkMid }}>{new Date(profile.last_login_at).toLocaleString('ja-JP')}</div>
              </div>
            )}
          </div>
          <button onClick={handleSave} disabled={saving} style={{ background: saving ? C.border : C.accent, color: saving ? C.inkFaint : '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', alignSelf: 'flex-start' }}>
            {saving ? '保存中...' : '変更を保存'}
          </button>
        </div>
      </div>

      {/* ログアウト */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>ログアウト</div>
            <div style={{ fontSize: 12, color: C.inkFaint }}>このデバイスからログアウトします</div>
          </div>
          <button onClick={handleLogout} style={{ background: 'transparent', color: C.red, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            ログアウト
          </button>
        </div>
      </div>
    </div>
  )
}
