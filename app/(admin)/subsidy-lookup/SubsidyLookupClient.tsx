'use client'

import { useState, useEffect, useCallback } from 'react'

const C = {
  bg: '#f5f4f0', surface: '#ffffff', surfaceAlt: '#faf9f6',
  border: '#e5e2da', borderMid: '#d0cdc4',
  ink: '#1a1814', inkMid: '#5a5650', inkFaint: '#9b9890',
  accent: '#c45c1a', accentBg: '#fdf0e8', accentBorder: '#f0c8a4',
  green: '#2d7a47', greenBg: '#edf7f1', greenBorder: '#a8d9b8',
  blue: '#1a5fa8', blueBg: '#eaf2fc', blueBorder: '#a4c8f0',
  red: '#b83232', redBg: '#fdf0f0', redBorder: '#f0b8b8',
  purple: '#6b35a8', purpleBg: '#f3edfb', purpleBorder: '#c9aae8',
  yellow: '#7a5c00', yellowBg: '#fdf8e8', yellowBorder: '#e8d490',
} as const

interface Program { id: string; name: string; short_name: string | null; organizer: string | null; description: string | null; official_url: string | null }
interface Round { id: string; program_id: string; round_name: string; application_start: string | null; application_end: string | null; grant_decision_date: string | null; is_current: boolean }
interface ClientApp {
  id: string; client_id: string; subsidy_type: string; subsidy_frame: string | null
  status: string; tool_name: string | null; quote_amount: number | null; subsidy_amount: number | null
  gbiz_id_status: string; security_action_done: boolean; miradeji_done: boolean
  program_id: string | null; round_id: string | null; notes: string | null; created_at: string
  clients?: { id: string; name: string; email: string; contact_name: string | null }
  subsidy_rounds?: { round_name: string } | null
}

function fmtDate(d: string | null) { return d ? new Date(d).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }) : '—' }
function daysUntil(d: string | null) { return d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : null }
function statusColor(s: string) {
  const m: Record<string, { bg: string; fg: string; border: string }> = {
    '適格審査中': { bg: C.yellowBg, fg: C.yellow, border: C.yellowBorder },
    '書類準備中': { bg: C.blueBg, fg: C.blue, border: C.blueBorder },
    '申請中': { bg: C.purpleBg, fg: C.purple, border: C.purpleBorder },
    '採択待ち': { bg: C.accentBg, fg: C.accent, border: C.accentBorder },
    '採択済': { bg: C.greenBg, fg: C.green, border: C.greenBorder },
    '不採択': { bg: C.redBg, fg: C.red, border: C.redBorder },
  }
  return m[s] ?? { bg: C.bg, fg: C.inkMid, border: C.border }
}

