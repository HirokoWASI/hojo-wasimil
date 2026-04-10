'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useChat } from '@/hooks/useChat'
import type { Application, Document, Message, ScreeningLog, EmailLog, DocumentStatus, ApplicationStatus } from '@/types/database'

const STATUS_COLORS: Record<string, string> = {
  '適格審査中': 'bg-yellow-100 text-yellow-700',
  '書類準備中': 'bg-blue-100 text-blue-700',
  '申請中': 'bg-purple-100 text-purple-700',
  '採択待ち': 'bg-orange-100 text-orange-700',
  '採択済': 'bg-green-100 text-green-700',
  '不採択': 'bg-neutral-100 text-neutral-600',
}

const DOC_STATUS_COLORS: Record<string, string> = {
  '未提出': 'bg-neutral-100 text-neutral-600',
  '提出済': 'bg-blue-100 text-blue-700',
  '確認中': 'bg-yellow-100 text-yellow-700',
  '承認済': 'bg-green-100 text-green-700',
  '差し戻し': 'bg-red-100 text-red-700',
}

type Tab = 'overview' | 'docs' | 'chat' | 'ai' | 'email'

interface Props {
  application: Application & { clients: any }
  documents: Document[]
  initialMessages: Message[]
  screeningLogs: ScreeningLog[]
  emailLogs: EmailLog[]
}

