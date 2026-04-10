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
} as const

// ---- 型定義 ----
interface SubsidyData {
  name: string | null; organizer: string | null; targetBusiness: string | null
  subsidyAmount: string | null; subsidyRate: string | null
  applicationStart: string | null; applicationEnd: string | null
  eligibleExpenses: string[]; requirements: string[]; procedures: string[]
  requiredDocs: string[]; contactInfo: string | null; notes: string[]
  summary: string | null; itRelated: boolean; hotelRelated: boolean
}
interface CollectedSubsidy {
  id: string; source_id: string; source_url: string
  name: string | null; organizer: string | null; target_business: string | null
  subsidy_amount: string | null; subsidy_rate: string | null
  application_start: string | null; application_end: string | null
  eligible_expenses: string[]; requirements: string[]; procedures: string[]
  required_docs: string[]; contact_info: string | null; notes: string[]
  summary: string | null; it_related: boolean; hotel_related: boolean
  is_new: boolean; created_at: string; updated_at: string
}
interface SubsidySource {
  id: string; name: string; url: string; keywords: string[]
  active: boolean; last_crawled_at: string | null; created_at: string
}
interface SyncResult { sourceId: string; sourceName: string; status: string; name?: string }

const EXAMPLE_URLS = [
  'https://www.chusho.meti.go.jp/keiei/itesupport/',
  'https://www.meti.go.jp/policy/jigyou_saisei/kyousouryoku_kyouka/monodzukuri_hojyokin/',
  'https://www.shokokai.or.jp/jizokuka/',
]

// ---- サブコンポーネント ----
function InfoCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ padding: '10px 16px', background: C.surfaceAlt, borderBottom: `1px solid ${C.border}`, fontSize: 12, fontWeight: 700, color: C.ink, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>{icon}</span>{title}
      </div>
      <div style={{ padding: '14px 16px' }}>{children}</div>
    </div>
  )
}

function SubsidyCard({ s, onClick }: { s: CollectedSubsidy; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ width: '100%', textAlign: 'left', background: C.surface, border: `1px solid ${s.is_new ? C.accentBorder : C.border}`, borderRadius: 12, padding: '16px 18px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', boxShadow: s.is_new ? `0 0 0 2px ${C.accentBg}` : '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' as const, alignItems: 'center' }}>
        {s.is_new && <span style={{ background: C.accent, color: '#fff', fontSize: 10, padding: '2px 8px', borderRadius: 8, fontWeight: 700 }}>NEW</span>}
        {s.it_related && <span style={{ background: C.blueBg, color: C.blue, fontSize: 10, padding: '2px 8px', borderRadius: 8, border: `1px solid ${C.blueBorder}`, fontWeight: 600 }}>IT・DX</span>}
        {s.hotel_related && <span style={{ background: C.accentBg, color: C.accent, fontSize: 10, padding: '2px 8px', borderRadius: 8, border: `1px solid ${C.accentBorder}`, fontWeight: 600 }}>宿泊業</span>}
        {s.organizer && <span style={{ background: C.bg, color: C.inkFaint, fontSize: 10, padding: '2px 8px', borderRadius: 8, border: `1px solid ${C.border}` }}>{s.organizer}</span>}
        <span style={{ marginLeft: 'auto', fontSize: 10, color: C.inkFaint }}>{new Date(s.updated_at).toLocaleDateString('ja-JP')}</span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 6 }}>{s.name ?? '（名称不明）'}</div>
      {s.summary && <div style={{ fontSize: 12, color: C.inkMid, lineHeight: 1.6, marginBottom: 8 }}>{s.summary}</div>}
      <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
        {s.subsidy_amount && <span style={{ color: C.accent, fontWeight: 700 }}>💴 {s.subsidy_amount}</span>}
        {s.subsidy_rate && <span style={{ color: C.green, fontWeight: 700 }}>📊 {s.subsidy_rate}</span>}
        {s.application_end && <span style={{ color: C.red }}>🗓 締切: {s.application_end}</span>}
      </div>
    </button>
  )
}

