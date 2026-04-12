'use client'

import { useState, useEffect, useCallback } from 'react'

const C = {
  bg: '#f5f4f0', surface: '#ffffff', surfaceAlt: '#faf9f6',
  border: '#e5e2da', ink: '#1a1814', inkMid: '#5a5650', inkFaint: '#9b9890',
  accent: '#c45c1a', accentBg: '#fdf0e8',
  green: '#2d7a47', greenBg: '#edf7f1', greenBorder: '#a8d9b8',
  red: '#b83232', redBg: '#fdf0f0', redBorder: '#f0b8b8',
  blue: '#1a5fa8', blueBg: '#eaf2fc',
} as const

interface AllowedUser {
  id: string; email: string; name: string | null; role: string
  is_active: boolean; last_login_at: string | null; created_at: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<AllowedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [addEmail, setAddEmail] = useState('')
  const [addName, setAddName] = useState('')
  const [addRole, setAddRole] = useState('member')
  const [adding, setAdding] = useState(false)
  const [toast, setToast] = useState('')

  const loadUsers = useCallback(async () => {
    const res = await fetch('/api/users')
    if (res.ok) setUsers(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  async function handleAdd() {
    if (!addEmail.trim() || adding) return
    if (!addEmail.endsWith('@wasimil.com')) { showToast('⚠ @wasimil.com のメールアドレスのみ招待できます'); return }
    setAdding(true)
    const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: addEmail.trim(), name: addName.trim() || null, role: addRole }) })
    if (res.ok) { setAddEmail(''); setAddName(''); showToast('招待しました'); loadUsers() }
    else { const d = await res.json(); showToast(`エラー: ${d.error}`) }
    setAdding(false)
  }

  async function handleToggle(id: string, isActive: boolean) {
    await fetch('/api/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_active: !isActive }) })
    loadUsers()
    showToast(isActive ? '無効化しました' : '有効化しました')
  }

  async function handleDelete(id: string, email: string) {
    if (!confirm(`${email} を削除しますか？`)) return
    await fetch('/api/users', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    loadUsers()
    showToast('削除しました')
  }

  const inp = { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none', color: C.ink } as const

  return (
    <div style={{ maxWidth: 800 }}>
      {toast && <div style={{ position: 'fixed', bottom: 24, right: 24, background: C.green, color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', zIndex: 999 }}>{toast}</div>}

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800 }}>ユーザー管理</h2>
        <p style={{ margin: 0, color: C.inkFaint, fontSize: 13 }}>@wasimil.com のGoogleアカウントで招待されたユーザーのみ利用可能</p>
      </div>

      {/* 招待フォーム */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>新しいメンバーを招待</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' as const }}>
          <div style={{ flex: '2 1 200px' }}>
            <label style={{ fontSize: 11, color: C.inkFaint, display: 'block', marginBottom: 4 }}>メールアドレス *</label>
            <input value={addEmail} onChange={e => setAddEmail(e.target.value)} placeholder="name@wasimil.com" style={{ ...inp, width: '100%' }} />
          </div>
          <div style={{ flex: '1 1 120px' }}>
            <label style={{ fontSize: 11, color: C.inkFaint, display: 'block', marginBottom: 4 }}>名前</label>
            <input value={addName} onChange={e => setAddName(e.target.value)} placeholder="例: 田中" style={{ ...inp, width: '100%' }} />
          </div>
          <div style={{ flex: '0 0 100px' }}>
            <label style={{ fontSize: 11, color: C.inkFaint, display: 'block', marginBottom: 4 }}>権限</label>
            <select value={addRole} onChange={e => setAddRole(e.target.value)} style={{ ...inp, width: '100%', cursor: 'pointer' }}>
              <option value="member">メンバー</option>
              <option value="admin">管理者</option>
            </select>
          </div>
          <button onClick={handleAdd} disabled={!addEmail.trim() || adding} style={{ background: addEmail.trim() && !adding ? C.accent : C.border, color: addEmail.trim() && !adding ? '#fff' : C.inkFaint, border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: addEmail.trim() && !adding ? 'pointer' : 'not-allowed', fontFamily: 'inherit', whiteSpace: 'nowrap' as const }}>
            {adding ? '招待中...' : '＋ 招待'}
          </button>
        </div>
      </div>

      {/* ユーザー一覧 */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', background: C.surfaceAlt, borderBottom: `1px solid ${C.border}`, fontSize: 14, fontWeight: 800 }}>
          メンバー一覧（{users.length}名）
        </div>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: C.inkFaint, fontSize: 13 }}>読み込み中...</div>
        ) : users.map((u, i) => (
          <div key={u.id} style={{ padding: '12px 20px', borderBottom: i < users.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', alignItems: 'center', gap: 12, opacity: u.is_active ? 1 : 0.5 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: u.role === 'admin' ? C.accent : C.blue, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
              {(u.name ?? u.email)[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{u.name ?? u.email.split('@')[0]}</span>
                <span style={{ fontSize: 10, background: u.role === 'admin' ? C.accentBg : C.blueBg, color: u.role === 'admin' ? C.accent : C.blue, padding: '1px 6px', borderRadius: 6, fontWeight: 700 }}>{u.role === 'admin' ? '管理者' : 'メンバー'}</span>
                {!u.is_active && <span style={{ fontSize: 10, background: C.redBg, color: C.red, padding: '1px 6px', borderRadius: 6 }}>無効</span>}
              </div>
              <div style={{ fontSize: 11, color: C.inkFaint }}>{u.email}</div>
              {u.last_login_at && <div style={{ fontSize: 10, color: C.inkFaint, marginTop: 2 }}>最終ログイン: {new Date(u.last_login_at).toLocaleString('ja-JP')}</div>}
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={() => handleToggle(u.id, u.is_active)} style={{ background: u.is_active ? C.bg : C.greenBg, color: u.is_active ? C.inkMid : C.green, border: `1px solid ${u.is_active ? C.border : C.greenBorder}`, borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                {u.is_active ? '無効化' : '有効化'}
              </button>
              <button onClick={() => handleDelete(u.id, u.email)} style={{ background: C.redBg, color: C.red, border: `1px solid ${C.redBorder}`, borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                削除
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
