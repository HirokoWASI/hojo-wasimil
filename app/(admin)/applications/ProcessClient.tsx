'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Application, Document, EmailLog } from '@/types/database'

const C = {
  bg: '#f5f4f0', surface: '#ffffff', surfaceAlt: '#faf9f6',
  border: '#e5e2da', borderMid: '#d0cdc4',
  ink: '#1a1814', inkMid: '#5a5650', inkFaint: '#9b9890',
  accent: '#c45c1a', accentBg: '#fdf0e8', accentBorder: '#f0c8a4',
  green: '#2d7a47', greenBg: '#edf7f1', greenBorder: '#a8d9b8',
  blue: '#1a5fa8', blueBg: '#eaf2fc', blueBorder: '#a4c8f0',
  red: '#b83232', redBg: '#fdf0f0', redBorder: '#f0b8b8',
  yellow: '#7a5c00', yellowBg: '#fdf8e8', yellowBorder: '#e8d490',
  purple: '#6a3fa0', purpleBg: '#f5f0fc', purpleBorder: '#c8a8e8',
} as const

const APP_STATUS_CFG: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  '適格審査中': { color: C.yellow, bg: C.yellowBg, border: C.yellowBorder, icon: '◐' },
  '書類準備中': { color: C.blue,   bg: C.blueBg,   border: C.blueBorder,   icon: '◑' },
  '申請中':     { color: C.accent, bg: C.accentBg, border: C.accentBorder, icon: '◕' },
  '採択待ち':   { color: C.purple, bg: C.purpleBg, border: C.purpleBorder, icon: '◔' },
  '採択済':     { color: C.green,  bg: C.greenBg,  border: C.greenBorder,  icon: '●' },
  '不採択':     { color: C.red,    bg: C.redBg,    border: C.redBorder,    icon: '○' },
}

const DOC_STATUS_CFG: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  '未提出':   { color: C.inkFaint, bg: C.bg,       border: C.border,       icon: '○' },
  '提出済':   { color: C.blue,     bg: C.blueBg,   border: C.blueBorder,   icon: '◑' },
  '確認中':   { color: C.yellow,   bg: C.yellowBg, border: C.yellowBorder, icon: '◐' },
  '承認済':   { color: C.green,    bg: C.greenBg,  border: C.greenBorder,  icon: '●' },
  '差し戻し': { color: C.red,      bg: C.redBg,    border: C.redBorder,    icon: '✕' },
}

export type AppRow = Application & {
  clients: { name: string; email: string; contact_name: string | null }
  docs: Document[]
  alerts: EmailLog[]
  daysLeft: number | null
}

function AppBadge({ status }: { status: string }) {
  const cfg = APP_STATUS_CFG[status] ?? { color: C.inkFaint, bg: C.bg, border: C.border, icon: '○' }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {cfg.icon} {status}
    </span>
  )
}

function DocBadge({ status }: { status: string }) {
  const cfg = DOC_STATUS_CFG[status] ?? { color: C.inkFaint, bg: C.bg, border: C.border, icon: '○' }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {cfg.icon} {status}
    </span>
  )
}