function SubsidyDetail({ s, onClose }: { s: CollectedSubsidy; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: 16, width: '100%', maxWidth: 760, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'sticky', top: 0, background: C.surface, zIndex: 1 }}>
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' as const }}>
              {s.it_related && <span style={{ background: C.blueBg, color: C.blue, fontSize: 11, padding: '2px 8px', borderRadius: 8, border: `1px solid ${C.blueBorder}`, fontWeight: 700 }}>💻 IT・DX</span>}
              {s.hotel_related && <span style={{ background: C.accentBg, color: C.accent, fontSize: 11, padding: '2px 8px', borderRadius: 8, border: `1px solid ${C.accentBorder}`, fontWeight: 700 }}>🏨 宿泊業</span>}
              {s.organizer && <span style={{ background: C.bg, color: C.inkFaint, fontSize: 11, padding: '2px 8px', borderRadius: 8, border: `1px solid ${C.border}` }}>{s.organizer}</span>}
            </div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>{s.name}</h3>
          </div>
          <button onClick={onClose} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: C.inkMid, flexShrink: 0, marginLeft: 12 }}>✕</button>
        </div>
        <div style={{ padding: 24 }}>
          {s.summary && <p style={{ margin: '0 0 20px', fontSize: 13, color: C.inkMid, lineHeight: 1.7 }}>{s.summary}</p>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
            {[
              { label: '補助額', value: s.subsidy_amount, color: C.accent },
              { label: '補助率', value: s.subsidy_rate, color: C.green },
              { label: '申請開始', value: s.application_start, color: C.blue },
              { label: '申請締切', value: s.application_end, color: C.red },
            ].map(item => (
              <div key={item.label} style={{ background: C.bg, borderRadius: 10, padding: '10px 14px', border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 10, color: C.inkFaint, marginBottom: 3 }}>{item.label}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: item.color }}>{item.value ?? '—'}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {s.target_business && <InfoCard title="対象事業者" icon="🏢"><p style={{ margin: 0, fontSize: 12, color: C.inkMid, lineHeight: 1.7 }}>{s.target_business}</p></InfoCard>}
            {s.requirements.length > 0 && <InfoCard title="申請要件" icon="✅"><ul style={{ margin: 0, padding: '0 0 0 18px' }}>{s.requirements.map((r, i) => <li key={i} style={{ fontSize: 12, color: C.inkMid, lineHeight: 1.7, marginBottom: 2 }}>{r}</li>)}</ul></InfoCard>}
            {s.eligible_expenses.length > 0 && <InfoCard title="対象経費" icon="💴"><div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>{s.eligible_expenses.map((e, i) => <span key={i} style={{ background: C.greenBg, color: C.green, fontSize: 11, padding: '3px 10px', borderRadius: 8, border: `1px solid ${C.greenBorder}` }}>{e}</span>)}</div></InfoCard>}
            {s.procedures.length > 0 && <InfoCard title="申請手順" icon="📋"><ol style={{ margin: 0, padding: '0 0 0 18px' }}>{s.procedures.map((p, i) => <li key={i} style={{ fontSize: 12, color: C.inkMid, lineHeight: 1.7, marginBottom: 2 }}>{p}</li>)}</ol></InfoCard>}
            {s.required_docs.length > 0 && <InfoCard title="必要書類" icon="📄"><ul style={{ margin: 0, padding: '0 0 0 18px' }}>{s.required_docs.map((d, i) => <li key={i} style={{ fontSize: 12, color: C.inkMid, lineHeight: 1.7, marginBottom: 2 }}>{d}</li>)}</ul></InfoCard>}
            {s.notes.length > 0 && <InfoCard title="注意事項" icon="⚠️"><ul style={{ margin: 0, padding: '0 0 0 18px' }}>{s.notes.map((n, i) => <li key={i} style={{ fontSize: 12, color: C.red, lineHeight: 1.7, marginBottom: 2 }}>{n}</li>)}</ul></InfoCard>}
          </div>
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <a href={s.source_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: C.blue, textDecoration: 'none', fontWeight: 700, background: C.blueBg, border: `1px solid ${C.blueBorder}`, borderRadius: 8, padding: '8px 16px' }}>
              ↗ 公式ページを開く
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---- メインコンポーネント ----
export default function SubsidyLookupClient() {
  const [tab, setTab] = useState<'manual' | 'collected' | 'settings'>('collected')

  // 手動調査
  const [manualUrl, setManualUrl] = useState('')
  const [manualLoading, setManualLoading] = useState(false)
  const [manualResult, setManualResult] = useState<{ data: SubsidyData; url: string } | null>(null)
  const [manualError, setManualError] = useState<string | null>(null)

  // 自動収集
  const [collected, setCollected] = useState<CollectedSubsidy[]>([])
  const [collectedLoading, setCollectedLoading] = useState(false)
  const [filterMode, setFilterMode] = useState<'all' | 'new' | 'it' | 'hotel'>('all')
  const [selectedSubsidy, setSelectedSubsidy] = useState<CollectedSubsidy | null>(null)
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncResults, setSyncResults] = useState<SyncResult[] | null>(null)

  // 設定
  const [sources, setSources] = useState<SubsidySource[]>([])
  const [sourcesLoading, setSourcesLoading] = useState(false)
  const [addName, setAddName] = useState('')
  const [addUrl, setAddUrl] = useState('')
  const [addKeywords, setAddKeywords] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  const loadCollected = useCallback(async () => {
    setCollectedLoading(true)
    try {
      // Supabaseから直接取得（クライアントサイドなのでAPIを介さず簡易フェッチ）
      const res = await fetch('/api/subsidy-collected')
      if (res.ok) {
        const data = await res.json()
        setCollected(data ?? [])
      }
    } finally {
      setCollectedLoading(false)
    }
  }, [])

  const loadSources = useCallback(async () => {
    setSourcesLoading(true)
    try {
      const res = await fetch('/api/subsidy-sources')
      if (res.ok) setSources(await res.json())
    } finally {
      setSourcesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'collected') loadCollected()
    if (tab === 'settings') loadSources()
  }, [tab, loadCollected, loadSources])

  async function handleManualAnalyze() {
    if (!manualUrl.trim() || manualLoading) return
    setManualLoading(true); setManualResult(null); setManualError(null)
    try {
      const res = await fetch('/api/subsidy-analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: manualUrl.trim() }) })
      const json = await res.json()
      if (!res.ok || !json.success) setManualError(json.error ?? '解析失敗')
      else setManualResult({ data: json.data, url: json.url })
    } catch { setManualError('通信エラー') } finally { setManualLoading(false) }
  }

  async function handleSync(sourceId?: string) {
    setSyncLoading(true); setSyncResults(null)
    try {
      const res = await fetch('/api/subsidy-sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sourceId ? { sourceId } : {}) })
      const json = await res.json()
      if (json.results) { setSyncResults(json.results); loadCollected(); loadSources() }
      else setSyncResults([{ sourceId: '', sourceName: '', status: json.error ?? 'エラー' }])
    } catch { setSyncResults([{ sourceId: '', sourceName: '', status: '通信エラー' }]) } finally { setSyncLoading(false) }
  }

  async function handleAddSource() {
    if (!addName || !addUrl || addLoading) return
    setAddLoading(true)
    try {
      const keywords = addKeywords.split(/[,、\s]+/).filter(Boolean)
      const res = await fetch('/api/subsidy-sources', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: addName, url: addUrl, keywords }) })
      if (res.ok) { setAddName(''); setAddUrl(''); setAddKeywords(''); loadSources() }
    } finally { setAddLoading(false) }
  }

  async function handleDeleteSource(id: string) {
    if (!confirm('このソースを削除しますか？収集済み補助金情報も削除されます。')) return
    await fetch('/api/subsidy-sources', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    loadSources(); loadCollected()
  }

  const filteredCollected = collected.filter(s => {
    if (filterMode === 'new') return s.is_new
    if (filterMode === 'it') return s.it_related
    if (filterMode === 'hotel') return s.hotel_related
    return true
  })

  const d = manualResult?.data

  return (
    <div style={{ maxWidth: 980 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800 }}>補助金情報調査</h2>
        <p style={{ margin: 0, color: C.inkFaint, fontSize: 13 }}>特定サイトの定期自動収集・URLによる手動調査を一元管理</p>
      </div>

      {/* タブ */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: C.bg, borderRadius: 10, padding: 4, width: 'fit-content', border: `1px solid ${C.border}` }}>
        {([
          { id: 'collected', label: `📥 自動収集一覧 ${collected.length > 0 ? `(${collected.length})` : ''}`, badge: collected.filter(s => s.is_new).length },
          { id: 'manual',    label: '🔍 手動URL調査', badge: 0 },
          { id: 'settings',  label: '⚙️ 収集設定',    badge: 0 },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ background: tab === t.id ? C.surface : 'transparent', color: tab === t.id ? C.ink : C.inkMid, border: tab === t.id ? `1px solid ${C.border}` : '1px solid transparent', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: tab === t.id ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', boxShadow: tab === t.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', position: 'relative' as const, transition: 'all 0.15s' }}>
            {t.label}
            {t.badge > 0 && <span style={{ position: 'absolute' as const, top: -6, right: -6, background: C.accent, color: '#fff', fontSize: 10, width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* ===== 自動収集一覧タブ ===== */}
      {tab === 'collected' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' as const, gap: 10 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {([
                { id: 'all',   label: '全て' },
                { id: 'new',   label: '🆕 新着' },
                { id: 'it',    label: '💻 IT・DX' },
                { id: 'hotel', label: '🏨 宿泊業' },
              ] as const).map(f => (
                <button key={f.id} onClick={() => setFilterMode(f.id)} style={{ background: filterMode === f.id ? C.ink : C.surface, color: filterMode === f.id ? '#fff' : C.inkMid, border: `1px solid ${filterMode === f.id ? C.ink : C.border}`, borderRadius: 20, padding: '5px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: filterMode === f.id ? 700 : 500 }}>
                  {f.label}
                </button>
              ))}
            </div>
            <button onClick={() => handleSync()} disabled={syncLoading} style={{ background: syncLoading ? C.border : C.accent, color: syncLoading ? C.inkFaint : '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 12, fontWeight: 700, cursor: syncLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
              {syncLoading ? <><span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />同期中...</> : '🔄 今すぐ同期'}
            </button>
          </div>

          {syncResults && (
            <div style={{ background: C.greenBg, border: `1px solid ${C.greenBorder}`, borderRadius: 10, padding: '12px 16px', marginBottom: 14, fontSize: 12 }}>
              <div style={{ fontWeight: 700, color: C.green, marginBottom: 6 }}>同期完了</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {syncResults.map((r, i) => (
                  <div key={i} style={{ color: C.inkMid }}><span style={{ fontWeight: 600 }}>{r.sourceName}</span> — {r.status}{r.name ? `（${r.name}）` : ''}</div>
                ))}
              </div>
            </div>
          )}

          {collectedLoading && <div style={{ textAlign: 'center', padding: 40, color: C.inkFaint, fontSize: 13 }}>読み込み中...</div>}

          {!collectedLoading && filteredCollected.length === 0 && (
            <div style={{ textAlign: 'center', padding: 48, background: C.surface, borderRadius: 14, border: `1px dashed ${C.borderMid}`, color: C.inkFaint }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.inkMid, marginBottom: 6 }}>収集済みの補助金情報がありません</div>
              <div style={{ fontSize: 12 }}>「今すぐ同期」を押すか、「収集設定」でソースURLを追加してください</div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredCollected.map(s => (
              <SubsidyCard key={s.id} s={s} onClick={() => setSelectedSubsidy(s)} />
            ))}
          </div>
        </div>
      )}

      {/* ===== 手動URL調査タブ ===== */}
      {tab === 'manual' && (
        <div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24, marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>補助金ページのURL</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input type="url" value={manualUrl} onChange={e => setManualUrl(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleManualAnalyze() }} placeholder="https://www.meti.go.jp/..." style={{ flex: 1, background: C.bg, border: `1px solid ${C.borderMid}`, borderRadius: 10, padding: '11px 16px', color: C.ink, fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
              <button onClick={handleManualAnalyze} disabled={!manualUrl.trim() || manualLoading} style={{ background: manualUrl.trim() && !manualLoading ? C.accent : C.border, color: manualUrl.trim() && !manualLoading ? '#fff' : C.inkFaint, border: 'none', borderRadius: 10, padding: '0 24px', fontSize: 13, fontWeight: 700, cursor: manualUrl.trim() && !manualLoading ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' as const, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8 }}>
                {manualLoading ? <><span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />解析中...</> : '🔍 AIで解析'}
              </button>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' as const, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: C.inkFaint }}>例:</span>
              {EXAMPLE_URLS.map(u => <button key={u} onClick={() => setManualUrl(u)} style={{ fontSize: 11, color: C.blue, background: C.blueBg, border: `1px solid ${C.blueBorder}`, borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>{u.replace('https://', '').split('/')[0]}</button>)}
            </div>
            {manualLoading && <div style={{ marginTop: 14, background: C.accentBg, border: `1px solid ${C.accentBorder}`, borderRadius: 10, padding: '12px 16px', fontSize: 12, color: C.accent }}>⏳ ページ取得 → テキスト抽出 → Claude で構造化中（10〜20秒）...</div>}
            {manualError && <div style={{ marginTop: 12, background: C.redBg, border: `1px solid ${C.redBorder}`, borderRadius: 10, padding: '12px 16px', fontSize: 12, color: C.red }}>⚠️ {manualError}</div>}
          </div>

          {d && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' as const }}>
                  {d.itRelated && <span style={{ background: C.blueBg, color: C.blue, fontSize: 11, padding: '3px 10px', borderRadius: 10, border: `1px solid ${C.blueBorder}`, fontWeight: 700 }}>💻 IT・DX</span>}
                  {d.hotelRelated && <span style={{ background: C.accentBg, color: C.accent, fontSize: 11, padding: '3px 10px', borderRadius: 10, border: `1px solid ${C.accentBorder}`, fontWeight: 700 }}>🏨 宿泊業</span>}
                  {d.organizer && <span style={{ background: C.bg, color: C.inkFaint, fontSize: 11, padding: '3px 10px', borderRadius: 10, border: `1px solid ${C.border}` }}>{d.organizer}</span>}
                </div>
                <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800 }}>{d.name ?? '（名称不明）'}</h3>
                {d.summary && <p style={{ margin: '0 0 16px', fontSize: 13, color: C.inkMid, lineHeight: 1.7 }}>{d.summary}</p>}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                  {[{ label: '補助額', value: d.subsidyAmount, color: C.accent }, { label: '補助率', value: d.subsidyRate, color: C.green }, { label: '申請開始', value: d.applicationStart, color: C.blue }, { label: '申請締切', value: d.applicationEnd, color: C.red }].map(item => (
                    <div key={item.label} style={{ background: C.bg, borderRadius: 10, padding: '10px 14px', border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 10, color: C.inkFaint, marginBottom: 3 }}>{item.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: item.color }}>{item.value ?? '—'}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {d.targetBusiness && <InfoCard title="対象事業者" icon="🏢"><p style={{ margin: 0, fontSize: 12, color: C.inkMid, lineHeight: 1.7 }}>{d.targetBusiness}</p></InfoCard>}
                  {d.requirements.length > 0 && <InfoCard title="申請要件" icon="✅"><ul style={{ margin: 0, padding: '0 0 0 18px' }}>{d.requirements.map((r, i) => <li key={i} style={{ fontSize: 12, color: C.inkMid, lineHeight: 1.7, marginBottom: 2 }}>{r}</li>)}</ul></InfoCard>}
                  {d.eligibleExpenses.length > 0 && <InfoCard title="対象経費" icon="💴"><div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>{d.eligibleExpenses.map((e, i) => <span key={i} style={{ background: C.greenBg, color: C.green, fontSize: 11, padding: '3px 10px', borderRadius: 8, border: `1px solid ${C.greenBorder}` }}>{e}</span>)}</div></InfoCard>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {d.procedures.length > 0 && <InfoCard title="申請手順" icon="📋"><ol style={{ margin: 0, padding: '0 0 0 18px' }}>{d.procedures.map((p, i) => <li key={i} style={{ fontSize: 12, color: C.inkMid, lineHeight: 1.7, marginBottom: 2 }}>{p}</li>)}</ol></InfoCard>}
                  {d.requiredDocs.length > 0 && <InfoCard title="必要書類" icon="📄"><ul style={{ margin: 0, padding: '0 0 0 18px' }}>{d.requiredDocs.map((doc, i) => <li key={i} style={{ fontSize: 12, color: C.inkMid, lineHeight: 1.7, marginBottom: 2 }}>{doc}</li>)}</ul></InfoCard>}
                  {d.notes.length > 0 && <InfoCard title="注意事項" icon="⚠️"><ul style={{ margin: 0, padding: '0 0 0 18px' }}>{d.notes.map((n, i) => <li key={i} style={{ fontSize: 12, color: C.red, lineHeight: 1.7, marginBottom: 2 }}>{n}</li>)}</ul></InfoCard>}
                </div>
              </div>
              <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 11, color: C.inkFaint }}><span style={{ fontWeight: 700, color: C.inkMid }}>解析元URL: </span>{manualResult?.url}</div>
                <a href={manualResult?.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: C.blue, textDecoration: 'none', fontWeight: 700, background: C.blueBg, border: `1px solid ${C.blueBorder}`, borderRadius: 6, padding: '5px 12px' }}>↗ 公式ページを開く</a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== 収集設定タブ ===== */}
      {tab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* 仕組みの説明 */}
          <div style={{ background: C.purpleBg, border: `1px solid ${C.purpleBorder}`, borderRadius: 12, padding: '14px 20px', fontSize: 12, color: C.purple, lineHeight: 1.7 }}>
            <strong>自動収集の仕組み:</strong> 毎週月曜 09:00 (JST) に Vercel Cron が発火 → 各ソースURLをFirecrawlでスクレイプ → キーワードマッチ → Claudeで構造化 → Supabaseに保存。
            <br />「今すぐ同期」で手動実行も可能です。<strong>FIRECRAWL_API_KEY</strong> を Vercel 環境変数に設定してください。
          </div>

          {/* ソース一覧 */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ padding: '14px 20px', background: C.surfaceAlt, borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>収集ソース一覧</div>
              <button onClick={() => handleSync()} disabled={syncLoading} style={{ background: syncLoading ? C.border : C.green, color: syncLoading ? C.inkFaint : '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: syncLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {syncLoading ? '同期中...' : '🔄 全ソース同期'}
              </button>
            </div>
            {sourcesLoading ? (
              <div style={{ padding: 24, textAlign: 'center', color: C.inkFaint, fontSize: 13 }}>読み込み中...</div>
            ) : sources.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: C.inkFaint, fontSize: 13 }}>ソースがありません</div>
            ) : (
              <div>
                {sources.map((src, i) => (
                  <div key={src.id} style={{ padding: '14px 20px', borderBottom: i < sources.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: C.ink }}>{src.name}</span>
                        <span style={{ background: src.active ? C.greenBg : C.bg, color: src.active ? C.green : C.inkFaint, fontSize: 10, padding: '1px 8px', borderRadius: 8, border: `1px solid ${src.active ? C.greenBorder : C.border}` }}>{src.active ? '有効' : '無効'}</span>
                      </div>
                      <div style={{ fontSize: 11, color: C.blue, marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{src.url}</div>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const }}>
                        {(src.keywords ?? []).map((kw: string) => (
                          <span key={kw} style={{ background: C.accentBg, color: C.accent, fontSize: 10, padding: '2px 8px', borderRadius: 6, border: `1px solid ${C.accentBorder}` }}>{kw}</span>
                        ))}
                      </div>
                      {src.last_crawled_at && <div style={{ fontSize: 10, color: C.inkFaint, marginTop: 4 }}>最終同期: {new Date(src.last_crawled_at).toLocaleString('ja-JP')}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => handleSync(src.id)} disabled={syncLoading} style={{ background: C.blueBg, color: C.blue, border: `1px solid ${C.blueBorder}`, borderRadius: 6, padding: '5px 10px', fontSize: 11, cursor: syncLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>同期</button>
                      <button onClick={() => handleDeleteSource(src.id)} style={{ background: C.redBg, color: C.red, border: `1px solid ${C.redBorder}`, borderRadius: 6, padding: '5px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>削除</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ソース追加 */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>新しいソースを追加</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
                <input value={addName} onChange={e => setAddName(e.target.value)} placeholder="ソース名（例：観光庁）" style={{ background: C.bg, border: `1px solid ${C.borderMid}`, borderRadius: 8, padding: '9px 14px', color: C.ink, fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
                <input value={addUrl} onChange={e => setAddUrl(e.target.value)} placeholder="URL（https://...）" style={{ background: C.bg, border: `1px solid ${C.borderMid}`, borderRadius: 8, padding: '9px 14px', color: C.ink, fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input value={addKeywords} onChange={e => setAddKeywords(e.target.value)} placeholder="キーワード（カンマ区切り）例: IT導入, 補助金, 宿泊" style={{ flex: 1, background: C.bg, border: `1px solid ${C.borderMid}`, borderRadius: 8, padding: '9px 14px', color: C.ink, fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
                <button onClick={handleAddSource} disabled={!addName || !addUrl || addLoading} style={{ background: addName && addUrl && !addLoading ? C.accent : C.border, color: addName && addUrl && !addLoading ? '#fff' : C.inkFaint, border: 'none', borderRadius: 8, padding: '0 20px', fontSize: 13, fontWeight: 700, cursor: addName && addUrl && !addLoading ? 'pointer' : 'not-allowed', fontFamily: 'inherit', whiteSpace: 'nowrap' as const }}>
                  ＋ 追加
                </button>
              </div>
            </div>
          </div>

          {/* cronスケジュール説明 */}
          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 20px', fontSize: 12, color: C.inkMid }}>
            <div style={{ fontWeight: 700, marginBottom: 6, color: C.ink }}>Vercel Cron スケジュール</div>
            <div style={{ fontFamily: 'monospace', background: C.surface, padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, marginBottom: 8, fontSize: 12 }}>0 0 * * 1  →  毎週月曜 09:00 JST に自動同期</div>
            <div>vercel.json の crons セクションで設定済みです。変更は vercel.json を編集してください。</div>
          </div>
        </div>
      )}

      {/* 詳細モーダル */}
      {selectedSubsidy && <SubsidyDetail s={selectedSubsidy} onClose={() => setSelectedSubsidy(null)} />}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
