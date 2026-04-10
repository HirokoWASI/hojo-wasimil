'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

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
  yellow: '#7a5c00',
  yellowBg: '#fdf8e8',
  yellowBorder: '#e8d490',
} as const

const DOC_TYPES = ['IT導入計画書', '事業計画書']

type App = { id: string; subsidy_type: string; status: string; clients?: { name: string } }

export default function DraftPage() {
  const [applications, setApplications] = useState<App[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [docType, setDocType] = useState(DOC_TYPES[0])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('applications')
      .select('id, subsidy_type, status, clients(name)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data?.length) {
          setApplications(data as unknown as App[])
          setSelectedId(data[0].id)
        }
      })
  }, [])

  const sel = applications.find(a => a.id === selectedId) ?? applications[0]

  const inp = {
    background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
    padding: '9px 12px', color: C.ink, fontSize: 13, width: '100%',
    outline: 'none', fontFamily: 'inherit',
  }

  async function generate() {
    if (!selectedId) return
    setLoading(true)
    setDraft('')
    try {
      const res = await fetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: selectedId, docType }),
      })
      const data = await res.json()
      setDraft(data.draft ?? data.error ?? '生成に失敗しました')
    } catch (e: unknown) {
      setDraft('生成に失敗しました: ' + (e instanceof Error ? e.message : String(e)))
    }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800 }}>書類ドラフト生成</h2>
        <p style={{ margin: 0, color: C.inkFaint, fontSize: 13 }}>AIがIT導入計画書・事業計画書のドラフトを自動生成します</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>
        {/* 案件リスト */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, fontSize: 11, color: C.inkFaint, fontWeight: 700, textTransform: 'uppercase' as const, background: C.surfaceAlt }}>
            申請案件を選択
          </div>
          {applications.length === 0 && (
            <div style={{ padding: 20, fontSize: 13, color: C.inkFaint, textAlign: 'center' as const }}>案件を読み込み中...</div>
          )}
          {applications.map(a => (
            <div
              key={a.id}
              onClick={() => { setSelectedId(a.id); setDraft('') }}
              style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, cursor: 'pointer', background: selectedId === a.id ? C.accentBg : 'transparent', borderLeft: selectedId === a.id ? `3px solid ${C.accent}` : '3px solid transparent', transition: 'all 0.15s' }}
            >
              <div style={{ fontSize: 13, fontWeight: 600 }}>{(a as any).clients?.name ?? '—'}</div>
              <div style={{ fontSize: 11, color: C.inkFaint, marginTop: 3 }}>{a.subsidy_type}</div>
              <div style={{ marginTop: 6 }}>
                <span style={{ fontSize: 10, color: C.inkFaint, background: C.bg, border: `1px solid ${C.border}`, padding: '2px 8px', borderRadius: 10 }}>{a.status}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ドラフト生成 */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>📝 申請書類 ドラフト生成</h3>
              <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 4 }}>
                {sel ? `${(sel as any).clients?.name ?? '—'} — ${sel.subsidy_type}` : '案件を選択してください'}
              </div>
            </div>
            <button
              onClick={generate}
              disabled={loading || !selectedId}
              style={{ background: loading || !selectedId ? C.border : C.accent, color: loading || !selectedId ? C.inkFaint : '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, fontSize: 13, cursor: loading || !selectedId ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
            >
              {loading ? '⏳ 生成中...' : '⚡ ドラフト生成'}
            </button>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: C.inkFaint, marginBottom: 5 }}>書類種別</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {DOC_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => { setDocType(t); setDraft('') }}
                  style={{ background: docType === t ? C.accentBg : C.surface, color: docType === t ? C.accent : C.inkMid, border: `1px solid ${docType === t ? C.accentBorder : C.border}`, borderRadius: 8, padding: '6px 16px', fontSize: 12, cursor: 'pointer', fontWeight: docType === t ? 700 : 500, fontFamily: 'inherit' }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {!draft && !loading && (
            <div style={{ color: C.inkFaint, fontSize: 13, textAlign: 'center' as const, padding: '60px 0' }}>
              案件と書類種別を選んで「ドラフト生成」を押してください
            </div>
          )}
          {loading && (
            <div style={{ color: C.inkFaint, fontSize: 13, textAlign: 'center' as const, padding: '60px 0' }}>
              Claude が作成中...
            </div>
          )}
          {draft && (
            <div>
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                style={{ width: '100%', minHeight: 360, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, color: C.ink, fontSize: 13, lineHeight: 1.8, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' as const }}
              />
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button onClick={() => navigator.clipboard.writeText(draft)} style={{ background: C.surface, color: C.inkMid, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>📋 コピー</button>
                <button onClick={generate} style={{ background: C.surface, color: C.inkMid, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>🔄 再生成</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