export default function SubsidyLookupClient() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [selProgramId, setSelProgramId] = useState<string | null>(null)
  const [rounds, setRounds] = useState<Round[]>([])
  const [selRoundId, setSelRoundId] = useState<string | null>(null)
  const [apps, setApps] = useState<ClientApp[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddRound, setShowAddRound] = useState(false)
  const [newRound, setNewRound] = useState({ name: '', start: '', end: '' })

  const loadPrograms = useCallback(async () => {
    const res = await fetch('/api/subsidy-programs')
    if (res.ok) {
      const data = await res.json()
      setPrograms(data)
      if (!selProgramId && data.length > 0) setSelProgramId(data[0].id)
    }
    setLoading(false)
  }, [selProgramId])

  const loadRounds = useCallback(async () => {
    if (!selProgramId) return
    const res = await fetch(`/api/subsidy-rounds?programId=${selProgramId}`)
    if (res.ok) setRounds(await res.json())
  }, [selProgramId])

  const loadApps = useCallback(async () => {
    if (!selProgramId) return
    const params = new URLSearchParams({ programId: selProgramId })
    if (selRoundId) params.set('roundId', selRoundId)
    const res = await fetch(`/api/subsidy-apps?${params}`)
    if (res.ok) setApps(await res.json())
  }, [selProgramId, selRoundId])

  useEffect(() => { loadPrograms() }, [loadPrograms])
  useEffect(() => { loadRounds(); loadApps() }, [loadRounds, loadApps])

  async function handleAddRound() {
    if (!selProgramId || !newRound.name) return
    await fetch('/api/subsidy-rounds', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ programId: selProgramId, roundName: newRound.name, applicationStart: newRound.start || null, applicationEnd: newRound.end || null }) })
    setNewRound({ name: '', start: '', end: '' }); setShowAddRound(false); loadRounds()
  }

  const selProgram = programs.find(p => p.id === selProgramId)
  const currentRound = rounds.find(r => r.is_current)
  const dl = currentRound ? daysUntil(currentRound.application_end) : null
  const activeApps = apps.filter(a => !['採択済', '不採択'].includes(a.status))
  const adoptedApps = apps.filter(a => a.status === '採択済')

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: C.inkFaint }}>読み込み中...</div>

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800 }}>補助金管理</h2>
        <p style={{ margin: 0, color: C.inkFaint, fontSize: 13 }}>補助金プログラム × 応募回ごとに顧客の申請状況を管理</p>
      </div>

      {/* 補助金プログラム選択 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {programs.map(p => (
          <button key={p.id} onClick={() => { setSelProgramId(p.id); setSelRoundId(null) }} style={{ background: selProgramId === p.id ? C.accent : C.surface, color: selProgramId === p.id ? '#fff' : C.inkMid, border: `1px solid ${selProgramId === p.id ? C.accent : C.border}`, borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: selProgramId === p.id ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' as const }}>
            {p.short_name ?? p.name}
          </button>
        ))}
      </div>

      {selProgram && (
        <>
          {/* プログラム情報 */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 20px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 2 }}>{selProgram.name}</div>
              <div style={{ fontSize: 12, color: C.inkFaint }}>{selProgram.organizer}{selProgram.description ? ` — ${selProgram.description}` : ''}</div>
            </div>
            {selProgram.official_url && <a href={selProgram.official_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: C.blue, background: C.blueBg, border: `1px solid ${C.blueBorder}`, borderRadius: 6, padding: '4px 10px', textDecoration: 'none', fontWeight: 600 }}>公式サイト ↗</a>}
          </div>

          {/* KPI */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ fontSize: 10, color: C.inkFaint }}>応募回数</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{rounds.length}</div>
            </div>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ fontSize: 10, color: C.inkFaint }}>申請中</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.blue }}>{activeApps.length}</div>
            </div>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ fontSize: 10, color: C.inkFaint }}>採択済</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.green }}>{adoptedApps.length}</div>
            </div>
            <div style={{ background: currentRound && dl !== null && dl <= 14 ? C.redBg : C.surface, border: `1px solid ${currentRound && dl !== null && dl <= 14 ? C.redBorder : C.border}`, borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ fontSize: 10, color: C.inkFaint }}>現在の締切</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: dl !== null && dl <= 14 ? C.red : C.ink }}>{currentRound ? `${currentRound.round_name} ${fmtDate(currentRound.application_end)}` : '—'}</div>
            </div>
          </div>

          {/* 応募回セレクター */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' as const }}>
            <button onClick={() => setSelRoundId(null)} style={{ background: !selRoundId ? C.ink : C.surface, color: !selRoundId ? '#fff' : C.inkMid, border: `1px solid ${!selRoundId ? C.ink : C.border}`, borderRadius: 20, padding: '5px 14px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: !selRoundId ? 700 : 500 }}>全応募回</button>
            {rounds.map(r => (
              <button key={r.id} onClick={() => setSelRoundId(r.id)} style={{ background: selRoundId === r.id ? C.ink : C.surface, color: selRoundId === r.id ? '#fff' : C.inkMid, border: `1px solid ${selRoundId === r.id ? C.ink : C.border}`, borderRadius: 20, padding: '5px 14px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: selRoundId === r.id ? 700 : 500, position: 'relative' as const }}>
                {r.round_name}
                {r.is_current && <span style={{ position: 'absolute' as const, top: -4, right: -4, width: 8, height: 8, background: C.accent, borderRadius: '50%' }} />}
              </button>
            ))}
            <button onClick={() => setShowAddRound(true)} style={{ background: 'transparent', color: C.inkFaint, border: `1px dashed ${C.border}`, borderRadius: 20, padding: '5px 14px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>＋ 応募回追加</button>
          </div>

          {/* 応募回追加フォーム */}
          {showAddRound && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}><label style={{ fontSize: 11, color: C.inkFaint, display: 'block', marginBottom: 4 }}>名称 *</label><input value={newRound.name} onChange={e => setNewRound({ ...newRound, name: e.target.value })} placeholder="例: 4次締切" style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 10px', fontSize: 12, fontFamily: 'inherit', outline: 'none', color: C.ink }} /></div>
              <div style={{ flex: 1 }}><label style={{ fontSize: 11, color: C.inkFaint, display: 'block', marginBottom: 4 }}>受付開始</label><input type="date" value={newRound.start} onChange={e => setNewRound({ ...newRound, start: e.target.value })} style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 10px', fontSize: 12, fontFamily: 'inherit', outline: 'none', color: C.ink }} /></div>
              <div style={{ flex: 1 }}><label style={{ fontSize: 11, color: C.inkFaint, display: 'block', marginBottom: 4 }}>締切</label><input type="date" value={newRound.end} onChange={e => setNewRound({ ...newRound, end: e.target.value })} style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 10px', fontSize: 12, fontFamily: 'inherit', outline: 'none', color: C.ink }} /></div>
              <button onClick={handleAddRound} disabled={!newRound.name} style={{ background: newRound.name ? C.accent : C.border, color: newRound.name ? '#fff' : C.inkFaint, border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: newRound.name ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>追加</button>
              <button onClick={() => setShowAddRound(false)} style={{ background: C.bg, color: C.inkMid, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
            </div>
          )}

          {/* 顧客申請一覧 */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', background: C.surfaceAlt, borderBottom: `1px solid ${C.border}`, fontSize: 14, fontWeight: 800 }}>
              顧客申請管理（{apps.length}件）
            </div>
            {apps.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: C.inkFaint, fontSize: 13 }}>
                {selRoundId ? 'この応募回に該当する顧客はいません' : 'この補助金の申請顧客はまだいません。「顧客プロセス管理」から登録してください。'}
              </div>
            ) : (
              <div>
                {apps.map((app, i) => {
                  const sc = statusColor(app.status)
                  return (
                    <div key={app.id} style={{ padding: '14px 20px', borderBottom: i < apps.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
                          <span style={{ fontSize: 14, fontWeight: 700 }}>{app.clients?.name ?? '—'}</span>
                          <span style={{ background: sc.bg, color: sc.fg, fontSize: 10, padding: '2px 8px', borderRadius: 8, border: `1px solid ${sc.border}`, fontWeight: 700 }}>{app.status}</span>
                          {app.subsidy_rounds && <span style={{ fontSize: 10, color: C.inkFaint, background: C.bg, padding: '2px 8px', borderRadius: 6, border: `1px solid ${C.border}` }}>{app.subsidy_rounds.round_name}</span>}
                        </div>
                        <div style={{ fontSize: 11, color: C.inkFaint }}>{app.subsidy_frame ?? ''}{app.tool_name ? ` / ${app.tool_name}` : ''}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {app.quote_amount && <div style={{ fontSize: 12, fontWeight: 700, color: C.accent }}>¥{app.quote_amount.toLocaleString()}</div>}
                        {app.subsidy_amount && <div style={{ fontSize: 11, color: C.green }}>補助 ¥{app.subsidy_amount.toLocaleString()}</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
