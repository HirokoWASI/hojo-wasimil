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

// ---- 型定義 ----
interface Program { id: string; name: string; short_name: string | null; organizer: string | null; description: string | null; official_url: string | null }
interface Round { id: string; program_id: string; round_name: string; application_start: string | null; application_end: string | null; grant_decision_date: string | null; is_current: boolean }
interface ClientApp {
  id: string; client_id: string; subsidy_type: string; subsidy_frame: string | null
  status: string; tool_name: string | null; quote_amount: number | null; subsidy_amount: number | null
  gbiz_id_status: string; security_action_done: boolean; miradeji_done: boolean
  application_round: string | null; program_id: string | null; round_id: string | null
  notes: string | null; created_at: string
  clients?: { id: string; name: string; email: string; contact_name: string | null }
  subsidy_programs?: { name: string; short_name: string | null } | null
  subsidy_rounds?: { round_name: string } | null
}
interface CollectedSubsidy { id: string; name: string | null; summary: string | null; subsidy_amount: string | null; subsidy_rate: string | null; application_end: string | null; it_related: boolean; hotel_related: boolean; is_new: boolean; updated_at: string }
interface SubsidySource { id: string; name: string; url: string; last_crawled_at: string | null }
interface SyncResult { sourceId: string; sourceName: string; status: string; name?: string }

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

