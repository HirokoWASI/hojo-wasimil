'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const C = {
  bg: '#f5f4f0', surface: '#ffffff', border: '#e5e2da',
  ink: '#1a1814', inkMid: '#5a5650', inkFaint: '#9b9890',
  accent: '#c45c1a', accentBg: '#fdf0e8',
  red: '#b83232', redBg: '#fdf0f0',
} as const

export default function UserMenu({ email, displayName }: { email: string; displayName: string }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const name = displayName || email.split('@')[0]
  const initial = name[0].toUpperCase()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div style={{ position: 'relative', borderTop: `1px solid ${C.border}` }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ width: '100%', padding: '10px 16px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'inherit', textAlign: 'left' }}
      >
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{initial}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
          <div style={{ fontSize: 10, color: C.inkFaint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>
        </div>
        <span style={{ fontSize: 10, color: C.inkFaint }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setOpen(false)} />
          <div style={{ position: 'absolute', bottom: '100%', left: 8, right: 8, marginBottom: 4, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: '0 -4px 16px rgba(0,0,0,0.1)', zIndex: 50, overflow: 'hidden' }}>
            <Link href="/profile" onClick={() => setOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', fontSize: 12, color: C.ink, textDecoration: 'none', borderBottom: `1px solid ${C.border}` }}>
              <span>👤</span> プロフィール設定
            </Link>
            <Link href="/users" onClick={() => setOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', fontSize: 12, color: C.ink, textDecoration: 'none', borderBottom: `1px solid ${C.border}` }}>
              <span>👥</span> ユーザー管理
            </Link>
            <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', fontSize: 12, color: C.red, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
              <span>🚪</span> ログアウト
            </button>
          </div>
        </>
      )}
    </div>
  )
}
