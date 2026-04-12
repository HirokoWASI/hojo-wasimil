import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminNav from './AdminNav'
import UserMenu from './UserMenu'

const C = {
  bg: '#f5f4f0',
  surface: '#ffffff',
  surfaceAlt: '#faf9f6',
  border: '#e5e2da',
  ink: '#1a1814',
  inkMid: '#5a5650',
  inkFaint: '#9b9890',
  accent: '#c45c1a',
  accentBg: '#fdf0e8',
  accentBorder: '#f0c8a4',
  red: '#b83232',
  redBg: '#fdf0f0',
  redBorder: '#f0b8b8',
  yellow: '#7a5c00',
  yellowBg: '#fdf8e8',
  yellowBorder: '#e8d490',
} as const

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ユーザー表示名を取得
  const { data: allowedUser } = await supabase
    .from('allowed_users')
    .select('name')
    .eq('email', user.email ?? '')
    .single()
  const displayName = allowedUser?.name ?? user.email?.split('@')[0] ?? ''

  // 期限アラート
  const today = new Date()
  const in14Days = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)
  const { data: urgentApps } = await supabase
    .from('applications')
    .select('*, clients(name)')
    .gte('deadline', today.toISOString().split('T')[0])
    .lte('deadline', in14Days.toISOString().split('T')[0])
    .not('status', 'in', '("採択済","不採択")')
    .order('deadline', { ascending: true })
    .limit(2)

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.ink, fontFamily: "'Hiragino Kaku Gothic ProN','Hiragino Sans',Meiryo,sans-serif", display: 'flex', flexDirection: 'column' }}>

      {/* トップバー */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 30, height: 30, background: C.accent, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color: '#fff' }}>補</div>
          <span style={{ fontWeight: 800, fontSize: 15 }}>補助金管理システム</span>
          <span style={{ fontSize: 11, color: C.inkFaint, background: C.bg, padding: '2px 8px', borderRadius: 4, border: `1px solid ${C.border}` }}>WASIMIL × AZOO</span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(urgentApps ?? []).slice(0, 2).map((app: any) => {
            const daysLeft = Math.ceil((new Date(app.deadline).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
            const isHigh = daysLeft <= 7
            return (
              <div key={app.id} style={{ background: isHigh ? C.redBg : C.yellowBg, color: isHigh ? C.red : C.yellow, fontSize: 11, padding: '4px 12px', borderRadius: 20, border: `1px solid ${isHigh ? C.redBorder : C.yellowBorder}` }}>
                {isHigh ? '🔴' : '🟡'} {app.clients?.name} — 期限まで{daysLeft}日
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1 }}>
        {/* サイドバー */}
        <div style={{ width: 210, background: C.surface, borderRight: `1px solid ${C.border}`, padding: '20px 0', display: 'flex', flexDirection: 'column', gap: 2, position: 'sticky', top: 56, height: 'calc(100vh - 56px)', overflowY: 'auto' }}>
          <AdminNav />
          <div style={{ flex: 1 }} />
          <UserMenu email={user.email ?? ''} displayName={displayName} />
        </div>

        {/* メインコンテンツ */}
        <main style={{ flex: 1, overflowAuto: true, minHeight: 'calc(100vh - 56px)', padding: 24 } as React.CSSProperties}>
          {children}
        </main>
      </div>
    </div>
  )
}

