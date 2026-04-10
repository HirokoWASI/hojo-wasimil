'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat } from '@/hooks/useChat'
import type { Client } from '@/types/database'

const C = {
  bg: '#f5f4f0',
  surface: '#ffffff',
  surfaceAlt: '#faf9f6',
  border: '#e5e2da',
  borderMid: '#d0cdc4',
  ink: '#1a1814',
  inkMid: '#5a5650',
  inkFaint: '#9b9890',
  accent: '#c45c1a',
  green: '#2d7a47',
  blue: '#1a5fa8',
  blueBg: '#eaf2fc',
  slack: '#4a154b',
} as const

interface Props {
  applicationId: string
  client: Client
  csName: string
}

export function ChatTab({ applicationId, client, csName }: Props) {
  const { messages, sendMessage, loading } = useChat(applicationId)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!input.trim() || sending) return
    setSending(true)
    try {
      await sendMessage(input.trim(), 'customer', client.contact_name ?? client.name)
      setInput('')
    } catch {
      alert('送信に失敗しました')
    } finally {
      setSending(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', height: 520, display: 'flex', flexDirection: 'column' }}>
      {/* ヘッダー */}
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, background: C.surfaceAlt, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>CS</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{csName}</div>
          <div style={{ fontSize: 11, color: C.inkFaint, display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ width: 6, height: 6, background: C.green, borderRadius: '50%', display: 'inline-block' }} />
            オンライン
            <span style={{ color: C.slack, marginLeft: 6, fontWeight: 700, fontSize: 10 }}>■</span>
            <span>Slack連携中</span>
          </div>
        </div>
      </div>

      {/* メッセージ一覧 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: C.inkFaint, fontSize: 13 }}>
            読み込み中...
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: C.inkFaint, fontSize: 13, textAlign: 'center', lineHeight: 1.6 }}>
            まだメッセージはありません。<br />担当者へのご質問はこちらからどうぞ。
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_type === 'customer'
          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: msg.sender_type === 'cs' ? C.accent : C.blue, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                {msg.sender_type === 'cs' ? 'CS' : '客'}
              </div>
              <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', gap: 3, alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, color: C.inkFaint }}>
                  <span style={{ fontWeight: 600 }}>{msg.sender_name}</span>
                  <span>{new Date(msg.created_at).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace('/', '-')}</span>
                  {msg.from_slack && (
                    <span style={{ background: C.slack, color: '#fff', fontSize: 9, padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>Slackより</span>
                  )}
                </div>
                <div style={{ background: isMe ? C.accent : C.surface, color: isMe ? '#fff' : C.ink, border: isMe ? 'none' : `1px solid ${C.border}`, borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px', padding: '10px 14px', fontSize: 13, lineHeight: 1.6, boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
                  {msg.content}
                </div>
                <div style={{ fontSize: 10, color: C.inkFaint, display: 'flex', alignItems: 'center', gap: 3 }}>
                  {msg.from_slack ? (
                    <span><span style={{ color: C.green }}>✓</span> Slack連携済</span>
                  ) : null}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* 入力エリア */}
      <div style={{ borderTop: `1px solid ${C.border}`, padding: '14px 20px', background: C.surfaceAlt }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="メッセージを入力（Shift+Enterで改行、Enterで送信）"
            rows={2}
            disabled={sending}
            style={{ flex: 1, background: C.surface, border: `1px solid ${C.borderMid}`, borderRadius: 10, padding: '10px 14px', color: C.ink, fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none', lineHeight: 1.5, opacity: sending ? 0.7 : 1 }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            style={{ background: input.trim() && !sending ? C.accent : C.border, color: input.trim() && !sending ? '#fff' : C.inkFaint, border: 'none', borderRadius: 10, width: 44, height: 44, fontSize: 20, cursor: input.trim() && !sending ? 'pointer' : 'not-allowed', flexShrink: 0, transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ↑
          </button>
        </div>
        <div style={{ fontSize: 10, color: C.inkFaint, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: C.slack, fontWeight: 700 }}>■</span>
          メッセージはSlackにリアルタイム連携されます
        </div>
      </div>
    </div>
  )
}
