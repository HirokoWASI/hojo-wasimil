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
} as const

interface CollectedSubsidy { id: string; name: string | null; organizer: string | null; summary: string | null; subsidy_amount: string | null; subsidy_rate: string | null; application_end: string | null; it_related: boolean; hotel_related: boolean; is_new: boolean; updated_at: string; source_url: string }
interface SubsidySource { id: string; name: string; url: string; keywords: string[]; active: boolean; last_crawled_at: string | null }
interface SyncResult { sourceId: string; sourceName: string; status: string; name?: string }

export default function SubsidyCollectPage() {
  const [collected, setCollected] = useState<CollectedSubsidy[]>([])
  const [sources, setSources] = useState<SubsidySource[]>([])
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncResults, setSyncResults] = useState<SyncResult[] | null>(null)
  const [addName, setAddName] = useState('')
  const [addUrl, setAddUrl] = useState('')
  const [addKw, setAddKw] = useState('')
  const [filter, setFilter] = useState<'all' | 'new' | 'it' | 'hotel'>('all')

  const loadData = useCallback(async () => {
    const [cRes, sRes] = await Promise.all([fetch('/api/subsidy-collected'), fetch('/api/subsidy-sources')])
    if (cRes.ok) setCollected(await cRes.json())
    if (sRes.ok) setSources(await sRes.json())
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function handleSync(sourceId?: string) {
    setSyncLoading(true); setSyncResults(null)
    try {
      const res = await fetch('/api/subsidy-sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sourceId ? { sourceId } : {}) })
      const json = await res.json()
      if (json.results) { setSyncResults(json.results); loadData() }
    } finally { setSyncLoading(false) }
  }

  async function handleAddSource() {
    if (!addName || !addUrl) return
    await fetch('/api/subsidy-sources', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: addName, url: addUrl, keywords: addKw.split(/[,、\s]+/).filter(Boolean) }) })
    setAddName(''); setAddUrl(''); setAddKw(''); loadData()
  }

  async function handleDeleteSource(id: string) {
    if (!confirm('このソースを削除しますか？')) return
    await fetch('/api/subsidy-sources', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    loadData()
  }

  const filtered = collected.filter(s => {
    if (filter === 'new') return s.is_new
    if (filter === 'it') return s.it_related
    if (filter === 'hotel') return s.hotel_related
    return true
  })

  const inp = { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 10px', fontSize: 12, fontFamily: 'inherit', outline: 'none', color: C.ink } as const

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800 }}>補助金情報収集</h2>
        <p style={{ margin: 0, color: C.inkFaint, fontSize: 13 }}>登録ソースから補助金情報をAIで自動収集し、AZOOの顧客に適用可能な補助金をリサーチ</p>
      </div>

      {/* 同期ボタン */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {([['all', '全て'], ['new', '新着'], ['it', 'IT・DX'], ['hotel', '宿泊業']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id)} style={{ background: filter === id ? C.ink : C.surface, color: filter === id ? '#fff' : C.inkMid, border: `1px solid ${filter === id ? C.ink : C.border}`, borderRadius: 20, padding: '5px 14px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: filter === id ? 700 : 500 }}>{label}</button>
          ))}
        </div>
        <button onClick={() => handleSync()} disabled={syncLoading} style={{ background: syncLoading ? C.border : C.accent, color: syncLoading ? C.inkFaint : '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 12, fontWeight: 700, cursor: syncLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
          {syncLoading ? '同期中...' : '今すぐ同期'}
        </button>
      </div>

      {/* 同期結果 */}
      {syncResults && (
        <div style={{ background: C.greenBg, border: `1px solid ${C.greenBorder}`, borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 12 }}>
          <div style={{ fontWeight: 700, color: C.green, marginBottom: 4 }}>同期完了</div>
          {syncResults.map((r, i) => <div key={i} style={{ color: C.inkMid }}><strong>{r.sourceName}</strong> — {r.status}{r.name ? `（${r.name}）` : ''}</div>)}
        </div>
      )}

      {/* 収集済み一覧 */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: '14px 20px', background: C.surfaceAlt, borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 800 }}>収集済み補助金情報（{filtered.length}件）</span>
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: C.inkFaint, fontSize: 13 }}>
            {collected.length === 0 ? 'まだ収集データがありません。ソースを追加して同期してください。' : 'フィルタに一致する補助金がありません'}
          </div>
        ) : filtered.map((s, i) => (
          <div key={s.id} style={{ padding: '14px 20px', borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none' }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
              {s.is_new && <span style={{ background: C.accent, color: '#fff', fontSize: 9, padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>NEW</span>}
              {s.it_related && <span style={{ background: C.blueBg, color: C.blue, fontSize: 9, padding: '2px 6px', borderRadius: 6, border: `1px solid ${C.blueBorder}` }}>IT・DX</span>}
              {s.hotel_related && <span style={{ background: C.accentBg, color: C.accent, fontSize: 9, padding: '2px 6px', borderRadius: 6, border: `1px solid ${C.accentBorder}` }}>宿泊業</span>}
              {s.organizer && <span style={{ fontSize: 10, color: C.inkFaint, background: C.bg, padding: '2px 6px', borderRadius: 6 }}>{s.organizer}</span>}
              <span style={{ marginLeft: 'auto', fontSize: 10, color: C.inkFaint }}>{new Date(s.updated_at).toLocaleDateString('ja-JP')}</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 3 }}>{s.name ?? '—'}</div>
            {s.summary && <div style={{ fontSize: 12, color: C.inkMid, lineHeight: 1.5, marginBottom: 6 }}>{s.summary}</div>}
            <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
              {s.subsidy_amount && <span style={{ color: C.accent, fontWeight: 600 }}>補助額: {s.subsidy_amount}</span>}
              {s.subsidy_rate && <span style={{ color: C.green, fontWeight: 600 }}>補助率: {s.subsidy_rate}</span>}
              {s.application_end && <span style={{ color: C.red }}>締切: {s.application_end}</span>}
              <a href={s.source_url} target="_blank" rel="noopener noreferrer" style={{ color: C.blue, textDecoration: 'none', marginLeft: 'auto' }}>公式 ↗</a>
            </div>
          </div>
        ))}
      </div>

      {/* ソース管理 */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: '14px 20px', background: C.surfaceAlt, borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 800 }}>収集ソース（{sources.length}件）</span>
          <button onClick={() => handleSync()} disabled={syncLoading} style={{ background: syncLoading ? C.border : C.green, color: syncLoading ? C.inkFaint : '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 11, fontWeight: 700, cursor: syncLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>全ソース同期</button>
        </div>
        {sources.map((src, i) => (
          <div key={src.id} style={{ padding: '12px 20px', borderBottom: i < sources.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{src.name}</span>
                <span style={{ fontSize: 10, color: src.active ? C.green : C.inkFaint, background: src.active ? C.greenBg : C.bg, padding: '1px 6px', borderRadius: 6 }}>{src.active ? '有効' : '無効'}</span>
              </div>
              <div style={{ fontSize: 11, color: C.blue, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{src.url}</div>
              {src.last_crawled_at && <div style={{ fontSize: 10, color: C.inkFaint, marginTop: 2 }}>最終同期: {new Date(src.last_crawled_at).toLocaleString('ja-JP')}</div>}
            </div>
            <button onClick={() => handleSync(src.id)} disabled={syncLoading} style={{ background: C.blueBg, color: C.blue, border: `1px solid ${C.blueBorder}`, borderRadius: 6, padding: '5px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>同期</button>
            <button onClick={() => handleDeleteSource(src.id)} style={{ background: C.redBg, color: C.red, border: `1px solid ${C.redBorder}`, borderRadius: 6, padding: '5px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>削除</button>
          </div>
        ))}
      </div>

      {/* ソース追加 */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>新しいソースを追加</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10, marginBottom: 10 }}>
          <input value={addName} onChange={e => setAddName(e.target.value)} placeholder="ソース名（例: 観光庁）" style={inp} />
          <input value={addUrl} onChange={e => setAddUrl(e.target.value)} placeholder="URL（https://...）" style={inp} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input value={addKw} onChange={e => setAddKw(e.target.value)} placeholder="キーワード（カンマ区切り、任意）" style={{ ...inp, flex: 1 }} />
          <button onClick={handleAddSource} disabled={!addName || !addUrl} style={{ background: addName && addUrl ? C.accent : C.border, color: addName && addUrl ? '#fff' : C.inkFaint, border: 'none', borderRadius: 8, padding: '0 20px', fontSize: 13, fontWeight: 700, cursor: addName && addUrl ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>＋ 追加</button>
        </div>
      </div>
    </div>
  )
}
