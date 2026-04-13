'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { Application, Message } from '@/types/database'

const C = {
  bg: '#f5f4f0', surface: '#ffffff', surfaceAlt: '#faf9f6',
  border: '#e5e2da', borderMid: '#d0cdc4',
  ink: '#1a1814', inkMid: '#5a5650', inkFaint: '#9b9890',
  accent: '#c45c1a', accentBg: '#fdf0e8', accentBorder: '#f0c8a4',
  green: '#2d7a47', greenBg: '#edf7f1',
  blue: '#1a5fa8', blueBg: '#eaf2fc', blueBorder: '#a4c8f0',
  slack: '#4a154b',
} as const

type AppWithClient = Application & {
  clients?: { name: string; email: string; contact_name: string | null } | null
}

interface Props {
  applications: AppWithClient[]
  csName: string
}

function ChatPanel({ applicationId, csName }: { applicationId: string; csName: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat-messages?applicationId=${applicationId}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data ?? [])
      }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [applicationId])

  useEffect(() => {
    loadMessages()
    const interval = setInterval(loadMessages, 3000)
    return () => clearInterval(interval)
  }, [loadMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!input.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch('/api/chat-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, content: input.trim(), senderType: 'cs', senderName: csName }),
      })
      if (res.ok) {
        const msg = await res.json()
        setMessages(prev => [...prev, msg])
        setInput('')
      }
    } catch { /* ignore */ }
    finally { setSending(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {loading && <div style={{ textAlign: 'center', color: C.inkFaint, fontSize: 13, paddingTop: 40 }}>読み込み中...</div>}
        {!loading && messages.length === 0 && (
          <div style={{ textAlign: 'center', color: C.inkFaint, fontSize: 13, paddingTop: 40, lineHeight: 1.6 }}>
            まだメッセージはありません。
          </div>
        )}
        {messages.map(msg => {
          const isMe = msg.sender_type === 'cs'
          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: isMe ? C.accent : C.blue, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                {isMe ? 'CS' : '客'}
              </div>
              <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', gap: 3, alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, color: C.inkFaint }}>
                  <span style={{ fontWeight: 600 }}>{msg.sender_name}</span>
                  <span>{new Date(msg.created_at).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace('/', '-')}</span>
                </div>
                <div style={{ background: isMe ? C.accent : C.surface, color: isMe ? '#fff' : C.ink, border: isMe ? 'none' : `1px solid ${C.border}`, borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px', padding: '10px 14px', fontSize: 13, lineHeight: 1.6, boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
                  {msg.content}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      <div style={{ borderTop: `1px solid ${C.border}`, padding: '14px 20px', background: C.surfaceAlt }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="メッセージを入力"
            rows={2}
            disabled={sending}
            style={{ flex: 1, background: C.surface, border: `1px solid ${C.borderMid}`, borderRadius: 10, padding: '10px 14px', color: C.ink, fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none', lineHeight: 1.5, opacity: sending ? 0.7 : 1 }}
          />
          <button onClick={handleSend} disabled={!input.trim() || sending} style={{ background: input.trim() && !sending ? C.accent : C.border, color: input.trim() && !sending ? '#fff' : C.inkFaint, border: 'none', borderRadius: 10, width: 44, height: 44, fontSize: 20, cursor: input.trim() && !sending ? 'pointer' : 'not-allowed', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ↑
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminChatClient({ applications, csName }: Props) {
  const [selId, setSelId] = useState<string>(applications[0]?.id ?? '')
  const app = applications.find(a => a.id === selId) ?? applications[0]

  if (!app) {
    return <div style={{ padding: 40, textAlign: 'center', color: C.inkFaint, fontSize: 14 }}>案件がありません</div>
  }

  const clientName = app.clients?.name ?? '—'
  const contactName = app.clients?.contact_name ?? clientName

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800 }}>チャット管理</h2>
        <p style={{ margin: 0, color: C.inkFaint, fontSize: 13 }}>顧客とのやりとりを管理</p>
      </div>

      {/* 案件セレクター */}
      {applications.length > 1 && (
        <div style={{ marginBottom: 20, display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
          {applications.map(a => (
            <button key={a.id} onClick={() => setSelId(a.id)} style={{ background: selId === a.id ? C.accentBg : C.surface, color: selId === a.id ? C.accent : C.inkMid, border: `1px solid ${selId === a.id ? C.accentBorder : C.border}`, borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: selId === a.id ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit' }}>
              {a.clients?.name ?? '—'}
            </button>
          ))}
        </div>
      )}

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', height: 560 }}>
        <div style={{ padding: '12px 16px', background: C.surfaceAlt, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>客</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{clientName} — {contactName}</div>
            <div style={{ fontSize: 11, color: C.inkFaint }}>{app.subsidy_type} / {app.status}</div>
          </div>
        </div>
        <div style={{ height: 'calc(100% - 58px)' }}>
          <ChatPanel applicationId={app.id} csName={csName} />
        </div>
      </div>
    </div>
  )
}
