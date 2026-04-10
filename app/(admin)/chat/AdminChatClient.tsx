'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat } from '@/hooks/useChat'
import type { Application } from '@/types/database'

const C = {
  bg: '#f5f4f0', surface: '#ffffff', surfaceAlt: '#faf9f6',
  border: '#e5e2da', borderMid: '#d0cdc4',
  ink: '#1a1814', inkMid: '#5a5650', inkFaint: '#9b9890',
  accent: '#c45c1a', accentBg: '#fdf0e8', accentBorder: '#f0c8a4',
  green: '#2d7a47', greenBg: '#edf7f1', greenBorder: '#a8d9b8',
  blue: '#1a5fa8', blueBg: '#eaf2fc', blueBorder: '#a4c8f0',
  slack: '#4a154b',
} as const

type AppWithClient = Application & {
  clients: { name: string; email: string; contact_name: string | null }
}

interface Props {
  applications: AppWithClient[]
  csName: string
}

// CS チャットパネル
function CSChatPanel({ applicationId, csName, clientContactName }: {
  applicationId: string
  csName: string
  clientContactName: string
}) {
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
      await sendMessage(input.trim(), 'cs', csName)
      setInput('')
    } catch {
      alert('送信に失敗しました')
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {loading && <div style={{ textAlign: 'center', color: C.inkFaint, fontSize: 13, paddingTop: 40 }}>読み込み中...</div>}
        {!loading && messages.length === 0 && (
          <div style={{ textAlign: 'center', color: C.inkFaint, fontSize: 13, paddingTop: 40, lineHeight: 1.6 }}>
            まだメッセージはありません。<br />顧客からの問い合わせがあるとここに表示されます。
          </div>
        )}
        {messages.map(msg => {
          const isMe = msg.sender_type === 'cs'
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
                {msg.from_slack && (
                  <div style={{ fontSize: 10, color: C.inkFaint, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <span style={{ color: C.green }}>✓</span> Slack連携済
                  </div>
                )}
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
            placeholder="CSとして返信（Slackにも同時投稿されます）"
            rows={2}
            disabled={sending}
            style={{ flex: 1, background: C.surface, border: `1px solid ${C.borderMid}`, borderRadius: 10, padding: '10px 14px', color: C.ink, fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none', lineHeight: 1.5, opacity: sending ? 0.7 : 1 }}
          />
          <button onClick={handleSend} disabled={!input.trim() || sending} style={{ background: input.trim() && !sending ? C.accent : C.border, color: input.trim() && !sending ? '#fff' : C.inkFaint, border: 'none', borderRadius: 10, width: 44, height: 44, fontSize: 20, cursor: input.trim() && !sending ? 'pointer' : 'not-allowed', flexShrink: 0, transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

// Slack ミラーパネル
function SlackMirrorPanel({ applicationId, slackChannel }: {
  applicationId: string
  slackChannel: string
}) {
  const { messages, sendMessage } = useChat(applicationId)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendSlackReply() {
    if (!input.trim()) return
    await sendMessage(input.trim(), 'cs', 'CS（Slack）')
    setInput('')
  }

  return (
    <div style={{ background: '#1a1d21', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Slack header */}
      <div style={{ background: '#19171d', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ width: 28, height: 28, background: C.slack, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 900 }}>S</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{slackChannel}</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>WASIMIL Workspace · Supabase Edge Function 連携</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <span style={{ background: C.green, color: '#fff', fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>● 連携中</span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.25)', padding: '6px 0' }}>
          ポータルと双方向でリアルタイム同期しています
        </div>
        {messages.map(msg => (
          <div key={msg.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ width: 30, height: 30, borderRadius: 6, background: msg.sender_type === 'cs' ? '#E01E5A' : '#36C5F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {msg.sender_type === 'cs' ? 'CS' : '客'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: msg.sender_type === 'cs' ? '#E01E5A' : '#36C5F0' }}>{msg.sender_name}</span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                  {new Date(msg.created_at).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace('/', '-')}
                </span>
                {msg.sender_type === 'customer' && !msg.from_slack && (
                  <span style={{ fontSize: 9, background: 'rgba(54,197,240,0.2)', color: '#36C5F0', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>ポータルより</span>
                )}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>{msg.content}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') sendSlackReply() }}
            placeholder="Slackで返信 → ポータルに自動反映（Enter送信）"
            style={{ flex: 1, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '9px 14px', color: '#fff', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
          />
          <button onClick={sendSlackReply} disabled={!input.trim()} style={{ background: input.trim() ? '#36C5F0' : 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: 8, width: 38, height: 38, fontSize: 16, cursor: input.trim() ? 'pointer' : 'not-allowed', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ↑
          </button>
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 6 }}>
          Slack Events API → /api/slack/events → Supabase → Realtime → ポータル更新
        </div>
      </div>
    </div>
  )
}

export default function AdminChatClient({ applications, csName }: Props) {
  const [selId, setSelId] = useState<string>(applications[0]?.id ?? '')
  const [leftTab, setLeftTab] = useState<'chat' | 'arch'>('chat')
  const app = applications.find(a => a.id === selId) ?? applications[0]

  if (!app) {
    return <div style={{ padding: 40, textAlign: 'center', color: C.inkFaint, fontSize: 14 }}>案件がありません</div>
  }

  const clientName = app.clients?.name ?? '—'
  const slackChannel = app.slack_channel ?? `#portal-${clientName.toLowerCase().replace(/\s/g, '-')}`

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800 }}>チャット管理</h2>
        <p style={{ margin: 0, color: C.inkFaint, fontSize: 13 }}>顧客とのやりとりをSlack双方向連携でリアルタイム管理</p>
      </div>

      {/* 連携説明 */}
      <div style={{ background: C.blueBg, border: `1px solid ${C.blueBorder}`, borderRadius: 12, padding: '14px 20px', marginBottom: 20, fontSize: 12, color: C.blue, lineHeight: 1.6 }}>
        <strong>Slack双方向連携の仕組み:</strong> 顧客がポータルで送信 → Supabase Edge Function → Slack API で投稿。Slackで返信 → Slack Events API Webhook → Next.js API Route → Supabase INSERT → Supabase Realtime → ポータルにリアルタイム反映。
        <br /><strong>右側のSlack画面で返信すると、左のCSチャット・お客様ポータルに同時反映されます。</strong>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
        {/* 左：CS チャット */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', height: 560 }}>
          <div style={{ padding: '12px 16px', background: C.surfaceAlt, borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 8, alignItems: 'center' }}>
            {[{ id: 'chat', label: '💬 CS チャット' }, { id: 'arch', label: '◻ 技術構成' }].map(t => (
              <button key={t.id} onClick={() => setLeftTab(t.id as 'chat' | 'arch')} style={{ background: leftTab === t.id ? C.accent : 'transparent', color: leftTab === t.id ? '#fff' : C.inkMid, border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: leftTab === t.id ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                {t.label}
              </button>
            ))}
          </div>

          {leftTab === 'chat' && (
            <>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>客</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{clientName} — {app.clients?.contact_name ?? app.clients.name}</div>
                  <div style={{ fontSize: 11, color: C.inkFaint, display: 'flex', gap: 4, alignItems: 'center' }}>
                    <span style={{ color: C.slack, fontWeight: 700, fontSize: 10 }}>■</span> {slackChannel}
                  </div>
                </div>
              </div>
              <div style={{ height: 'calc(100% - 108px)' }}>
                <CSChatPanel applicationId={app.id} csName={csName} clientContactName={app.clients?.contact_name ?? app.clients.name} />
              </div>
            </>
          )}

          {leftTab === 'arch' && (
            <div style={{ padding: 20, overflowY: 'auto', height: 'calc(100% - 48px)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>実装フロー</div>
              {[
                { n: 1, col: C.blue,   title: '顧客がポータルでメッセージ送信',    body: 'Supabase messages テーブルに INSERT → slackPosted: false' },
                { n: 2, col: C.green,  title: 'Supabase Edge Function が発火',     body: 'Database Webhook (on INSERT) → Slack Web API で投稿 → slackPosted: true に更新' },
                { n: 3, col: C.slack,  title: 'Slackbot が投稿',                   body: `${slackChannel} に「[${clientName}] 田中様: 〇〇」を投稿。CSチームが確認` },
                { n: 4, col: C.accent, title: 'CSがSlackで返信',                   body: 'Slack Events API が message.channels イベントを Webhook 送信 → /api/slack/events' },
                { n: 5, col: C.green,  title: 'ポータルにリアルタイム反映',         body: 'API Route → Supabase INSERT (from_slack: true) → Supabase Realtime → useEffect でUI更新' },
              ].map(item => (
                <div key={item.n} style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: item.col, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{item.n}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, marginBottom: 3 }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: C.inkFaint, lineHeight: 1.5 }}>{item.body}</div>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 16, background: C.surfaceAlt, borderRadius: 10, padding: '14px 16px', border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Slack App の設定</div>
                {[
                  ['Bot Token Scopes', 'chat:write, channels:read, channels:history'],
                  ['Event Subscriptions', 'message.channels → Webhook URL 登録'],
                  ['Webhook URL', 'https://hojo.wasimil.jp/api/slack/events'],
                  ['署名検証', 'X-Slack-Signature ヘッダーで検証（HMAC-SHA256）'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', gap: 8, fontSize: 11, padding: '4px 0', borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ fontFamily: 'monospace', color: C.accent, minWidth: 140, flexShrink: 0 }}>{k}</span>
                    <span style={{ color: C.inkMid }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 右：Slack ミラー */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: C.slack, color: '#fff', width: 24, height: 24, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900 }}>S</span>
            Slack {slackChannel}（ここで返信するとポータルに反映）
          </div>
          <div style={{ height: 520 }}>
            <SlackMirrorPanel applicationId={app.id} slackChannel={slackChannel} />
          </div>
        </div>
      </div>

      {/* Supabase スキーマ */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginTop: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Supabase messages テーブル</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {[
            { col: 'id',             type: 'uuid',        desc: '主キー（自動生成）' },
            { col: 'application_id', type: 'uuid',        desc: '申請案件ID（FK）' },
            { col: 'sender_type',    type: 'text',        desc: "'customer' | 'cs'" },
            { col: 'sender_name',    type: 'text',        desc: '送信者表示名' },
            { col: 'content',        type: 'text',        desc: 'メッセージ本文' },
            { col: 'slack_ts',       type: 'text',        desc: 'Slackメッセージタイムスタンプ' },
            { col: 'slack_channel',  type: 'text',        desc: 'Slackチャンネル名' },
            { col: 'from_slack',     type: 'boolean',     desc: 'Slack経由の返信かどうか' },
            { col: 'created_at',     type: 'timestamptz', desc: '送信日時（自動）' },
          ].map(item => (
            <div key={item.col} style={{ background: C.surfaceAlt, borderRadius: 8, padding: '10px 14px', border: `1px solid ${C.border}` }}>
              <div style={{ fontFamily: 'monospace', fontSize: 12, color: C.accent, fontWeight: 700 }}>{item.col}</div>
              <div style={{ fontFamily: 'monospace', fontSize: 10, color: C.blue, marginTop: 2 }}>{item.type}</div>
              <div style={{ fontSize: 11, color: C.inkFaint, marginTop: 4 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
