'use client'

import { useState } from 'react'

const C = {
  bg: '#f5f4f0', surface: '#ffffff', surfaceAlt: '#faf9f6',
  border: '#e5e2da', borderMid: '#d0cdc4',
  ink: '#1a1814', inkMid: '#5a5650', inkFaint: '#9b9890',
  accent: '#c45c1a', accentBg: '#fdf0e8', accentBorder: '#f0c8a4',
  green: '#2d7a47', greenBg: '#edf7f1', greenBorder: '#a8d9b8',
  blue: '#1a5fa8', blueBg: '#eaf2fc', blueBorder: '#a4c8f0',
  red: '#b83232', redBg: '#fdf0f0', redBorder: '#f0b8b8',
} as const

interface SubsidyData {
  name: string | null
  organizer: string | null
  targetBusiness: string | null
  subsidyAmount: string | null
  subsidyRate: string | null
  applicationStart: string | null
  applicationEnd: string | null
  eligibleExpenses: string[]
  requirements: string[]
  procedures: string[]
  requiredDocs: string[]
  contactInfo: string | null
  notes: string[]
  summary: string | null
  itRelated: boolean
  hotelRelated: boolean
}

const EXAMPLE_URLS = [
  'https://www.chusho.meti.go.jp/keiei/itesupport/',
  'https://www.meti.go.jp/policy/jigyou_saisei/kyousouryoku_kyouka/monodzukuri_hojyokin/',
  'https://jizokuka-r3.jp/',
]

