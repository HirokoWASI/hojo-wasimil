'use client'

import { useState, useRef, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Application, Document, EmailLog } from '@/types/database'
import { C, APP_STATUS_CFG, POST_GRANT_STEPS } from './lib/constants'
import { getUrgencyLevel, filterBySearch, groupByStatus } from './lib/filters'

const DOC_STATUS_CFG: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  '未提出':   { color: C.inkFaint, bg: C.bg,       border: C.border,       icon: '○' },
  '提出済':   { color: C.blue,     bg: C.blueBg,   border: C.blueBorder,   icon: '◑' },
  '確認中':   { color: C.yellow,   bg: C.yellowBg, border: C.yellowBorder, icon: '◐' },
  '承認済':   { color: C.green,    bg: C.greenBg,  border: C.greenBorder,  icon: '●' },
  '差し戻し': { color: C.red,      bg: C.redBg,    border: C.redBorder,    icon: '✕' },
}

export type ClientInfo = {
  id?: string; name: string; email: string; contact_name: string | null
  portal_token: string | null; token_expires_at: string | null
  phone: string | null; facility_name: string | null; room_count: number | null
  employee_count: number | null; capital_amount: string | null
  industry: string | null; corporate_number: string | null; gbiz_id: string | null
  representative_name: string | null; address: string | null
}

