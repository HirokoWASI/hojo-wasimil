'use client'

import { useState } from 'react'

const C = {
  bg: '#f5f4f0',
  surface: '#ffffff',
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
} as const

type Result = {
  score: number
  eligible: boolean
  frame: string
  maxAmount: string
  subsidyRate: string
  reasons: string[]
  requiredDocs: string[]
  risks: string[]
  nextAction: string
  error?: string
} | null

export default function ScreeningPage() {
  const [form, setForm] = useState({
    clientName: '', employees: '', revenue: '', hasHistory: 'なし', currentSystem: '', note: '',
  })
  const [result, setResult] = useState<Result>(null)
  const [loading, setLoading] = useState(false)

  const inp = {
    background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
    padding: '9px 12px', color: C.ink, fontSize: 13, width: '100%',
    outline: 'none', fontFamily: 'inherit',
  }

  async function runScreening() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/screening', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      setResult(data.result ?? data)
    } catch (e: any) {
      setResult({ score: 0, eligible: false, frame: '', maxAmount: '', subsidyRate: '', reasons: [], requiredDocs: [], risks: [], nextAction: '', error: e.message })
    }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800 }}>AI適格審査</h2>
        <p style={{ margin: 0, color: C.inkFaint, fontSize: 13 }}>施設情報を入力してClaudeによる補助金適格性診断を実行します</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
        {/* 入力フォーム */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: 14, fontWeight: 700 }}>🔍 適格性スクリーニング</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              ['施設名', 'clientName', '例: 城崎温泉 西村屋'],
              ['従業員数（名）', 'employees', '例: 45'],
              ['直近売上高（万円）', 'revenue', '例: 8000'],
              ['現在のシステム', 'currentSystem', '例: TLリンカーン'],
              ['備考', 'note', '特記事項'],
            ].map(([label, key, ph]) => (
              <div key={key}>
                <div style={{ fontSize: 11, color: C.inkFaint, marginBottom: 5 }}>{label}</div>
                <input
                  style={inp}
                  placeholder={ph}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
            <div>
              <div style={{ fontSize: 11, color: C.inkFaint, marginBottom: 5 }}>補助金受給歴</div>
              <select style={inp} value={form.hasHistory} onChange={(e) => setForm(f => ({ ...f, hasHistory: e.target.value }))}>
                <option>なし</option>
                <option>IT導入補助金 受給済</option>
                <option>その他補助金 受給済</option>
              </select>
            </div>
            <button
              onClick={runScreening}
              disabled={loading || !form.clientName}
              style={{ background: loading || !form.clientName ? C.border : C.accent, color: loading || !form.clientName ? C.inkFaint : '#fff', border: 'none', borderRadius: 8, padding: '11px 20px', fontWeight: 700, fontSize: 13, cursor: loading || !form.clientName ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginTop: 4 }}
            >
              {loading ? '⏳ AI診断中...' : '⚡ AI診断を実行'}
            </button>
          </div>
        </div>

        {/* 診断結果 */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, minHeight: 300, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: 14, fontWeight: 700 }}>📊 診断結果</h3>
          {!result && !loading && (
            <div style={{ color: C.inkFaint, fontSize: 13, textAlign: 'center', paddingTop: 60 }}>左のフォームで診断を実行してください</div>
          )}
          {loading && (
            <div style={{ color: C.inkFaint, fontSize: 13, textAlign: 'center', paddingTop: 60 }}>Claude が解析中...</div>
          )}
          {result && !result.error && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: result.score >= 70 ? C.greenBg : C.redBg, border: `1px solid ${result.score >= 70 ? C.greenBorder : C.redBorder}`, borderRadius: 10, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 11, color: C.inkFaint, marginBottom: 4 }}>適格性スコア</div>
                  <div style={{ fontSize: 36, fontWeight: 800, fontFamily: 'monospace', color: result.score >= 70 ? C.green : C.red }}>{result.score}<span style={{ fontSize: 16 }}>/100</span></div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18 }}>{result.eligible ? '✅ 申請推奨' : '⚠️ 要確認'}</div>
                  <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 4 }}>{result.frame}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: C.accentBg, border: `1px solid ${C.accentBorder}`, borderRadius: 8, padding: '12px 16px' }}>
                  <div style={{ fontSize: 10, color: C.inkFaint, marginBottom: 4 }}>最大補助額</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: C.accent }}>{result.maxAmount}</div>
                </div>
                <div style={{ background: C.blueBg, border: `1px solid ${C.blueBorder}`, borderRadius: 8, padding: '12px 16px' }}>
                  <div style={{ fontSize: 10, color: C.inkFaint, marginBottom: 4 }}>補助率</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: C.blue }}>{result.subsidyRate}</div>
                </div>
              </div>

              {result.reasons.length > 0 && (
                <div>
                  {result.reasons.map((r, i) => (
                    <div key={i} style={{ fontSize: 12, color: C.inkMid, padding: '3px 0', display: 'flex', gap: 8 }}>
                      <span style={{ color: C.green }}>✓</span>{r}
                    </div>
                  ))}
                </div>
              )}

              {result.risks.length > 0 && (
                <div style={{ background: C.redBg, border: `1px solid ${C.redBorder}`, borderRadius: 8, padding: '12px 16px' }}>
                  <div style={{ fontSize: 11, color: C.red, fontWeight: 700, marginBottom: 6 }}>⚠ 注意事項</div>
                  {result.risks.map((r, i) => <div key={i} style={{ fontSize: 12, color: C.inkMid }}>{r}</div>)}
                </div>
              )}

              <div style={{ background: C.greenBg, border: `1px solid ${C.greenBorder}`, borderRadius: 8, padding: '12px 16px' }}>
                <div style={{ fontSize: 11, color: C.green, fontWeight: 700, marginBottom: 4 }}>🚀 ネクストアクション</div>
                <div style={{ fontSize: 13 }}>{result.nextAction}</div>
              </div>
            </div>
          )}
          {result?.error && <div style={{ color: C.red, fontSize: 13 }}>{result.error}</div>}
        </div>
      </div>
    </div>
  )
}