export default function SubsidyLookupClient() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ data: SubsidyData; url: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleAnalyze() {
    if (!url.trim() || loading) return
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch('/api/subsidy-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setError(json.error ?? '解析に失敗しました')
      } else {
        setResult({ data: json.data, url: json.url })
      }
    } catch {
      setError('通信エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const d = result?.data

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800 }}>補助金情報調査</h2>
        <p style={{ margin: 0, color: C.inkFaint, fontSize: 13 }}>補助金・助成金のURLを入力すると、要項を読み取りAIで整理して表示します</p>
      </div>

      {/* 入力エリア */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24, marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>補助金ページのURL</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAnalyze() }}
            placeholder="https://www.meti.go.jp/..."
            style={{ flex: 1, background: C.bg, border: `1px solid ${C.borderMid}`, borderRadius: 10, padding: '11px 16px', color: C.ink, fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
          />
          <button
            onClick={handleAnalyze}
            disabled={!url.trim() || loading}
            style={{ background: url.trim() && !loading ? C.accent : C.border, color: url.trim() && !loading ? '#fff' : C.inkFaint, border: 'none', borderRadius: 10, padding: '0 24px', fontSize: 13, fontWeight: 700, cursor: url.trim() && !loading ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap', fontFamily: 'inherit', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            {loading ? (
              <>
                <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                解析中...
              </>
            ) : '🔍 AIで解析'}
          </button>
        </div>

        <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' as const, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: C.inkFaint }}>例:</span>
          {EXAMPLE_URLS.map(u => (
            <button key={u} onClick={() => setUrl(u)} style={{ fontSize: 11, color: C.blue, background: C.blueBg, border: `1px solid ${C.blueBorder}`, borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
              {u.replace('https://', '').split('/')[0]}
            </button>
          ))}
        </div>

        {loading && (
          <div style={{ marginTop: 16, background: C.accentBg, border: `1px solid ${C.accentBorder}`, borderRadius: 10, padding: '12px 16px', fontSize: 12, color: C.accent, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>⏳</span>
            <div>
              <div style={{ fontWeight: 700 }}>AIが要項を読み取り中...</div>
              <div style={{ color: C.inkFaint, marginTop: 2 }}>ページ取得 → テキスト抽出 → Claude で構造化（10〜20秒）</div>
            </div>
          </div>
        )}

        {error && (
          <div style={{ marginTop: 14, background: C.redBg, border: `1px solid ${C.redBorder}`, borderRadius: 10, padding: '12px 16px', fontSize: 12, color: C.red }}>
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* 解析結果 */}
      {d && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ヘッダーカード */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' as const }}>
              {d.itRelated && <span style={{ background: C.blueBg, color: C.blue, fontSize: 11, padding: '3px 10px', borderRadius: 10, border: `1px solid ${C.blueBorder}`, fontWeight: 700 }}>💻 IT・DX関連</span>}
              {d.hotelRelated && <span style={{ background: C.accentBg, color: C.accent, fontSize: 11, padding: '3px 10px', borderRadius: 10, border: `1px solid ${C.accentBorder}`, fontWeight: 700 }}>🏨 宿泊業向け</span>}
              {d.organizer && <span style={{ background: C.bg, color: C.inkMid, fontSize: 11, padding: '3px 10px', borderRadius: 10, border: `1px solid ${C.border}` }}>{d.organizer}</span>}
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: C.ink }}>{d.name ?? '（名称不明）'}</h3>
            {d.summary && <p style={{ margin: '0 0 16px', fontSize: 13, color: C.inkMid, lineHeight: 1.7 }}>{d.summary}</p>}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              {[
                { label: '補助額', value: d.subsidyAmount, color: C.accent },
                { label: '補助率', value: d.subsidyRate, color: C.green },
                { label: '申請開始', value: d.applicationStart, color: C.blue },
                { label: '申請締切', value: d.applicationEnd, color: C.red },
              ].map(item => (
                <div key={item.label} style={{ background: C.bg, borderRadius: 10, padding: '12px 14px', border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 10, color: C.inkFaint, marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: item.color }}>{item.value ?? '—'}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* 対象・要件 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {d.targetBusiness && (
                <InfoCard title="対象事業者" icon="🏢">
                  <p style={{ margin: 0, fontSize: 13, color: C.inkMid, lineHeight: 1.7 }}>{d.targetBusiness}</p>
                </InfoCard>
              )}
              {d.requirements.length > 0 && (
                <InfoCard title="申請要件" icon="✅">
                  <ul style={{ margin: 0, padding: '0 0 0 18px' }}>
                    {d.requirements.map((r, i) => <li key={i} style={{ fontSize: 12, color: C.inkMid, lineHeight: 1.7, marginBottom: 2 }}>{r}</li>)}
                  </ul>
                </InfoCard>
              )}
              {d.eligibleExpenses.length > 0 && (
                <InfoCard title="対象経費" icon="💴">
                  <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
                    {d.eligibleExpenses.map((e, i) => (
                      <span key={i} style={{ background: C.greenBg, color: C.green, fontSize: 11, padding: '3px 10px', borderRadius: 8, border: `1px solid ${C.greenBorder}` }}>{e}</span>
                    ))}
                  </div>
                </InfoCard>
              )}
            </div>

            {/* 手順・書類 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {d.procedures.length > 0 && (
                <InfoCard title="申請手順" icon="📋">
                  <ol style={{ margin: 0, padding: '0 0 0 18px' }}>
                    {d.procedures.map((p, i) => <li key={i} style={{ fontSize: 12, color: C.inkMid, lineHeight: 1.7, marginBottom: 2 }}>{p}</li>)}
                  </ol>
                </InfoCard>
              )}
              {d.requiredDocs.length > 0 && (
                <InfoCard title="必要書類" icon="📄">
                  <ul style={{ margin: 0, padding: '0 0 0 18px' }}>
                    {d.requiredDocs.map((doc, i) => <li key={i} style={{ fontSize: 12, color: C.inkMid, lineHeight: 1.7, marginBottom: 2 }}>{doc}</li>)}
                  </ul>
                </InfoCard>
              )}
              {d.notes.length > 0 && (
                <InfoCard title="注意事項" icon="⚠️">
                  <ul style={{ margin: 0, padding: '0 0 0 18px' }}>
                    {d.notes.map((n, i) => <li key={i} style={{ fontSize: 12, color: C.red, lineHeight: 1.7, marginBottom: 2 }}>{n}</li>)}
                  </ul>
                </InfoCard>
              )}
              {d.contactInfo && (
                <InfoCard title="問い合わせ" icon="📞">
                  <p style={{ margin: 0, fontSize: 12, color: C.inkMid }}>{d.contactInfo}</p>
                </InfoCard>
              )}
            </div>
          </div>

          {/* 元URLリンク */}
          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 11, color: C.inkFaint }}>
              <span style={{ fontWeight: 700, color: C.inkMid }}>解析元URL: </span>{result?.url}
            </div>
            <a href={result?.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: C.blue, textDecoration: 'none', fontWeight: 700, background: C.blueBg, border: `1px solid ${C.blueBorder}`, borderRadius: 6, padding: '5px 12px' }}>
              ↗ 公式ページを開く
            </a>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function InfoCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  const C2 = { surface: '#ffffff', surfaceAlt: '#faf9f6', border: '#e5e2da', ink: '#1a1814', inkFaint: '#9b9890' }
  return (
    <div style={{ background: C2.surface, border: `1px solid ${C2.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ padding: '10px 16px', background: C2.surfaceAlt, borderBottom: `1px solid ${C2.border}`, fontSize: 12, fontWeight: 700, color: C2.ink, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>{icon}</span>{title}
      </div>
      <div style={{ padding: '14px 16px' }}>{children}</div>
    </div>
  )
}