export type AppRow = Application & {
  clients: ClientInfo
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
  const searchParams = useSearchParams()
  const initialSel = searchParams.get('sel')
  const [apps, setApps] = useState<AppRow[]>(initialApps)
  const [selId, setSelId] = useState<string>(initialSel && initialApps.some(a => a.id === initialSel) ? initialSel : initialApps[0]?.id ?? '')
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [subTab, setSubTab] = useState<'info' | 'docs' | 'ai' | 'chat' | 'draft'>('info')
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
  // AI審査
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<{ score: number; eligible: boolean; frame: string; maxAmount: string; subsidyRate: string; reasons: string[]; risks: string[]; nextAction: string } | null>(null)
  // チャット
  const [chatMessages, setChatMessages] = useState<{ id: string; sender_type: string; sender_name: string; content: string; created_at: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatSending, setChatSending] = useState(false)
  // ドラフト
  const [draftType, setDraftType] = useState('事業計画書')
  const [draftContent, setDraftContent] = useState('')
  const [draftLoading, setDraftLoading] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const client = apps.find(a => a.id === selId) ?? apps[0]
  if (!client) return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800 }}>顧客プロセス管理</h2>
        <p style={{ margin: 0, color: C.inkFaint, fontSize: 13 }}>書類提出・審査・アラート送信を一元管理します</p>
      </div>
      <div style={{ textAlign: 'center', padding: 48, background: C.surface, borderRadius: 14, border: `1px dashed ${C.borderMid}` }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.inkMid, marginBottom: 8 }}>申請案件がありません</div>
        <button onClick={() => setShowRegisterModal(true)} style={{ background: C.accent, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>＋ 新規顧客を登録</button>
      </div>
      {showRegisterModal && <RegisterModal onClose={() => setShowRegisterModal(false)} onRegistered={() => { setShowRegisterModal(false); window.location.reload() }} />}
    </div>
  )

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

  // AI審査
  async function runScreening() {
    setAiLoading(true); setAiResult(null)
    try {
      const res = await fetch('/api/screening', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        clientName: client.clients.name,
        employees: client.clients.employee_count ?? '',
        capitalAmount: client.clients.capital_amount ?? '',
        revenue: (client as any).revenue ?? '',
        industry: client.clients.industry ?? '宿泊業',
        roomCount: client.clients.room_count ?? '',
        hasHistory: (client as any).subsidy_history ?? 'なし',
        currentSystem: (client as any).current_system ?? '',
        wageRaisePlan: (client as any).wage_raise_plan ?? '未定',
        gbizIdStatus: client.gbiz_id_status ?? '未取得',
        securityActionDone: client.security_action_done ?? false,
        miradejiDone: client.miradeji_done ?? false,
        applicationId: client.id,
      }) })
      const data = await res.json()
      setAiResult(data.result ?? null)
    } catch { /* ignore */ }
    finally { setAiLoading(false) }
  }

  // チャット
  async function loadChat() {
    const res = await fetch(`/api/chat-messages?applicationId=${client.id}`)
    if (res.ok) setChatMessages(await res.json())
  }
  async function sendChat() {
    if (!chatInput.trim() || chatSending) return
    setChatSending(true)
    const res = await fetch('/api/chat-messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ applicationId: client.id, content: chatInput.trim(), senderType: 'cs', senderName: client.cs_name ?? 'CS' }) })
    if (res.ok) { const msg = await res.json(); setChatMessages(prev => [...prev, msg]); setChatInput('') }
    setChatSending(false)
  }

  // ドラフト生成
  async function generateDraft() {
    setDraftLoading(true); setDraftContent('')
    try {
      const res = await fetch('/api/draft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ applicationId: client.id, docType: draftType }) })
      const data = await res.json()
      setDraftContent(data.draft ?? data.error ?? 'エラー')
    } catch { setDraftContent('生成に失敗しました') }
    finally { setDraftLoading(false) }
  }

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800 }}>顧客プロセス管理</h2>
          <p style={{ margin: 0, color: C.inkFaint, fontSize: 13 }}>書類提出・審査・アラート送信を一元管理します</p>
        </div>
        <button onClick={() => setShowRegisterModal(true)} style={{ background: C.accent, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' as const }}>＋ 新規顧客登録</button>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: C.green, color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', zIndex: 999 }}>
          {toast}
        </div>
      )}


      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20, alignItems: 'start' }}>

        {/* 案件リスト（ステータスグループ） */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' }}>
          {/* 検索 */}
          <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, background: C.surfaceAlt }}>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="顧客名で検索..." style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 10px', fontSize: 12, fontFamily: 'inherit', outline: 'none', color: C.ink }} />
          </div>
          {/* ステータスフィルタ */}
          <div style={{ padding: '8px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 4, flexWrap: 'wrap' as const }}>
            <button onClick={() => setStatusFilter(null)} style={{ background: !statusFilter ? C.ink : C.bg, color: !statusFilter ? '#fff' : C.inkFaint, border: 'none', borderRadius: 12, padding: '3px 10px', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: !statusFilter ? 700 : 400 }}>全て</button>
            {(['適格審査中', '書類準備中', '申請中', '採択待ち', '採択済'] as const).map(st => {
              const cfg = APP_STATUS_CFG[st]
              const count = apps.filter(a => a.status === st).length
              if (count === 0) return null
              return <button key={st} onClick={() => setStatusFilter(statusFilter === st ? null : st)} style={{ background: statusFilter === st ? cfg.bg : C.bg, color: statusFilter === st ? cfg.color : C.inkFaint, border: `1px solid ${statusFilter === st ? cfg.border : 'transparent'}`, borderRadius: 12, padding: '3px 8px', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: statusFilter === st ? 700 : 400 }}>{cfg.icon} {count}</button>
            })}
          </div>
          {/* グループ化リスト */}
          {(() => {
            const filtered = filterBySearch(statusFilter ? apps.filter(a => a.status === statusFilter) : apps, searchQuery)
            const groups = groupByStatus(filtered)
            if (groups.length === 0) return <div style={{ padding: 20, textAlign: 'center', color: C.inkFaint, fontSize: 12 }}>該当する顧客がありません</div>
            return groups.map(group => {
              const cfg = APP_STATUS_CFG[group.status] ?? { color: C.inkFaint, bg: C.bg, border: C.border, icon: '○' }
              return (
                <div key={group.status}>
                  <div style={{ padding: '8px 14px', background: cfg.bg, fontSize: 11, fontWeight: 700, color: cfg.color, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.border}` }}>
                    <span>{cfg.icon} {group.status}</span>
                    <span style={{ background: cfg.color, color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 8 }}>{group.apps.length}</span>
                  </div>
                  {group.apps.map(a => {
                    const req = a.docs.filter(d => d.required).length
                    const done = a.docs.filter(d => d.status === '承認済').length
                    const p = req > 0 ? Math.round(done / req * 100) : 0
                    const urgency = getUrgencyLevel(a)
                    const urgDot = urgency === 'critical' ? C.red : urgency === 'warning' ? C.yellow : urgency === 'attention' ? C.accent : ''
                    return (
                      <div key={a.id} onClick={() => setSelId(a.id)} style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, cursor: 'pointer', background: selId === a.id ? C.accentBg : 'transparent', borderLeft: selId === a.id ? `3px solid ${C.accent}` : '3px solid transparent', transition: 'all 0.12s' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {urgDot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: urgDot, flexShrink: 0 }} />}
                            <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{a.clients.name}</span>
                          </div>
                          {a.daysLeft != null && <span style={{ fontSize: 10, color: a.daysLeft <= 14 ? C.red : C.inkFaint, fontWeight: 600 }}>残{a.daysLeft}日</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <div style={{ flex: 1, height: 3, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ width: `${p}%`, height: '100%', background: p === 100 ? C.green : C.accent, borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: 10, color: p === 100 ? C.green : C.inkFaint }}>{done}/{req}</span>
                        </div>
                        {a.status === '採択済' && a.post_grant_status && (
                          <div style={{ fontSize: 10, color: C.green, marginTop: 3, fontWeight: 600 }}>📋 {a.post_grant_status}</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })
          })()}
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

          {/* 採択後フロートラッカー */}
          {client.status === '採択済' && (() => {
            const currentIdx = POST_GRANT_STEPS.indexOf(client.post_grant_status as any)
            const stepDetails: Record<string, { title: string; desc: string; checklist: string[] }> = {
              '交付決定': { title: '交付決定', desc: '交付決定通知を受領。この後にWASIMILの契約・発注を行います。', checklist: ['交付決定通知の受領確認', 'WASIMIL契約書の準備', '発注書の作成'] },
              '事業実施': { title: '事業実施（WASIMIL導入）', desc: '交付決定後にWASIMILの契約・導入・運用開始を行います。交付決定前の発注は不可。', checklist: ['WASIMILの契約・発注（交付決定後）', 'システム導入・初期設定', 'スタッフ研修の実施', '運用開始の確認', '導入完了のスクリーンショット保存'] },
              '実績報告': { title: '実績報告', desc: '事業完了後、発注・納品・支払いの証憑を提出して実績報告を行います。', checklist: ['契約書の写し', '発注書・納品書', '支払い証憑（銀行振込明細等）', '導入完了のスクリーンショット', '実績報告書の提出（申請マイページ）'] },
              '補助金入金': { title: '補助金入金', desc: '確定検査後、補助金が指定口座に振り込まれます。', checklist: ['確定検査の承認確認', '補助金入金の確認', '入金額の照合'] },
              '効果報告1年目': { title: '効果報告（1年目）', desc: '補助事業完了後、労働生産性の向上度合いを年次で報告します。', checklist: ['労働生産性の算出（付加価値額÷従業員数）', '事業計画KPIの達成状況', '効果報告書の提出'] },
              '効果報告2年目': { title: '効果報告（2年目）', desc: '引き続き効果報告を提出します。賃上げ要件がある場合は達成状況も報告。', checklist: ['労働生産性の前年比較', '賃上げ目標の達成確認（該当する場合）', '効果報告書の提出'] },
              '効果報告3年目': { title: '効果報告（3年目）', desc: '最終年度の効果報告です。未達の場合は補助金返還の可能性があります。', checklist: ['労働生産性の3年間推移', '事業計画の最終評価', '効果報告書の提出'] },
              '完了': { title: '完了', desc: 'すべての報告義務が完了しました。', checklist: [] },
            }
            const currentStepInfo = client.post_grant_status ? stepDetails[client.post_grant_status] : null
            return (
              <div style={{ background: C.surface, border: `1px solid ${C.greenBorder}`, borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.green, marginBottom: 12 }}>採択後プロセス管理</div>
                {/* ステッパー */}
                <div style={{ display: 'flex', gap: 0, alignItems: 'center', marginBottom: 6, overflowX: 'auto', paddingBottom: 4 }}>
                  {POST_GRANT_STEPS.map((step, i) => {
                    const isDone = currentIdx >= 0 && i < currentIdx
                    const isCurrent = client.post_grant_status === step
                    return (
                      <div key={step} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                        <button onClick={async () => {
                          await supabase.from('applications').update({ post_grant_status: step }).eq('id', client.id)
                          setApps(prev => prev.map(a => a.id === client.id ? { ...a, post_grant_status: step } as AppRow : a))
                          showToast(`${step} に更新`)
                        }} title={step} style={{ width: 28, height: 28, borderRadius: '50%', border: isCurrent ? `2px solid ${C.accent}` : 'none', background: isDone ? C.green : isCurrent ? C.accentBg : C.bg, color: isDone ? '#fff' : isCurrent ? C.accent : C.inkFaint, fontSize: 10, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isDone ? '✓' : i + 1}
                        </button>
                        {i < POST_GRANT_STEPS.length - 1 && <div style={{ width: 14, height: 2, background: isDone ? C.green : C.border }} />}
                      </div>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', gap: 3, marginBottom: 12, overflowX: 'auto' }}>
                  {POST_GRANT_STEPS.map((step, i) => (
                    <span key={step} style={{ fontSize: 8, color: client.post_grant_status === step ? C.accent : (currentIdx >= 0 && i < currentIdx) ? C.green : C.inkFaint, fontWeight: client.post_grant_status === step ? 700 : 400, whiteSpace: 'nowrap' as const, minWidth: 32, textAlign: 'center' as const }}>{step.replace('効果報告', '効果').replace('年目', '年')}</span>
                  ))}
                </div>
                {/* 現在のステップ詳細 */}
                {currentStepInfo && (
                  <div style={{ background: C.accentBg, border: `1px solid ${C.accentBorder}`, borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 4 }}>{currentStepInfo.title}</div>
                    <div style={{ fontSize: 12, color: C.inkMid, lineHeight: 1.6, marginBottom: 10 }}>{currentStepInfo.desc}</div>
                    {currentStepInfo.checklist.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.inkMid, marginBottom: 4 }}>対応事項:</div>
                        {currentStepInfo.checklist.map((item, i) => (
                          <div key={i} style={{ fontSize: 12, color: C.inkMid, padding: '3px 0', display: 'flex', gap: 6 }}>
                            <span style={{ color: C.inkFaint }}>□</span>{item}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {/* メモ */}
                {client.post_grant_notes && (
                  <div style={{ marginTop: 8, fontSize: 12, color: C.inkMid, background: C.bg, borderRadius: 8, padding: '8px 12px', border: `1px solid ${C.border}` }}>
                    <span style={{ fontWeight: 600, color: C.ink }}>メモ: </span>{client.post_grant_notes}
                  </div>
                )}
              </div>
            )
          })()}

          {/* ポータルURL */}
          <PortalUrlCard client={client} onTokenGenerated={(token, expires) => {
            setApps(prev => prev.map(a => a.id === client.id ? { ...a, clients: { ...a.clients, portal_token: token, token_expires_at: expires } } : a))
          }} />

          {/* サブタブ */}
          <div style={{ display: 'flex', gap: 2, background: C.bg, borderRadius: 10, padding: 4, border: `1px solid ${C.border}` }}>
            {([['info', '🏨 顧客情報'], ['docs', '📋 書類管理'], ['ai', '⚡ AI審査'], ['chat', '💬 チャット'], ['draft', '✦ ドラフト']] as const).map(([id, label]) => (
              <button key={id} onClick={() => { setSubTab(id); if (id === 'chat') loadChat() }} style={{ flex: 1, background: subTab === id ? C.surface : 'transparent', color: subTab === id ? C.ink : C.inkMid, border: subTab === id ? `1px solid ${C.border}` : '1px solid transparent', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: subTab === id ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                {label}
              </button>
            ))}
          </div>

          {/* ── 書類管理タブ ── */}
          {/* ── 顧客情報タブ ── */}
          {subTab === 'info' && (
            <ClientInfoTab client={client} onSaved={(updatedClients, updatedApp) => {
              setApps(prev => prev.map(a => a.id === client.id ? {
                ...a,
                ...(updatedApp ?? {}),
                clients: { ...a.clients, ...(updatedClients ?? {}) },
              } : a))
              showToast('保存しました')
            }} />
          )}

          {/* ── 書類管理タブ ── */}
          {subTab === 'docs' && <>
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
          </>}

          {/* ── AI審査タブ ── */}
          {subTab === 'ai' && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>AI適格性審査</h3>
                <button onClick={runScreening} disabled={aiLoading} style={{ background: aiLoading ? C.border : C.accent, color: aiLoading ? C.inkFaint : '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 12, fontWeight: 700, cursor: aiLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                  {aiLoading ? '診断中...' : '⚡ AI診断を実行'}
                </button>
              </div>
              {client.ai_result && !aiResult && (() => { const r = client.ai_result!; return (
                <div>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                    <div style={{ background: r.score >= 70 ? C.greenBg : C.redBg, border: `1px solid ${r.score >= 70 ? C.greenBorder : C.redBorder}`, borderRadius: 10, padding: '14px 20px', flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div><div style={{ fontSize: 10, color: C.inkFaint }}>スコア</div><div style={{ fontSize: 32, fontWeight: 800, color: r.score >= 70 ? C.green : C.red }}>{r.score}</div></div>
                      <div style={{ textAlign: 'right' }}><div style={{ fontSize: 14 }}>{r.eligible ? '✅ 申請推奨' : '⚠️ 要確認'}</div><div style={{ fontSize: 12, color: C.inkFaint, marginTop: 2 }}>{r.frame}</div></div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                    <div style={{ background: C.accentBg, borderRadius: 8, padding: '10px 14px' }}><div style={{ fontSize: 10, color: C.inkFaint }}>最大補助額</div><div style={{ fontSize: 16, fontWeight: 800, color: C.accent }}>{r.maxAmount}</div></div>
                    <div style={{ background: C.blueBg, borderRadius: 8, padding: '10px 14px' }}><div style={{ fontSize: 10, color: C.inkFaint }}>補助率</div><div style={{ fontSize: 16, fontWeight: 800, color: C.blue }}>{r.subsidyRate}</div></div>
                  </div>
                  {r.reasons.length > 0 && <div style={{ marginBottom: 8 }}>{r.reasons.map((x, i) => <div key={i} style={{ fontSize: 12, color: C.inkMid, padding: '2px 0' }}><span style={{ color: C.green }}>✓</span> {x}</div>)}</div>}
                  {r.risks.length > 0 && <div style={{ background: C.redBg, borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>{r.risks.map((x, i) => <div key={i} style={{ fontSize: 12, color: C.red }}>{x}</div>)}</div>}
                  <div style={{ background: C.greenBg, borderRadius: 8, padding: '10px 14px' }}><div style={{ fontSize: 10, color: C.green, fontWeight: 700 }}>ネクストアクション</div><div style={{ fontSize: 12 }}>{r.nextAction}</div></div>
                </div>
              )})()}
              {aiResult && (
                <div>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                    <div style={{ background: aiResult.score >= 70 ? C.greenBg : C.redBg, border: `1px solid ${aiResult.score >= 70 ? C.greenBorder : C.redBorder}`, borderRadius: 10, padding: '14px 20px', flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div><div style={{ fontSize: 10, color: C.inkFaint }}>スコア</div><div style={{ fontSize: 32, fontWeight: 800, color: aiResult.score >= 70 ? C.green : C.red }}>{aiResult.score}</div></div>
                      <div style={{ textAlign: 'right' }}><div style={{ fontSize: 14 }}>{aiResult.eligible ? '✅ 申請推奨' : '⚠️ 要確認'}</div><div style={{ fontSize: 12, color: C.inkFaint, marginTop: 2 }}>{aiResult.frame}</div></div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                    <div style={{ background: C.accentBg, borderRadius: 8, padding: '10px 14px' }}><div style={{ fontSize: 10, color: C.inkFaint }}>最大補助額</div><div style={{ fontSize: 16, fontWeight: 800, color: C.accent }}>{aiResult.maxAmount}</div></div>
                    <div style={{ background: C.blueBg, borderRadius: 8, padding: '10px 14px' }}><div style={{ fontSize: 10, color: C.inkFaint }}>補助率</div><div style={{ fontSize: 16, fontWeight: 800, color: C.blue }}>{aiResult.subsidyRate}</div></div>
                  </div>
                  {aiResult.reasons.length > 0 && <div style={{ marginBottom: 8 }}>{aiResult.reasons.map((x, i) => <div key={i} style={{ fontSize: 12, color: C.inkMid, padding: '2px 0' }}><span style={{ color: C.green }}>✓</span> {x}</div>)}</div>}
                  {aiResult.risks.length > 0 && <div style={{ background: C.redBg, borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>{aiResult.risks.map((x, i) => <div key={i} style={{ fontSize: 12, color: C.red }}>{x}</div>)}</div>}
                  <div style={{ background: C.greenBg, borderRadius: 8, padding: '10px 14px' }}><div style={{ fontSize: 10, color: C.green, fontWeight: 700 }}>ネクストアクション</div><div style={{ fontSize: 12 }}>{aiResult.nextAction}</div></div>
                </div>
              )}
              {!client.ai_result && !aiResult && !aiLoading && <div style={{ textAlign: 'center', padding: 24, color: C.inkFaint, fontSize: 13 }}>「AI診断を実行」で適格性を自動診断します</div>}
              {aiLoading && <div style={{ textAlign: 'center', padding: 24, color: C.inkFaint, fontSize: 13 }}>Claude が解析中...</div>}
            </div>
          )}

          {/* ── チャットタブ ── */}
          {subTab === 'chat' && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', height: 480, display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '12px 16px', background: C.surfaceAlt, borderBottom: `1px solid ${C.border}`, fontSize: 13, fontWeight: 700 }}>
                {client.clients.name} — {client.clients.contact_name ?? client.clients.name}
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {chatMessages.length === 0 && <div style={{ textAlign: 'center', padding: 24, color: C.inkFaint, fontSize: 13 }}>メッセージなし</div>}
                {chatMessages.map(msg => {
                  const isMe = msg.sender_type === 'cs'
                  return (
                    <div key={msg.id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-start' }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: isMe ? C.accent : C.blue, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{isMe ? 'CS' : '客'}</div>
                      <div style={{ maxWidth: '70%' }}>
                        <div style={{ fontSize: 10, color: C.inkFaint, marginBottom: 2 }}>{msg.sender_name}</div>
                        <div style={{ background: isMe ? C.accent : C.bg, color: isMe ? '#fff' : C.ink, borderRadius: isMe ? '12px 4px 12px 12px' : '4px 12px 12px 12px', padding: '8px 12px', fontSize: 13, lineHeight: 1.5 }}>{msg.content}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div style={{ borderTop: `1px solid ${C.border}`, padding: '10px 16px', display: 'flex', gap: 8 }}>
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat() } }} placeholder="メッセージを入力" style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none', color: C.ink }} />
                <button onClick={sendChat} disabled={!chatInput.trim() || chatSending} style={{ background: chatInput.trim() && !chatSending ? C.accent : C.border, color: chatInput.trim() && !chatSending ? '#fff' : C.inkFaint, border: 'none', borderRadius: 8, width: 40, height: 40, fontSize: 18, cursor: chatInput.trim() && !chatSending ? 'pointer' : 'not-allowed' }}>↑</button>
              </div>
            </div>
          )}

          {/* ── ドラフト生成タブ ── */}
          {subTab === 'draft' && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700 }}>書類ドラフト生成</h3>
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <select value={draftType} onChange={e => setDraftType(e.target.value)} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none', color: C.ink }}>
                  {['事業計画書', 'IT導入計画書', '申請理由書'].map(t => <option key={t}>{t}</option>)}
                </select>
                <button onClick={generateDraft} disabled={draftLoading} style={{ background: draftLoading ? C.border : C.accent, color: draftLoading ? C.inkFaint : '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 12, fontWeight: 700, cursor: draftLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                  {draftLoading ? '生成中...' : '✦ AIでドラフト生成'}
                </button>
              </div>
              {draftContent ? (
                <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, fontSize: 13, color: C.ink, lineHeight: 1.8, whiteSpace: 'pre-wrap' as const, maxHeight: 400, overflowY: 'auto' }}>{draftContent}</div>
              ) : (
                <div style={{ textAlign: 'center', padding: 32, color: C.inkFaint, fontSize: 13 }}>書類種別を選択して「AIでドラフト生成」を実行してください</div>
              )}
            </div>
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

      {/* 新規顧客登録モーダル */}
      {showRegisterModal && (
        <RegisterModal
          onClose={() => setShowRegisterModal(false)}
          onRegistered={() => { setShowRegisterModal(false); window.location.reload() }}
        />
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

// ---- ポータルURLカード ----
function PortalUrlCard({ client, onTokenGenerated }: { client: AppRow; onTokenGenerated: (token: string, expires: string) => void }) {
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  const portalToken = client.clients.portal_token
  const expiresAt = client.clients.token_expires_at
  const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false
  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const portalUrl = portalToken ? `${appUrl}/portal/${portalToken}` : null

  async function generateToken() {
    setGenerating(true)
    try {
      const res = await fetch('/api/generate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.client_id, expiryDays: 90 }),
      })
      if (res.ok) {
        const data = await res.json()
        onTokenGenerated(data.token, data.expiresAt)
      }
    } finally { setGenerating(false) }
  }

  function copyUrl() {
    if (!portalUrl) return
    navigator.clipboard.writeText(portalUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        🔗 お客様ポータルURL
        {portalUrl && !isExpired && <span style={{ fontSize: 10, background: C.greenBg, color: C.green, padding: '2px 8px', borderRadius: 8, fontWeight: 600 }}>有効</span>}
        {isExpired && <span style={{ fontSize: 10, background: C.redBg, color: C.red, padding: '2px 8px', borderRadius: 8, fontWeight: 600 }}>期限切れ</span>}
      </div>

      {portalUrl && !isExpired ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 12, color: C.ink, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
            {portalUrl}
          </div>
          <button onClick={copyUrl} style={{ background: copied ? C.green : C.accent, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' as const, minWidth: 80 }}>
            {copied ? '✓ コピー済' : 'URLコピー'}
          </button>
          <button onClick={generateToken} disabled={generating} style={{ background: C.surface, color: C.inkMid, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: generating ? 'not-allowed' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' as const }}>
            再発行
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: C.inkFaint }}>{isExpired ? '期限切れです。再発行してください。' : 'まだ発行されていません。'}</span>
          <button onClick={generateToken} disabled={generating} style={{ background: generating ? C.border : C.accent, color: generating ? C.inkFaint : '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 12, fontWeight: 700, cursor: generating ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {generating ? '発行中...' : 'ポータルURLを発行'}
          </button>
        </div>
      )}

      {expiresAt && !isExpired && (
        <div style={{ fontSize: 10, color: C.inkFaint, marginTop: 6 }}>
          有効期限: {new Date(expiresAt).toLocaleDateString('ja-JP')} — このURLをお客様にメール等でご案内ください
        </div>
      )}
    </div>
  )
}

// ---- 新規顧客登録モーダル ----
const SUBSIDY_TYPES = ['デジタル化・AI導入補助金', 'ものづくり補助金', '小規模事業者持続化補助金', '事業再構築補助金', '省エネ補助金', 'その他'] as const

interface SalesDeal {
  id: string; facility_name: string; stage: string
  expected_mrr: number | null; room_count: number | null
  company_name: string; already_synced: boolean
}

// ---- 顧客情報編集タブ ----
function ClientInfoTab({ client, onSaved }: { client: AppRow; onSaved: (c?: Partial<ClientInfo>, a?: Partial<Application>) => void }) {
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({
    name: client.clients.name ?? '',
    contact_name: client.clients.contact_name ?? '',
    email: client.clients.email ?? '',
    phone: client.clients.phone ?? '',
    facility_name: client.clients.facility_name ?? '',
    representative_name: client.clients.representative_name ?? '',
    address: client.clients.address ?? '',
    industry: client.clients.industry ?? '宿泊業',
    employee_count: client.clients.employee_count?.toString() ?? '',
    capital_amount: client.clients.capital_amount ?? '',
    room_count: client.clients.room_count?.toString() ?? '',
    corporate_number: client.clients.corporate_number ?? '',
    revenue: (client as any).revenue ?? '',
    current_system: (client as any).current_system ?? '',
    subsidy_history: (client as any).subsidy_history ?? 'なし',
    wage_raise_plan: (client as any).wage_raise_plan ?? '未定',
    // app fields
    gbiz_id_status: client.gbiz_id_status ?? '未取得',
    security_action_done: client.security_action_done ?? false,
    miradeji_done: client.miradeji_done ?? false,
    cs_name: client.cs_name ?? '',
    cs_email: client.cs_email ?? '',
    amount: client.amount ?? '',
    subsidy_frame: client.subsidy_frame ?? '',
    notes: client.notes ?? '',
  })

  function set(key: string, val: string) { setF(prev => ({ ...prev, [key]: val })) }

  async function handleSave() {
    setSaving(true)
    try {
      await fetch('/api/client-update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.client_id,
          applicationId: client.id,
          clientFields: {
            name: f.name, contact_name: f.contact_name || null, email: f.email,
            phone: f.phone || null, facility_name: f.facility_name || null,
            representative_name: f.representative_name || null, address: f.address || null,
            industry: f.industry || null,
            employee_count: f.employee_count ? parseInt(f.employee_count) : null,
            capital_amount: f.capital_amount || null,
            room_count: f.room_count ? parseInt(f.room_count) : null,
            corporate_number: f.corporate_number || null,
            revenue: f.revenue || null,
            current_system: f.current_system || null,
            subsidy_history: f.subsidy_history || 'なし',
            wage_raise_plan: f.wage_raise_plan || '未定',
          },
          appFields: {
            cs_name: f.cs_name || null, cs_email: f.cs_email || null,
            amount: f.amount || null, subsidy_frame: f.subsidy_frame || null,
            notes: f.notes || null,
            gbiz_id_status: f.gbiz_id_status,
            security_action_done: f.security_action_done,
            miradeji_done: f.miradeji_done,
          },
        }),
      })
      onSaved(
        { name: f.name, contact_name: f.contact_name || null, email: f.email, phone: f.phone || null, facility_name: f.facility_name || null, employee_count: f.employee_count ? parseInt(f.employee_count) : null, capital_amount: f.capital_amount || null, room_count: f.room_count ? parseInt(f.room_count) : null, industry: f.industry || null, corporate_number: f.corporate_number || null, gbiz_id: null, representative_name: f.representative_name || null, address: f.address || null, portal_token: client.clients.portal_token, token_expires_at: client.clients.token_expires_at },
        { cs_name: f.cs_name || null, cs_email: f.cs_email || null, amount: f.amount || null, subsidy_frame: f.subsidy_frame || null, notes: f.notes || null, gbiz_id_status: f.gbiz_id_status, security_action_done: f.security_action_done, miradeji_done: f.miradeji_done } as Partial<Application>,
      )
    } finally { setSaving(false) }
  }

  const inp = { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', color: C.ink, fontSize: 13, width: '100%', outline: 'none', fontFamily: 'inherit' } as const
  const lbl = { fontSize: 11, color: C.inkFaint, fontWeight: 600 as const, display: 'block' as const, marginBottom: 4 }

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>顧客情報</h3>
        <button onClick={handleSave} disabled={saving} style={{ background: saving ? C.border : C.accent, color: saving ? C.inkFaint : '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 12, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
          {saving ? '保存中...' : '保存'}
        </button>
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, marginBottom: 8, borderBottom: `1px solid ${C.border}`, paddingBottom: 6 }}>基本情報</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div><label style={lbl}>施設名・会社名 *</label><input value={f.name} onChange={e => set('name', e.target.value)} style={inp} /></div>
        <div><label style={lbl}>施設名（別名）</label><input value={f.facility_name} onChange={e => set('facility_name', e.target.value)} style={inp} /></div>
        <div><label style={lbl}>代表者名</label><input value={f.representative_name} onChange={e => set('representative_name', e.target.value)} placeholder="例: 田中太郎" style={inp} /></div>
        <div><label style={lbl}>担当者名</label><input value={f.contact_name} onChange={e => set('contact_name', e.target.value)} style={inp} /></div>
        <div><label style={lbl}>メールアドレス</label><input value={f.email} onChange={e => set('email', e.target.value)} style={inp} /></div>
        <div><label style={lbl}>電話番号</label><input value={f.phone} onChange={e => set('phone', e.target.value)} style={inp} /></div>
        <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>住所</label><input value={f.address} onChange={e => set('address', e.target.value)} placeholder="例: 神奈川県足柄下郡箱根町..." style={inp} /></div>
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, marginBottom: 8, borderBottom: `1px solid ${C.border}`, paddingBottom: 6 }}>事業情報（AI審査に使用）</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div><label style={lbl}>業種</label>
          <select value={f.industry} onChange={e => set('industry', e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
            {['宿泊業', 'サービス業', '小売業', '卸売業', '製造業', 'その他'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div><label style={lbl}>従業員数（常勤）</label><input type="number" value={f.employee_count} onChange={e => set('employee_count', e.target.value)} placeholder="例: 45" style={inp} /></div>
        <div><label style={lbl}>客室数</label><input type="number" value={f.room_count} onChange={e => set('room_count', e.target.value)} placeholder="例: 25" style={inp} /></div>
        <div><label style={lbl}>資本金</label><input value={f.capital_amount} onChange={e => set('capital_amount', e.target.value)} placeholder="例: 1000万円" style={inp} /></div>
        <div><label style={lbl}>年商（万円）</label><input value={f.revenue} onChange={e => set('revenue', e.target.value)} placeholder="例: 8000" style={inp} /></div>
        <div><label style={lbl}>法人番号</label><input value={f.corporate_number} onChange={e => set('corporate_number', e.target.value)} placeholder="13桁" style={inp} /></div>
        <div><label style={lbl}>現在のシステム</label><input value={f.current_system} onChange={e => set('current_system', e.target.value)} placeholder="例: TLリンカーン" style={inp} /></div>
        <div><label style={lbl}>補助金申請歴</label>
          <select value={f.subsidy_history} onChange={e => set('subsidy_history', e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
            {['なし', 'IT導入補助金 受給済', 'その他補助金 受給済'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div><label style={lbl}>賃上げ計画</label>
          <select value={f.wage_raise_plan} onChange={e => set('wage_raise_plan', e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
            {['未定', '計画あり（地域別最低賃金+50円以上）', '計画あり（+30円以上）', '計画なし'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, marginBottom: 8, borderBottom: `1px solid ${C.border}`, paddingBottom: 6 }}>申請前の準備状況</div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' as const }}>
        {[
          { key: 'gbiz_id_status', label: 'gBizIDプライム', options: ['未取得', '申請中', '取得済'] },
        ].map(item => (
          <div key={item.key} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: C.inkMid, minWidth: 110 }}>{item.label}</span>
            <select value={f.gbiz_id_status} onChange={e => set('gbiz_id_status', e.target.value)} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 10px', fontSize: 12, fontFamily: 'inherit', color: f.gbiz_id_status === '取得済' ? C.green : f.gbiz_id_status === '申請中' ? C.yellow : C.inkFaint, fontWeight: 700, outline: 'none' }}>
              {item.options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ))}
        {[
          { key: 'security_action_done', label: 'SECURITY ACTION', checked: f.security_action_done },
          { key: 'miradeji_done', label: 'みらデジ経営チェック', checked: f.miradeji_done },
        ].map(item => (
          <label key={item.key} style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer', fontSize: 12, color: item.checked ? C.green : C.inkMid }}>
            <input type="checkbox" checked={item.checked} onChange={e => setF(prev => ({ ...prev, [item.key]: e.target.checked }))} style={{ accentColor: C.green, width: 15, height: 15, cursor: 'pointer' }} />
            <span style={{ fontWeight: item.checked ? 700 : 400 }}>{item.label}</span>
            <span style={{ fontSize: 10, color: item.checked ? C.green : C.inkFaint }}>{item.checked ? '完了' : '未実施'}</span>
          </label>
        ))}
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, marginBottom: 8, borderBottom: `1px solid ${C.border}`, paddingBottom: 6 }}>申請情報</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div><label style={lbl}>CS担当者名</label><input value={f.cs_name} onChange={e => set('cs_name', e.target.value)} style={inp} /></div>
        <div><label style={lbl}>CS担当メール</label><input value={f.cs_email} onChange={e => set('cs_email', e.target.value)} style={inp} /></div>
        <div><label style={lbl}>申請枠</label><input value={f.subsidy_frame} onChange={e => set('subsidy_frame', e.target.value)} placeholder="例: 通常枠A類型" style={inp} /></div>
        <div><label style={lbl}>申請額</label><input value={f.amount} onChange={e => set('amount', e.target.value)} placeholder="例: 150万円" style={inp} /></div>
      </div>
      <div><label style={lbl}>メモ</label><textarea value={f.notes} onChange={e => set('notes', e.target.value)} placeholder="社内メモ" style={{ ...inp, minHeight: 60, resize: 'vertical' as const }} /></div>
    </div>
  )
}

function RegisterModal({ onClose, onRegistered }: { onClose: () => void; onRegistered: () => void }) {
  const [mode, setMode] = useState<'manual' | 'sales'>('sales')
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [roomCount, setRoomCount] = useState('')
  const [subsidyType, setSubsidyType] = useState<string>('デジタル化・AI導入補助金')
  const [deals, setDeals] = useState<SalesDeal[]>([])
  const [dealsLoading, setDealsLoading] = useState(false)
  const [dealsError, setDealsError] = useState<string | null>(null)
  const [syncingId, setSyncingId] = useState<string | null>(null)

  const inp: React.CSSProperties = { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 14px', color: C.ink, fontSize: 13, fontFamily: 'inherit', outline: 'none', width: '100%' }

  useState(() => { if (mode === 'sales') loadDeals() })

  async function loadDeals() {
    setDealsLoading(true); setDealsError(null)
    try {
      const res = await fetch('/api/subsidy-clients?mode=sales-deals')
      if (!res.ok) { setDealsError((await res.json()).error ?? 'エラー'); return }
      setDeals(await res.json())
    } catch { setDealsError('通信エラー') }
    finally { setDealsLoading(false) }
  }

  async function handleManual() {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/subsidy-clients', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, contactName, roomCount: roomCount ? parseInt(roomCount) : null, phone, subsidyType }),
      })
      if (res.ok) onRegistered()
    } finally { setSaving(false) }
  }

  async function handleSync(dealId: string) {
    setSyncingId(dealId)
    try {
      const res = await fetch('/api/subsidy-clients', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'sync-from-sales', dealId }),
      })
      if (res.ok) onRegistered()
      else alert((await res.json()).error ?? 'エラー')
    } finally { setSyncingId(null) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: 16, width: '100%', maxWidth: 600, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>新規顧客登録</h3>
          <button onClick={onClose} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: C.inkFaint }}>✕</button>
        </div>
        <div style={{ padding: 24 }}>
          {/* モード切替 */}
          <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: C.bg, borderRadius: 10, padding: 4, border: `1px solid ${C.border}` }}>
            {([['sales', '🔄 Sales Pipelineから同期'], ['manual', '✏️ 手動登録']] as const).map(([id, label]) => (
              <button key={id} onClick={() => { setMode(id as 'sales' | 'manual'); if (id === 'sales' && deals.length === 0) loadDeals() }} style={{ flex: 1, background: mode === id ? C.surface : 'transparent', color: mode === id ? C.ink : C.inkFaint, border: mode === id ? `1px solid ${C.border}` : '1px solid transparent', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontWeight: mode === id ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                {label}
              </button>
            ))}
          </div>

          {/* Sales同期 */}
          {mode === 'sales' && (
            <div>
              {dealsLoading && <div style={{ textAlign: 'center', padding: 24, color: C.inkFaint, fontSize: 13 }}>Sales Pipelineを読み込み中...</div>}
              {dealsError && <div style={{ background: C.yellowBg, border: `1px solid ${C.yellowBorder}`, borderRadius: 10, padding: '12px 16px', fontSize: 12, color: C.yellow, marginBottom: 12 }}>⚠️ {dealsError}<div style={{ fontSize: 11, marginTop: 4, color: C.inkFaint }}>Vercel環境変数に SALES_SUPABASE_URL と SALES_SUPABASE_SERVICE_KEY を設定してください</div></div>}
              {!dealsLoading && !dealsError && deals.length === 0 && <div style={{ textAlign: 'center', padding: 24, color: C.inkFaint, fontSize: 13 }}>同期可能な案件がありません</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {deals.map(d => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: d.already_synced ? C.greenBg : C.bg, borderRadius: 10, border: `1px solid ${d.already_synced ? C.greenBorder : C.border}` }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{d.facility_name || d.company_name || '—'}</div>
                      <div style={{ fontSize: 11, color: C.inkFaint }}>{d.company_name}{d.room_count ? ` / ${d.room_count}室` : ''}</div>
                    </div>
                    {d.already_synced ? (
                      <span style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>✓ 同期済</span>
                    ) : (
                      <button onClick={() => handleSync(d.id)} disabled={syncingId === d.id} style={{ background: C.accent, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: syncingId === d.id ? 0.6 : 1 }}>
                        {syncingId === d.id ? '同期中...' : '→ 同期'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 手動登録 */}
          {mode === 'manual' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={{ fontSize: 11, color: C.inkFaint, fontWeight: 600, display: 'block', marginBottom: 4 }}>施設名・会社名 *</label><input value={name} onChange={e => setName(e.target.value)} placeholder="例: 箱根温泉 紫雲荘" style={inp} /></div>
                <div><label style={{ fontSize: 11, color: C.inkFaint, fontWeight: 600, display: 'block', marginBottom: 4 }}>担当者名</label><input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="例: 山田太郎" style={inp} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={{ fontSize: 11, color: C.inkFaint, fontWeight: 600, display: 'block', marginBottom: 4 }}>メールアドレス</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="例: info@example.com" style={inp} /></div>
                <div><label style={{ fontSize: 11, color: C.inkFaint, fontWeight: 600, display: 'block', marginBottom: 4 }}>電話番号</label><input value={phone} onChange={e => setPhone(e.target.value)} placeholder="例: 03-1234-5678" style={inp} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={{ fontSize: 11, color: C.inkFaint, fontWeight: 600, display: 'block', marginBottom: 4 }}>客室数</label><input type="number" value={roomCount} onChange={e => setRoomCount(e.target.value)} placeholder="例: 25" style={inp} /></div>
                <div><label style={{ fontSize: 11, color: C.inkFaint, fontWeight: 600, display: 'block', marginBottom: 4 }}>申請する補助金 *</label><select value={subsidyType} onChange={e => setSubsidyType(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>{SUBSIDY_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
              </div>
              <button onClick={handleManual} disabled={!name.trim() || saving} style={{ marginTop: 8, background: name.trim() && !saving ? C.accent : C.border, color: name.trim() && !saving ? '#fff' : C.inkFaint, border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: name.trim() && !saving ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                {saving ? '登録中...' : '登録して申請管理を開始'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