// ==== メインコンポーネント ====
export default function SubsidyLookupClient() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [selProgramId, setSelProgramId] = useState<string | null>(null)
  const [rounds, setRounds] = useState<Round[]>([])
  const [selRoundId, setSelRoundId] = useState<string | null>(null)
  const [apps, setApps] = useState<ClientApp[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'apps' | 'collect'>('apps')

  // 収集
  const [collected, setCollected] = useState<CollectedSubsidy[]>([])
  const [sources, setSources] = useState<SubsidySource[]>([])
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncResults, setSyncResults] = useState<SyncResult[] | null>(null)
  const [addName, setAddName] = useState(''); const [addUrl, setAddUrl] = useState(''); const [addKw, setAddKw] = useState('')

  // 応募回追加
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

  const loadCollect = useCallback(async () => {
    const [cRes, sRes] = await Promise.all([fetch('/api/subsidy-collected'), fetch('/api/subsidy-sources')])
    if (cRes.ok) setCollected(await cRes.json())
    if (sRes.ok) setSources(await sRes.json())
  }, [])

  useEffect(() => { loadPrograms() }, [loadPrograms])
  useEffect(() => { loadRounds(); loadApps() }, [loadRounds, loadApps])
  useEffect(() => { if (tab === 'collect') loadCollect() }, [tab, loadCollect])

  const selProgram = programs.find(p => p.id === selProgramId)
  const currentRound = rounds.find(r => r.is_current)
  const dl = currentRound ? daysUntil(currentRound.application_end) : null
  const activeApps = apps.filter(a => !['採択済', '不採択'].includes(a.status))
  const adoptedApps = apps.filter(a => a.status === '採択済')

  async function handleSync(sourceId?: string) {
    setSyncLoading(true); setSyncResults(null)
    const res = await fetch('/api/subsidy-sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sourceId ? { sourceId } : {}) })
    const json = await res.json()
    if (json.results) { setSyncResults(json.results); loadCollect() }
    setSyncLoading(false)
  }
  async function handleAddSource() {
    if (!addName || !addUrl) return
    await fetch('/api/subsidy-sources', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: addName, url: addUrl, keywords: addKw.split(/[,、\s]+/).filter(Boolean) }) })
    setAddName(''); setAddUrl(''); setAddKw(''); loadCollect()
  }
  async function handleDeleteSource(id: string) {
    if (!confirm('削除しますか？')) return
    await fetch('/api/subsidy-sources', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    loadCollect()
  }
  async function handleAddRound() {
    if (!selProgramId || !newRound.name) return
    await fetch('/api/subsidy-rounds', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ programId: selProgramId, roundName: newRound.name, applicationStart: newRound.start || null, applicationEnd: newRound.end || null }) })
    setNewRound({ name: '', start: '', end: '' }); setShowAddRound(false); loadRounds()
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: C.inkFaint }}>読み込み中...</div>

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800 }}>補助金管理</h2>
        <p style={{ margin: 0, color: C.inkFaint, fontSize: 13 }}>補助金プログラム × 応募回ごとに顧客の申請状況を管理</p>
      </div>

      {/* ==== 補助金プログラム選択（サイドバー的タブ） ==== */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {programs.map(p => (
          <button key={p.id} onClick={() => { setSelProgramId(p.id); setSelRoundId(null) }} style={{ background: selProgramId === p.id ? C.accent : C.surface, color: selProgramId === p.id ? '#fff' : C.inkMid, border: `1px solid ${selProgramId === p.id ? C.accent : C.border}`, borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: selProgramId === p.id ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' as const }}>
            {p.short_name ?? p.name}
          </button>
        ))}
      </div>

      {selProgram && (
        <>
          {/* プログラム情報ヘッダー */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 20px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 2 }}>{selProgram.name}</div>
              <div style={{ fontSize: 12, color: C.inkFaint }}>{selProgram.organizer}{selProgram.description ? ` — ${selProgram.description}` : ''}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {selProgram.official_url && <a href={selProgram.official_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: C.blue, background: C.blueBg, border: `1px solid ${C.blueBorder}`, borderRadius: 6, padding: '4px 10px', textDecoration: 'none', fontWeight: 600 }}>公式サイト ↗</a>}
            </div>
          </div>

          {/* KPIバー */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ fontSize: 10, color: C.inkFaint }}>応募回数</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.ink }}>{rounds.length}</div>
            </div>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ fontSize: 10, color: C.inkFaint }}>申請中の顧客</div>
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
            {rounds.map(r => {
              const active = selRoundId === r.id
              return (
                <button key={r.id} onClick={() => setSelRoundId(r.id)} style={{ background: active ? C.ink : C.surface, color: active ? '#fff' : C.inkMid, border: `1px solid ${active ? C.ink : C.border}`, borderRadius: 20, padding: '5px 14px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: active ? 700 : 500, position: 'relative' as const }}>
                  {r.round_name}
                  {r.is_current && <span style={{ position: 'absolute' as const, top: -4, right: -4, width: 8, height: 8, background: C.accent, borderRadius: '50%' }} />}
                </button>
              )
            })}
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

          {/* タブ: 顧客申請 / 補助金情報収集 */}
          <div style={{ display: 'flex', gap: 2, marginBottom: 16, background: C.bg, borderRadius: 10, padding: 4, width: 'fit-content', border: `1px solid ${C.border}` }}>
            {([['apps', `顧客申請管理（${apps.length}）`], ['collect', `補助金情報収集（${collected.length}）`]] as const).map(([id, label]) => (
              <button key={id} onClick={() => setTab(id as 'apps' | 'collect')} style={{ background: tab === id ? C.surface : 'transparent', color: tab === id ? C.ink : C.inkMid, border: tab === id ? `1px solid ${C.border}` : '1px solid transparent', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: tab === id ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                {label}
              </button>
            ))}
          </div>

          {/* ==== 顧客申請管理 ==== */}
          {tab === 'apps' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {apps.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, background: C.surface, borderRadius: 12, border: `1px dashed ${C.borderMid}`, color: C.inkFaint, fontSize: 13 }}>
                  {selRoundId ? 'この応募回に該当する顧客はいません' : 'この補助金の申請顧客はまだいません'}
                </div>
              ) : apps.map(app => {
                const sc = statusColor(app.status)
                return (
                  <div key={app.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
                        <span style={{ fontSize: 14, fontWeight: 700 }}>{app.clients?.name ?? '—'}</span>
                        <span style={{ background: sc.bg, color: sc.fg, fontSize: 10, padding: '2px 8px', borderRadius: 8, border: `1px solid ${sc.border}`, fontWeight: 700 }}>{app.status}</span>
                        {app.subsidy_rounds && <span style={{ fontSize: 10, color: C.inkFaint, background: C.bg, padding: '2px 8px', borderRadius: 6, border: `1px solid ${C.border}` }}>{app.subsidy_rounds.round_name}</span>}
                      </div>
                      <div style={{ fontSize: 11, color: C.inkFaint }}>
                        {app.subsidy_frame ?? ''}{app.tool_name ? ` / ${app.tool_name}` : ''}
                      </div>
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

          {/* ==== 補助金情報収集 ==== */}
          {tab === 'collect' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: C.inkMid }}>登録ソースからAIで補助金情報を自動収集</span>
                <button onClick={() => handleSync()} disabled={syncLoading} style={{ background: syncLoading ? C.border : C.accent, color: syncLoading ? C.inkFaint : '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 700, cursor: syncLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>{syncLoading ? '同期中...' : '今すぐ同期'}</button>
              </div>
              {syncResults && (
                <div style={{ background: C.greenBg, border: `1px solid ${C.greenBorder}`, borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
                  <div style={{ fontWeight: 700, color: C.green, marginBottom: 4 }}>同期完了</div>
                  {syncResults.map((r, i) => <div key={i} style={{ color: C.inkMid }}><strong>{r.sourceName}</strong> — {r.status}{r.name ? `（${r.name}）` : ''}</div>)}
                </div>
              )}
              {/* 収集済み */}
              {collected.length > 0 && (
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
                  {collected.map((s, i) => (
                    <div key={s.id} style={{ padding: '12px 18px', borderBottom: i < collected.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
                        {s.is_new && <span style={{ background: C.accent, color: '#fff', fontSize: 9, padding: '1px 6px', borderRadius: 6, fontWeight: 700 }}>NEW</span>}
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{s.name ?? '—'}</span>
                        <span style={{ marginLeft: 'auto', fontSize: 10, color: C.inkFaint }}>{new Date(s.updated_at).toLocaleDateString('ja-JP')}</span>
                      </div>
                      {s.summary && <div style={{ fontSize: 12, color: C.inkMid }}>{s.summary}</div>}
                      <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 11 }}>
                        {s.subsidy_amount && <span style={{ color: C.accent, fontWeight: 600 }}>補助額: {s.subsidy_amount}</span>}
                        {s.subsidy_rate && <span style={{ color: C.green, fontWeight: 600 }}>補助率: {s.subsidy_rate}</span>}
                        {s.application_end && <span style={{ color: C.red }}>締切: {s.application_end}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* ソース管理 */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '12px 18px', background: C.surfaceAlt, borderBottom: `1px solid ${C.border}`, fontSize: 13, fontWeight: 700 }}>収集ソース</div>
                {sources.map((src, i) => (
                  <div key={src.id} style={{ padding: '10px 18px', borderBottom: i < sources.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{src.name}</div>
                      <div style={{ fontSize: 11, color: C.blue, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{src.url}</div>
                    </div>
                    <button onClick={() => handleSync(src.id)} disabled={syncLoading} style={{ background: C.blueBg, color: C.blue, border: `1px solid ${C.blueBorder}`, borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>同期</button>
                    <button onClick={() => handleDeleteSource(src.id)} style={{ background: C.redBg, color: C.red, border: `1px solid ${C.redBorder}`, borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>削除</button>
                  </div>
                ))}
              </div>
              {/* ソース追加 */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>ソース追加</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                  <input value={addName} onChange={e => setAddName(e.target.value)} placeholder="名称" style={{ flex: '1 1 120px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 10px', fontSize: 12, fontFamily: 'inherit', outline: 'none', color: C.ink }} />
                  <input value={addUrl} onChange={e => setAddUrl(e.target.value)} placeholder="URL" style={{ flex: '2 1 200px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 10px', fontSize: 12, fontFamily: 'inherit', outline: 'none', color: C.ink }} />
                  <button onClick={handleAddSource} disabled={!addName || !addUrl} style={{ background: addName && addUrl ? C.accent : C.border, color: addName && addUrl ? '#fff' : C.inkFaint, border: 'none', borderRadius: 6, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: addName && addUrl ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>追加</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