function GhostBtn({ label, onClick, style: extraStyle }: { label: string; onClick: () => void; style?: React.CSSProperties }) {
  return (
    <button onClick={onClick} style={{ background: C.surface, color: C.inkMid, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit', ...(extraStyle ?? {}) }}>
      {label}
    </button>
  )
}

export default function ProcessClient({ initialApps }: { initialApps: AppRow[] }) {
  const [apps, setApps] = useState<AppRow[]>(initialApps)
  const [selId, setSelId] = useState<string>(initialApps[0]?.id ?? '')
  const [view, setView] = useState<'admin' | 'portal'>('admin')
  const [uploadDocId, setUploadDocId] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [showReturnModal, setShowReturnModal] = useState<string | null>(null)
  const [returnNote, setReturnNote] = useState('')
  const [alertType, setAlertType] = useState('reminder')
  const [alertSubject, setAlertSubject] = useState('')
  const [alertBody, setAlertBody] = useState('')
  const [alertTiming, setAlertTiming] = useState('now')
  const [alertSent, setAlertSent] = useState(false)
  const [alertSending, setAlertSending] = useState(false)
  const [toast, setToast] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const client = apps.find(a => a.id === selId) ?? apps[0]
  if (!client) return <div style={{ padding: 40, color: C.inkFaint, textAlign: 'center' }}>案件がありません</div>

  const requiredDocs = client.docs.filter(d => d.required)
  const approvedDocs = client.docs.filter(d => d.status === '承認済')
  const pct = requiredDocs.length > 0 ? Math.round(approvedDocs.length / requiredDocs.length * 100) : 0

  const urgColor  = !client.daysLeft ? C.inkFaint : client.daysLeft < 14 ? C.red    : client.daysLeft < 28 ? C.yellow    : C.green
  const urgBg     = !client.daysLeft ? C.bg       : client.daysLeft < 14 ? C.redBg  : client.daysLeft < 28 ? C.yellowBg  : C.greenBg
  const urgBorder = !client.daysLeft ? C.border   : client.daysLeft < 14 ? C.redBorder : client.daysLeft < 28 ? C.yellowBorder : C.greenBorder

  const inp: React.CSSProperties = {
    background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
    padding: '8px 12px', color: C.ink, fontSize: 13, width: '100%',
    outline: 'none', fontFamily: 'inherit',
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function updateDocInState(appId: string, docId: string, patch: Partial<Document>) {
    setApps(prev => prev.map(a => {
      if (a.id !== appId) return a
      return { ...a, docs: a.docs.map(d => d.id === docId ? { ...d, ...patch } : d) }
    }))
  }

  function addAlertToState(appId: string, alert: EmailLog) {
    setApps(prev => prev.map(a => {
      if (a.id !== appId) return a
      return { ...a, alerts: [alert, ...a.alerts] }
    }))
  }

  async function handleApprove(docId: string) {
    const doc = client.docs.find(d => d.id === docId)
    if (!doc) return
    await supabase.from('documents').update({ status: '承認済' }).eq('id', docId)
    updateDocInState(client.id, docId, { status: '承認済' })
    showToast(`${doc.name} を承認しました`)
  }

  async function handleReturn() {
    if (!showReturnModal || !returnNote) return
    const doc = client.docs.find(d => d.id === showReturnModal)
    if (!doc) return
    await supabase.from('documents').update({ status: '差し戻し', note: returnNote }).eq('id', showReturnModal)
    updateDocInState(client.id, showReturnModal, { status: '差し戻し', note: returnNote })
    showToast('差し戻しメールを送信しました')
    setShowReturnModal(null)
    setReturnNote('')
  }

  async function handleFileSubmit() {
    if (!uploadedFile || !uploadDocId) return
    setUploading(true)
    const doc = client.docs.find(d => d.id === uploadDocId)
    if (doc) {
      const path = `${client.id}/${uploadDocId}/${uploadedFile.name}`
      await supabase.storage.from('documents').upload(path, uploadedFile, { upsert: true })
      const today = new Date().toISOString().slice(0, 10)
      await supabase.from('documents').update({ status: '提出済', file_name: uploadedFile.name, submitted_at: today }).eq('id', uploadDocId)
      updateDocInState(client.id, uploadDocId, { status: '提出済', file_name: uploadedFile.name, submitted_at: today })
      showToast(`${doc.name} を提出しました`)
    }
    setUploadedFile(null)
    setUploadDocId(null)
    setUploading(false)
  }

  function openAlertModal(type: string) {
    const missing = client.docs.filter(d => d.required && d.status === '未提出').map(d => d.name)
    const missingText = missing.length > 0 ? missing.map(m => `・${m}`).join('\n') : '（すべて提出済みです）'
    setAlertType(type)
    if (type === 'deadline') {
      setAlertSubject(`【重要】補助金申請 書類提出のご依頼（${client.clients.name} 様）`)
      setAlertBody(`${client.clients.name} ご担当者様\n\n株式会社AZOOの${client.cs_name ?? '担当者'}です。\n\n${client.subsidy_type}の申請期限（${client.deadline ?? ''}）まで残り${client.daysLeft ?? ''}日となりました。\n\n以下の書類がまだご提出いただけておりません：\n${missingText}\n\n期限に間に合うよう、お早めにご提出をお願いいたします。\n\n${client.cs_name ?? ''}\n${client.cs_email ?? ''}`)
    } else if (type === 'reminder') {
      setAlertSubject(`【WASIMIL】書類ご提出のご案内（${client.clients.name} 様）`)
      setAlertBody(`${client.clients.name} ご担当者様\n\n株式会社AZOOの${client.cs_name ?? '担当者'}です。\n\n未提出の書類：\n${missingText}\n\nお手数ですが、お早めのご提出をお願いいたします。\n\n${client.cs_name ?? ''}\n${client.cs_email ?? ''}`)
    } else {
      setAlertSubject(`【ご確認依頼】提出書類の修正について（${client.clients.name} 様）`)
      setAlertBody(`${client.clients.name} ご担当者様\n\n株式会社AZOOの${client.cs_name ?? '担当者'}です。\n\nご提出いただいた書類について修正が必要な点がございました。\nポータルよりコメントをご確認の上、修正版をご提出ください。\n\n${client.cs_name ?? ''}\n${client.cs_email ?? ''}`)
    }
    setShowAlertModal(true)
  }

  async function handleSendAlert() {
    if (!alertSubject || !alertBody) return
    setAlertSending(true)
    try {
      await fetch('/api/send-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: client.id, type: alertType, subject: alertSubject, body: alertBody }),
      })
      const via = alertTiming === 'now' ? '即時送信' : '予約送信'
      const newAlert: EmailLog = {
        id: Date.now().toString(), application_id: client.id, type: alertType as any,
        subject: alertSubject, to_email: client.clients.email, status: 'sent',
        sent_at: new Date().toISOString(), via,
      }
      addAlertToState(client.id, newAlert)
      setAlertSent(true)
      setTimeout(() => { setAlertSent(false); setShowAlertModal(false); setAlertSubject(''); setAlertBody('') }, 2000)
    } finally {
      setAlertSending(false)
    }
  }

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800 }}>顧客プロセス管理</h2>
        <p style={{ margin: 0, color: C.inkFaint, fontSize: 13 }}>書類提出・審査・アラート送信を一元管理します</p>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: C.green, color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', zIndex: 999 }}>
          {toast}
        </div>
      )}

      {/* View toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden', background: C.bg }}>
          {[{ id: 'admin', label: '🔧 管理画面（CS）' }, { id: 'portal', label: '🏨 お客様ポータル' }].map(v => (
            <button key={v.id} onClick={() => setView(v.id as 'admin' | 'portal')} style={{ background: view === v.id ? C.accent : 'transparent', color: view === v.id ? '#fff' : C.inkMid, border: 'none', padding: '8px 20px', fontSize: 12, fontWeight: view === v.id ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
              {v.label}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 12, color: C.inkFaint }}>
          {view === 'portal' ? `${client.clients.name} 様からの視点` : 'AZOO CS チーム 管理画面'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>

        {/* 案件リスト */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, background: C.surfaceAlt, fontSize: 11, color: C.inkFaint, fontWeight: 700, textTransform: 'uppercase' as const }}>
            申請案件
          </div>
          {apps.map(a => {
            const req  = a.docs.filter(d => d.required).length
            const done = a.docs.filter(d => d.status === '承認済').length
            const p    = req > 0 ? Math.round(done / req * 100) : 0
            const urg  = !a.daysLeft ? C.inkFaint : a.daysLeft < 14 ? C.red : a.daysLeft < 28 ? C.yellow : C.green
            return (
              <div key={a.id} onClick={() => { setSelId(a.id); setView('admin') }} style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, cursor: 'pointer', background: selId === a.id ? C.accentBg : 'transparent', borderLeft: selId === a.id ? `3px solid ${C.accent}` : '3px solid transparent', transition: 'all 0.15s' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{a.clients.name}</div>
                <div style={{ fontSize: 11, color: C.inkFaint, marginTop: 2 }}>{a.subsidy_type}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <div style={{ flex: 1, height: 4, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${p}%`, height: '100%', background: p === 100 ? C.green : C.accent, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: p === 100 ? C.green : C.accent, minWidth: 32 }}>{done}/{req}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                  <AppBadge status={a.status} />
                  {a.daysLeft && <span style={{ fontSize: 11, color: urg, fontWeight: 700 }}>残{a.daysLeft}日</span>}
                </div>
              </div>
            )
          })}
        </div>

        {/* 右パネル */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ヘッダーカード */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800 }}>{client.clients.name}</h3>
                <div style={{ fontSize: 13, color: C.inkFaint }}>{client.subsidy_type}{client.amount ? ` — ${client.amount}` : ''}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' as const }}>
                  <AppBadge status={client.status} />
                  {client.cs_name && <span style={{ fontSize: 12, color: C.inkFaint }}>担当: {client.cs_name}</span>}
                </div>
              </div>
              {client.deadline && (
                <div style={{ textAlign: 'right' as const }}>
                  <div style={{ fontSize: 11, color: C.inkFaint, marginBottom: 4 }}>申請期限</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: urgColor, background: urgBg, border: `1px solid ${urgBorder}`, padding: '5px 14px', borderRadius: 20 }}>
                    {client.deadline}（残{client.daysLeft ?? '?'}日）
                  </div>
                </div>
              )}
            </div>

            {/* 進捗バー */}
            <div style={{ marginTop: 16, padding: '14px 18px', background: C.surfaceAlt, borderRadius: 10, border: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>書類提出進捗</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: pct === 100 ? C.green : C.accent }}>{approvedDocs.length}/{requiredDocs.length} 承認済（{pct}%）</span>
              </div>
              <div style={{ height: 10, background: C.border, borderRadius: 5, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? C.green : C.accent, borderRadius: 5, transition: 'width 0.6s ease' }} />
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' as const }}>
                {Object.entries(DOC_STATUS_CFG).map(([st, cfg]) => {
                  const count = client.docs.filter(d => d.status === st).length
                  if (count === 0) return null
                  return <span key={st} style={{ fontSize: 11, color: cfg.color }}>{cfg.icon} {st} {count}件</span>
                })}
              </div>
            </div>
          </div>

          {/* ── 管理画面 ── */}
          {view === 'admin' && (
            <>
              {/* 書類テーブル */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, background: C.surfaceAlt, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: C.inkFaint, fontWeight: 700, textTransform: 'uppercase' as const }}>必要書類 一覧</span>
                  <GhostBtn label="📧 アラート送信" onClick={() => openAlertModal('reminder')} style={{ fontSize: 11, padding: '6px 12px' }} />
                </div>
                {client.docs.length === 0 ? (
                  <div style={{ padding: 24, fontSize: 13, color: C.inkFaint, textAlign: 'center' as const }}>書類が登録されていません</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
                    <thead>
                      <tr style={{ background: C.bg }}>
                        {['書類名', '必須', 'ステータス', '提出日', '備考', '操作'].map(h => (
                          <th key={h} style={{ padding: '10px 16px', textAlign: 'left' as const, fontSize: 11, color: C.inkFaint, fontWeight: 600, textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {client.docs.map(doc => (
                        <tr key={doc.id} style={{ borderTop: `1px solid ${C.border}`, background: doc.status === '差し戻し' ? '#fff5f5' : 'transparent' }}>
                          <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>{doc.name}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ fontSize: 11, color: doc.required ? C.red : C.inkFaint }}>{doc.required ? '必須' : '任意'}</span>
                          </td>
                          <td style={{ padding: '12px 16px' }}><DocBadge status={doc.status} /></td>
                          <td style={{ padding: '12px 16px', fontSize: 12, color: C.inkFaint, fontFamily: 'monospace' }}>
                            {doc.submitted_at ?? '—'}
                          </td>
                          <td style={{ padding: '12px 16px', maxWidth: 180 }}>
                            {doc.note ? (
                              <span style={{ fontSize: 11, color: C.red, background: C.redBg, padding: '2px 8px', borderRadius: 6 }}>💬 {doc.note}</span>
                            ) : (
                              <span style={{ fontSize: 11, color: C.inkFaint }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' as const }}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {doc.status === '提出済' && (
                                <button onClick={() => handleApprove(doc.id)} style={{ background: C.greenBg, color: C.green, border: `1px solid ${C.greenBorder}`, borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>✓ 承認</button>
                              )}
                              {(doc.status === '提出済' || doc.status === '確認中') && (
                                <button onClick={() => { setShowReturnModal(doc.id); setReturnNote(doc.note ?? '') }} style={{ background: C.redBg, color: C.red, border: `1px solid ${C.redBorder}`, borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>↩ 差し戻し</button>
                              )}
                              {doc.status === '未提出' && (
                                <button onClick={() => openAlertModal('reminder')} style={{ background: C.bg, color: C.inkMid, border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>📧 催促</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* アラート履歴 */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, background: C.surfaceAlt, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: C.inkFaint, fontWeight: 700, textTransform: 'uppercase' as const }}>アラート送信履歴</span>
                  <button onClick={() => openAlertModal('deadline')} style={{ background: C.accent, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 11, cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}>
                    + 新規アラート
                  </button>
                </div>
                {client.alerts.length === 0 ? (
                  <div style={{ padding: 24, fontSize: 13, color: C.inkFaint, textAlign: 'center' as const }}>送信履歴なし</div>
                ) : client.alerts.map(a => (
                  <div key={a.id} style={{ padding: '12px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12, background: a.type === 'deadline_alert' ? C.redBg : 'transparent' }}>
                    <span>{a.type === 'deadline_alert' ? '🔴' : a.type === 'return' ? '🟡' : '🔵'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: C.ink }}>{a.subject}</div>
                      <div style={{ fontSize: 11, color: C.inkFaint, marginTop: 2 }}>{a.sent_at ? new Date(a.sent_at).toLocaleString('ja-JP') : ''} · {a.via}</div>
                    </div>
                    <span style={{ fontSize: 11, color: C.blue, background: C.blueBg, border: `1px solid ${C.blueBorder}`, padding: '2px 8px', borderRadius: 6 }}>📧 送信済</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── お客様ポータル ── */}
          {view === 'portal' && (
            <>
              <div style={{ background: C.accentBg, border: `1px solid ${C.accentBorder}`, borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 4 }}>📋 書類のご提出をお願いします</div>
                <div style={{ fontSize: 12, color: C.inkMid }}>
                  申請に必要な書類をご確認いただき、各書類をアップロードしてください。ご不明な点は担当の {client.cs_name}（{client.cs_email}）までご連絡ください。
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {client.docs.map(doc => {
                  const isOpen = uploadDocId === doc.id
                  return (
                    <div key={doc.id} style={{ background: C.surface, border: `1px solid ${doc.status === '差し戻し' ? C.redBorder : C.border}`, borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <span style={{ fontSize: 14, fontWeight: 700 }}>{doc.name}</span>
                            {doc.required && (
                              <span style={{ fontSize: 10, color: C.red, background: C.redBg, border: `1px solid ${C.redBorder}`, padding: '1px 7px', borderRadius: 10, fontWeight: 700 }}>必須</span>
                            )}
                          </div>
                          {doc.submitted_at && <div style={{ fontSize: 12, color: C.inkFaint }}>提出日: {doc.submitted_at}</div>}
                          {doc.status === '差し戻し' && doc.note && (
                            <div style={{ marginTop: 8, background: C.redBg, border: `1px solid ${C.redBorder}`, borderRadius: 8, padding: '10px 14px' }}>
                              <div style={{ fontSize: 11, color: C.red, fontWeight: 700, marginBottom: 4 }}>↩ 修正依頼</div>
                              <div style={{ fontSize: 12, color: C.inkMid }}>{doc.note}</div>
                            </div>
                          )}
                          {doc.status === '承認済' && <div style={{ fontSize: 12, color: C.green, marginTop: 4 }}>✅ 受理・承認済みです。ありがとうございます。</div>}
                          {doc.status === '確認中' && <div style={{ fontSize: 12, color: C.yellow, marginTop: 4 }}>⏳ 担当者が内容を確認中です。</div>}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                          <DocBadge status={doc.status} />
                          {(doc.status === '未提出' || doc.status === '差し戻し') && (
                            <button
                              onClick={() => {
                                if (isOpen) { setUploadDocId(null); setUploadedFile(null) }
                                else { setUploadDocId(doc.id); setUploadedFile(null) }
                              }}
                              style={{ background: C.accent, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                              {doc.status === '差し戻し' ? '↩ 再提出' : '⬆ 提出する'}
                            </button>
                          )}
                        </div>
                      </div>

                      {isOpen && (
                        <div style={{ marginTop: 16, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>ファイルをアップロード</div>
                          <div
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setUploadedFile(f) }}
                            onClick={() => fileRef.current?.click()}
                            style={{ border: `2px dashed ${uploadedFile ? C.greenBorder : C.borderMid}`, borderRadius: 10, padding: '28px 20px', textAlign: 'center' as const, cursor: 'pointer', background: uploadedFile ? C.greenBg : C.surfaceAlt, transition: 'all 0.2s' }}
                          >
                            <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) setUploadedFile(e.target.files[0]) }} />
                            <div style={{ fontSize: 28, marginBottom: 8 }}>{uploadedFile ? '📎' : '📂'}</div>
                            {uploadedFile ? (
                              <div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>
                                {uploadedFile.name}
                                <div style={{ fontSize: 11, fontWeight: 400, color: C.inkFaint, marginTop: 2 }}>{(uploadedFile.size / 1024).toFixed(0)} KB</div>
                              </div>
                            ) : (
                              <div style={{ fontSize: 13, color: C.inkMid }}>
                                ドラッグ＆ドロップ または クリックして選択
                                <div style={{ fontSize: 11, color: C.inkFaint, marginTop: 4 }}>PDF・Excel・Word対応</div>
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                            <button
                              onClick={handleFileSubmit}
                              disabled={!uploadedFile || uploading}
                              style={{ flex: 1, background: uploadedFile && !uploading ? C.accent : C.border, color: uploadedFile && !uploading ? '#fff' : C.inkFaint, border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, fontSize: 13, cursor: uploadedFile && !uploading ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
                            >
                              {uploading ? '⏳ アップロード中...' : '提出する'}
                            </button>
                            <GhostBtn label="キャンセル" onClick={() => { setUploadDocId(null); setUploadedFile(null) }} />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div style={{ background: C.blueBg, border: `1px solid ${C.blueBorder}`, borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.blue, marginBottom: 6 }}>お問い合わせ</div>
                <div style={{ fontSize: 12, color: C.inkMid }}>担当: {client.cs_name} / {client.cs_email}</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* アラート送信モーダル */}
      {showAlertModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget) setShowAlertModal(false) }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, width: 560, maxWidth: '90vw', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>メール送信</h3>
              <button onClick={() => setShowAlertModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.inkFaint }}>×</button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' as const, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: C.inkFaint }}>テンプレ:</span>
              {[['deadline', '🔴 期限アラート'], ['reminder', '📋 書類催促'], ['return', '↩ 差し戻し通知']].map(([t, l]) => (
                <button key={t} onClick={() => openAlertModal(t)} style={{ background: alertType === t ? C.accentBg : C.surface, color: alertType === t ? C.accent : C.inkMid, border: `1px solid ${alertType === t ? C.accentBorder : C.border}`, borderRadius: 8, padding: '5px 12px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {l}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: C.inkFaint, marginBottom: 5 }}>送信先</div>
                <input style={inp} value={client.clients.email} readOnly />
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.inkFaint, marginBottom: 5 }}>件名</div>
                <input style={inp} value={alertSubject} onChange={e => setAlertSubject(e.target.value)} placeholder="件名を入力" />
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.inkFaint, marginBottom: 5 }}>本文</div>
                <textarea value={alertBody} onChange={e => setAlertBody(e.target.value)} style={{ ...inp, minHeight: 160, resize: 'vertical' as const, lineHeight: '1.7' }} placeholder="本文を入力" />
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.inkFaint, marginBottom: 5 }}>送信タイミング</div>
                <select style={inp} value={alertTiming} onChange={e => setAlertTiming(e.target.value)}>
                  <option value="now">今すぐ送信</option>
                  <option value="tomorrow">明日 9:00</option>
                  <option value="weekly">毎週月曜 9:00</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                {alertSent ? (
                  <div style={{ flex: 1, background: C.greenBg, border: `1px solid ${C.greenBorder}`, borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, color: C.green, textAlign: 'center' as const }}>
                    ✅ 送信しました
                  </div>
                ) : (
                  <button onClick={handleSendAlert} disabled={!alertSubject || !alertBody || alertSending} style={{ flex: 1, background: !alertSubject || !alertBody || alertSending ? C.border : C.accent, color: !alertSubject || !alertBody || alertSending ? C.inkFaint : '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, fontSize: 13, cursor: !alertSubject || !alertBody || alertSending ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                    {alertSending ? '⏳ 送信中...' : alertTiming === 'now' ? '📧 今すぐ送信' : '⏰ 予約送信'}
                  </button>
                )}
                <GhostBtn label="キャンセル" onClick={() => setShowAlertModal(false)} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 差し戻しモーダル */}
      {showReturnModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget) setShowReturnModal(null) }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, width: 440, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 800 }}>↩ 差し戻しコメント</h3>
            <div style={{ fontSize: 13, color: C.inkMid, marginBottom: 12 }}>
              お客様に表示する修正依頼コメントを入力してください。メールが自動送信されます。
            </div>
            <textarea
              value={returnNote}
              onChange={e => setReturnNote(e.target.value)}
              placeholder="例: 売上目標の数値根拠を追記してください"
              style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', color: C.ink, fontSize: 13, width: '100%', outline: 'none', fontFamily: 'inherit', minHeight: 100, resize: 'vertical' as const, lineHeight: '1.7' }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button onClick={handleReturn} disabled={!returnNote} style={{ flex: 1, background: returnNote ? C.red : C.border, color: returnNote ? '#fff' : C.inkFaint, border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, fontSize: 13, cursor: returnNote ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                差し戻す
              </button>
              <GhostBtn label="キャンセル" onClick={() => setShowReturnModal(null)} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