export function ApplicationDetailClient({ application, documents, initialMessages, screeningLogs, emailLogs }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [docs, setDocs] = useState(documents)
  const [appStatus, setAppStatus] = useState<ApplicationStatus>(application.status)
  const [chatInput, setChatInput] = useState('')
  const [sending, setSending] = useState(false)
  const [returnNote, setReturnNote] = useState<{ docId: string; note: string } | null>(null)
  const [alertForm, setAlertForm] = useState({ type: 'deadline_alert', subject: '', body: '' })
  const [alertSending, setAlertSending] = useState(false)

  const { messages, sendMessage } = useChat(application.id)
  const supabase = createClient()

  const ai = screeningLogs[0]?.result

  async function updateDocStatus(docId: string, status: DocumentStatus, note?: string) {
    const updates: any = { status, updated_at: new Date().toISOString() }
    if (note !== undefined) updates.note = note

    const { error } = await supabase.from('documents').update(updates).eq('id', docId)
    if (!error) {
      setDocs((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, status, note: note ?? d.note } : d))
      )
    }
  }

  async function updateAppStatus(status: ApplicationStatus) {
    const { error } = await supabase
      .from('applications')
      .update({ status })
      .eq('id', application.id)
    if (!error) setAppStatus(status)
  }

  async function handleChatSend(e: React.FormEvent) {
    e.preventDefault()
    if (!chatInput.trim() || sending) return
    setSending(true)
    try {
      await sendMessage(chatInput.trim(), 'cs', application.cs_name ?? 'AZOO担当')
      setChatInput('')
    } catch {
      alert('送信失敗')
    } finally {
      setSending(false)
    }
  }

  async function handleSendAlert(e: React.FormEvent) {
    e.preventDefault()
    setAlertSending(true)
    try {
      const res = await fetch('/api/send-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: application.id,
          ...alertForm,
        }),
      })
      if (!res.ok) throw new Error()
      alert('メールを送信しました')
      setAlertForm({ type: 'deadline_alert', subject: '', body: '' })
    } catch {
      alert('送信に失敗しました')
    } finally {
      setAlertSending(false)
    }
  }

  const TABS = [
    { id: 'overview' as Tab, label: '概要' },
    { id: 'docs' as Tab, label: `書類 (${docs.length})` },
    { id: 'chat' as Tab, label: 'チャット' },
    { id: 'ai' as Tab, label: 'AI診断' },
    { id: 'email' as Tab, label: 'メール' },
  ]

  return (
    <div className="p-6 max-w-5xl">
      {/* ヘッダー */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-sm text-neutral-400 mb-1">
            <a href="/applications" className="hover:text-accent">申請案件</a> /
          </p>
          <h1 className="text-2xl font-bold text-neutral-900">{application.clients?.name}</h1>
          <p className="text-neutral-500 text-sm mt-1">{application.subsidy_type}</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={appStatus}
            onChange={(e) => updateAppStatus(e.target.value as ApplicationStatus)}
            className="input w-auto text-sm"
          >
            {['適格審査中', '書類準備中', '申請中', '採択待ち', '採択済', '不採択'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* タブ */}
      <div className="flex gap-1 border-b border-neutral-200 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-accent text-accent'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 概要タブ */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="card p-5">
            <h2 className="font-semibold text-neutral-800 mb-4">案件情報</h2>
            <dl className="space-y-3 text-sm">
              {[
                ['顧客名', application.clients?.name],
                ['担当者名', application.clients?.contact_name],
                ['連絡先', application.clients?.email],
                ['補助金', application.subsidy_type],
                ['申請枠', application.subsidy_frame],
                ['補助額', application.amount],
                ['期限', application.deadline ? new Date(application.deadline).toLocaleDateString('ja-JP') : null],
                ['Slackチャンネル', application.slack_channel],
                ['CS担当', application.cs_name],
              ].map(([label, value]) => value ? (
                <div key={label as string} className="flex gap-4">
                  <dt className="w-28 text-neutral-400 shrink-0">{label}</dt>
                  <dd className="text-neutral-800">{value}</dd>
                </div>
              ) : null)}
            </dl>
          </div>

          <div className="card p-5">
            <h2 className="font-semibold text-neutral-800 mb-4">書類提出状況</h2>
            <div className="space-y-2">
              {docs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between text-sm">
                  <span className="text-neutral-700 truncate flex-1">{doc.name}</span>
                  <span className={`badge ml-2 ${DOC_STATUS_COLORS[doc.status] ?? ''}`}>
                    {doc.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 書類タブ */}
      {activeTab === 'docs' && (
        <div className="space-y-3">
          {docs.map((doc) => (
            <div key={doc.id} className="card p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-neutral-800 text-sm">{doc.name}</span>
                    {doc.required && <span className="badge bg-red-50 text-red-600">必須</span>}
                    <span className={`badge ${DOC_STATUS_COLORS[doc.status] ?? ''}`}>{doc.status}</span>
                  </div>
                  {doc.file_name && (
                    <p className="text-xs text-neutral-400">📎 {doc.file_name}</p>
                  )}
                  {doc.note && (
                    <p className="mt-1 text-xs text-red-600 bg-red-50 rounded px-2 py-1">{doc.note}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {doc.file_url && (
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ghost text-xs"
                    >
                      ファイル確認
                    </a>
                  )}
                  {doc.status === '提出済' && (
                    <>
                      <button
                        onClick={() => updateDocStatus(doc.id, '承認済')}
                        className="text-xs px-3 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors font-medium"
                      >
                        承認
                      </button>
                      <button
                        onClick={() => setReturnNote({ docId: doc.id, note: '' })}
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors font-medium"
                      >
                        差し戻し
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* 差し戻しコメント入力 */}
              {returnNote?.docId === doc.id && (
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={returnNote.note}
                    onChange={(e) => setReturnNote({ ...returnNote, note: e.target.value })}
                    placeholder="差し戻し理由を入力..."
                    className="input flex-1 text-sm"
                  />
                  <button
                    onClick={async () => {
                      await updateDocStatus(doc.id, '差し戻し', returnNote.note)
                      setReturnNote(null)
                    }}
                    className="btn-primary text-sm"
                  >
                    送信
                  </button>
                  <button
                    onClick={() => setReturnNote(null)}
                    className="btn-secondary text-sm"
                  >
                    キャンセル
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* チャットタブ */}
      {activeTab === 'chat' && (
        <div className="card overflow-hidden">
          <div className="h-96 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender_type === 'cs' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[70%]">
                  <p className="text-xs text-neutral-400 mb-1 px-1">{msg.sender_name}</p>
                  <div
                    className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.sender_type === 'cs'
                        ? 'bg-accent text-white rounded-tr-sm'
                        : 'bg-neutral-100 text-neutral-800 rounded-tl-sm'
                    }`}
                  >
                    {msg.content}
                    {msg.from_slack && <span className="ml-1 text-xs opacity-70">[Slack]</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={handleChatSend} className="p-4 border-t border-neutral-200 flex gap-3">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="顧客へのメッセージを入力..."
              className="input flex-1"
            />
            <button type="submit" disabled={!chatInput.trim() || sending} className="btn-primary disabled:opacity-50">
              送信
            </button>
          </form>
        </div>
      )}

      {/* AI診断タブ */}
      {activeTab === 'ai' && (
        <div className="space-y-4">
          {ai ? (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-neutral-800">最新AI診断結果</h2>
                <div className="flex items-center gap-3">
                  <span className={`badge ${ai.eligible ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {ai.eligible ? '適格' : '要確認'}
                  </span>
                  <span className="text-2xl font-bold text-accent">{ai.score}点</span>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div><dt className="text-neutral-400 text-xs">推奨枠</dt><dd className="font-medium">{ai.frame}</dd></div>
                <div><dt className="text-neutral-400 text-xs">最大補助額</dt><dd className="font-medium">{ai.maxAmount}</dd></div>
                <div><dt className="text-neutral-400 text-xs">補助率</dt><dd className="font-medium">{ai.subsidyRate}</dd></div>
              </dl>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-neutral-400 mb-1">適格理由</p>
                  <ul className="space-y-1">{ai.reasons.map((r, i) => <li key={i} className="flex gap-2"><span className="text-brand-green">✓</span>{r}</li>)}</ul>
                </div>
                <div className="bg-accent/5 border border-accent/20 rounded-lg p-3">
                  <p className="text-xs text-neutral-400 mb-1">次のアクション</p>
                  <p>{ai.nextAction}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-8 text-center text-neutral-400">
              AI診断はまだ実行されていません
            </div>
          )}
        </div>
      )}

      {/* メールタブ */}
      {activeTab === 'email' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="card p-5">
            <h2 className="font-semibold text-neutral-800 mb-4">メール送信</h2>
            <form onSubmit={handleSendAlert} className="space-y-3">
              <div>
                <label className="label">種別</label>
                <select
                  value={alertForm.type}
                  onChange={(e) => setAlertForm({ ...alertForm, type: e.target.value })}
                  className="input"
                >
                  <option value="deadline_alert">期限アラート</option>
                  <option value="portal_invite">ポータル招待</option>
                  <option value="return">差し戻し通知</option>
                  <option value="reminder">リマインダー</option>
                </select>
              </div>
              <div>
                <label className="label">件名</label>
                <input
                  type="text"
                  value={alertForm.subject}
                  onChange={(e) => setAlertForm({ ...alertForm, subject: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">本文</label>
                <textarea
                  value={alertForm.body}
                  onChange={(e) => setAlertForm({ ...alertForm, body: e.target.value })}
                  className="input min-h-[120px]"
                  required
                />
              </div>
              <button type="submit" disabled={alertSending} className="btn-primary w-full">
                {alertSending ? '送信中...' : '送信する'}
              </button>
            </form>
          </div>

          <div className="card p-5">
            <h2 className="font-semibold text-neutral-800 mb-4">送信履歴</h2>
            <div className="space-y-2">
              {emailLogs.map((log) => (
                <div key={log.id} className="p-3 rounded-lg bg-neutral-50 text-sm">
                  <p className="font-medium text-neutral-800 truncate">{log.subject}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {new Date(log.sent_at).toLocaleString('ja-JP')} · {log.type}
                  </p>
                </div>
              ))}
              {!emailLogs.length && (
                <p className="text-sm text-neutral-400">送信履歴はありません</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
