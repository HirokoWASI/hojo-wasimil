import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Application } from '@/types/database'

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
  green: '#2d7a47',
  greenBg: '#edf7f1',
  greenBorder: '#a8d9b8',
  blue: '#1a5fa8',
  blueBg: '#eaf2fc',
  blueBorder: '#a4c8f0',
  red: '#b83232',
  redBg: '#fdf0f0',
  redBorder: '#f0b8b8',
  yellow: '#7a5c00',
  yellowBg: '#fdf8e8',
  yellowBorder: '#e8d490',
  purple: '#6a3fa0',
  purpleBg: '#f5f0fc',
  purpleBorder: '#c8a8e8',
} as const

const APP_STATUS_CFG: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  '適格審査中': { color: C.yellow,  bg: C.yellowBg,  border: C.yellowBorder,  icon: '◐' },
  '書類準備中': { color: C.blue,    bg: C.blueBg,    border: C.blueBorder,    icon: '◑' },
  '申請中':     { color: C.accent,  bg: C.accentBg,  border: C.accentBorder,  icon: '◕' },
  '採択待ち':   { color: C.purple,  bg: C.purpleBg,  border: C.purpleBorder,  icon: '◔' },
  '採択済':     { color: C.green,   bg: C.greenBg,   border: C.greenBorder,   icon: '●' },
  '不採択':     { color: C.inkFaint, bg: C.bg,       border: C.border,        icon: '○' },
}

function AppBadge({ status }: { status: string }) {
  const cfg = APP_STATUS_CFG[status] ?? { color: C.inkFaint, bg: C.bg, border: C.border, icon: '○' }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {cfg.icon} {status}
    </span>
  )
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? C.green : score >= 65 ? C.yellow : C.red
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 5, background: C.border, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 11, color, fontWeight: 700, minWidth: 28 }}>{score}</span>
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = createClient()

  const today = new Date()
  const in14Days = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)

  const [
    { count: totalApps },
    { data: applications },
    { data: urgentApps },
  ] = await Promise.all([
    supabase.from('applications').select('*', { count: 'exact', head: true }),
    supabase
      .from('applications')
      .select('*, clients(name, email)')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('applications')
      .select('*, clients(name)')
      .gte('deadline', today.toISOString().split('T')[0])
      .lte('deadline', in14Days.toISOString().split('T')[0])
      .not('status', 'in', '("採択済","不採択")')
      .order('deadline', { ascending: true }),
  ])

  const apps = applications ?? []
  const adopted = apps.filter((a: any) => a.status === '採択済').length
  const inProgress = apps.filter((a: any) => !['採択済', '不採択'].includes(a.status)).length
  const totalAdoptedAmt = apps
    .filter((a: any) => a.status === '採択済')
    .reduce((sum: number, a: any) => {
      if (a.subsidy_amount) return sum + Math.round(Number(a.subsidy_amount) / 10000)
      const n = parseInt((a.amount ?? '0').replace(/[^0-9]/g, ''), 10)
      return sum + (isNaN(n) ? 0 : n)
    }, 0)

  const topAlerts = [
    ...(urgentApps ?? []).map((a: any) => {
      const days = Math.ceil((new Date(a.deadline).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return { level: days <= 7 ? 'high' : 'mid', msg: `${a.clients?.name} — 申請期限まで${days}日` }
    }),
    { level: 'info', msg: 'デジタル化・AI導入補助金2026 第3次締切 6月30日' },
  ]

  const statCards = [
    { label: '管理案件数', value: totalApps ?? 0, sub: '申請・支援中含む', color: C.ink },
    { label: '採択済', value: adopted, sub: `採択率 ${apps.length ? Math.round(adopted / apps.length * 100) : 0}%`, color: C.green },
    { label: '進行中', value: inProgress, sub: '書類準備〜採択待ち', color: C.accent },
    { label: '採択補助金額', value: `${totalAdoptedAmt.toLocaleString()}万`, sub: '顧客合計', color: C.blue },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1100 }}>
      <div>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800 }}>ダッシュボード</h2>
        <p style={{ margin: 0, color: C.inkFaint, fontSize: 13 }}>顧客補助金申請の全体状況 — {today.getFullYear()}年度</p>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        {statCards.map(s => (
          <div key={s.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 11, color: C.inkFaint, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color, fontFamily: 'monospace', marginTop: 6 }}>{s.value}</div>
            {s.sub && <div style={{ fontSize: 11, color: C.inkFaint, marginTop: 4 }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* アラート */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ padding: '14px 20px', background: C.surfaceAlt, borderBottom: `1px solid ${C.border}`, fontSize: 11, color: C.inkFaint, fontWeight: 700, textTransform: 'uppercase' }}>
          アラート
        </div>
        {topAlerts.map((a, i) => (
          <div key={i} style={{ padding: '12px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12, background: a.level === 'high' ? C.redBg : 'transparent' }}>
            <span>{a.level === 'high' ? '🔴' : a.level === 'mid' ? '🟡' : '🔵'}</span>
            <span style={{ fontSize: 13, color: a.level === 'high' ? C.red : C.ink }}>{a.msg}</span>
          </div>
        ))}
      </div>

      {/* 案件テーブル */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ padding: '14px 20px', background: C.surfaceAlt, borderBottom: `1px solid ${C.border}`, fontSize: 11, color: C.inkFaint, fontWeight: 700, textTransform: 'uppercase' }}>
          最近の案件
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: C.bg }}>
              {['施設名', '補助金種別', '申請額', 'ステータス', 'スコア', '残日数'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: C.inkFaint, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {apps.map((a: Application & { clients?: { name: string } }) => {
              const daysLeft = a.deadline ? Math.ceil((new Date(a.deadline).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null
              return (
                <tr key={a.id} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>
                    <Link href={`/applications/${a.id}`} style={{ color: C.ink, textDecoration: 'none' }}>
                      {a.clients?.name ?? '—'}
                    </Link>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: C.inkFaint }}>{a.subsidy_type}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontFamily: 'monospace', color: C.accent, fontWeight: 700 }}>{a.amount ?? '—'}</td>
                  <td style={{ padding: '12px 16px' }}><AppBadge status={a.status} /></td>
                  <td style={{ padding: '12px 16px', minWidth: 100 }}>
                    {a.score != null ? <ScoreBar score={a.score} /> : <span style={{ color: C.inkFaint }}>—</span>}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: daysLeft != null && daysLeft < 14 ? C.red : C.inkFaint }}>
                    {daysLeft != null ? `残${daysLeft}日` : '—'}
                  </td>
                </tr>
              )
            })}
            {!apps.length && (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: C.inkFaint, fontSize: 13 }}>案件はありません</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
