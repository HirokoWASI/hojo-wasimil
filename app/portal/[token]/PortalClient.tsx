'use client'

import { useState } from 'react'
import type { Application, Client, Document, ScreeningLog } from '@/types/database'
import { OverviewTab } from '@/components/portal/OverviewTab'
import { AITab } from '@/components/portal/AITab'
import { FlowTab } from '@/components/portal/FlowTab'
import { DocsTab } from '@/components/portal/DocsTab'
import { ChatTab } from '@/components/portal/ChatTab'

const C = {
  bg: '#f8f7f3',
  surface: '#ffffff',
  surfaceAlt: '#faf9f6',
  border: '#e5e2da',
  ink: '#1a1814',
  inkFaint: '#9b9890',
  accent: '#c45c1a',
  green: '#2d7a47',
  slack: '#4a154b',
} as const

type Tab = 'overview' | 'ai' | 'flow' | 'docs' | 'chat'

interface SubsidyInfo {
  name: string; organizer: string | null; summary: string | null
  subsidy_amount: string | null; subsidy_rate: string | null; application_end: string | null
  target_business: string | null; requirements: string[]; eligible_expenses: string[]
}

interface Props {
  client: Client
  applications: Application[]
  documents: Document[]
  screeningLogs: ScreeningLog[]
  subsidyInfoMap?: Record<string, SubsidyInfo>
}

export function PortalClient({ client, applications, documents, screeningLogs, subsidyInfoMap }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [selectedAppId, setSelectedAppId] = useState<string>(applications[0]?.id ?? '')
  const [docs, setDocs] = useState(documents)

  const selectedApp = applications.find((a) => a.id === selectedAppId) ?? applications[0]
  const appDocs = docs.filter((d) => d.application_id === selectedAppId)
  const screeningLog = screeningLogs.find((s) => s.application_id === selectedAppId) ?? null

  const pendingDocs = appDocs.filter((d) => d.status === '未提出' || d.status === '差し戻し').length
  const approvedDocs = appDocs.filter((d) => d.status === '承認済').length
  const reqDocs = appDocs.filter((d) => d.required)

  const daysLeft = selectedApp?.deadline
    ? Math.ceil((new Date(selectedApp.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: '補助金概要' },
    { id: 'ai',       label: 'AI診断結果' },
    { id: 'flow',     label: '申請フロー' },
    { id: 'docs',     label: `書類提出 ${approvedDocs}/${reqDocs.length}` },
    { id: 'chat',     label: '担当者チャット 💬' },
  ]

  function handleDocsRefresh() {
    window.location.reload()
  }

  if (applications.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: C.surface, borderRadius: 16, padding: '40px 32px', textAlign: 'center', border: `1px solid ${C.border}` }}>
          <p style={{ color: C.inkFaint, fontSize: 14 }}>申請案件はまだ登録されていません。担当者からご連絡をお待ちください。</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', fontFamily: "'Hiragino Kaku Gothic ProN','Hiragino Sans',Meiryo,sans-serif" }}>

      {/* オレンジヘッダー */}
      <div style={{ background: C.accent }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '20px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color: '#fff' }}>補</div>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>WASIMIL 補助金サポートポータル</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{client.name} 様</div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* 複数案件セレクター */}
              {applications.length > 1 && (
                <select
                  value={selectedAppId}
                  onChange={(e) => setSelectedAppId(e.target.value)}
                  style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, color: '#fff', fontSize: 12, padding: '5px 10px', outline: 'none' }}
                >
                  {applications.map((app) => (
                    <option key={app.id} value={app.id} style={{ color: C.ink, background: '#fff' }}>
                      {app.subsidy_type}
                    </option>
                  ))}
                </select>
              )}
              {selectedApp?.cs_name && (
                <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '4px 14px', fontSize: 12, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, background: '#4ade80', borderRadius: '50%', display: 'inline-block' }} />
                  担当: {selectedApp.cs_name}
                </div>
              )}
            </div>
          </div>

          {/* 期限アラート */}
          {daysLeft != null && daysLeft <= 14 && (
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '8px 8px 0 0', padding: '8px 16px', marginBottom: 0, fontSize: 12, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
              ⚠ 申請期限まで残り<strong>{daysLeft}日</strong>です。書類の準備を急いでください。
            </div>
          )}

          {/* タブ */}
          <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }}>
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  background: activeTab === t.id ? C.surface : 'transparent',
                  color: activeTab === t.id ? C.accent : 'rgba(255,255,255,0.8)',
                  border: 'none',
                  padding: '11px 20px',
                  fontSize: 13,
                  fontWeight: activeTab === t.id ? 700 : 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  borderRadius: '8px 8px 0 0',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* コンテンツ */}
      <div style={{ flex: 1, maxWidth: 860, margin: '0 auto', width: '100%', padding: '24px' }}>
        {activeTab === 'overview' && (
          <OverviewTab application={selectedApp} onChatClick={() => setActiveTab('chat')} subsidyInfo={subsidyInfoMap?.[selectedApp?.subsidy_type ?? ''] ?? null} />
        )}
        {activeTab === 'ai' && (
          <AITab screeningLog={screeningLog} onChatClick={() => setActiveTab('chat')} />
        )}
        {activeTab === 'flow' && (
          <FlowTab application={selectedApp} onDocsClick={() => setActiveTab('docs')} onChatClick={() => setActiveTab('chat')} />
        )}
        {activeTab === 'docs' && (
          <DocsTab
            documents={appDocs}
            applicationId={selectedAppId}
            onRefresh={handleDocsRefresh}
            csName={selectedApp?.cs_name ?? '担当者'}
            csEmail={selectedApp?.cs_email ?? ''}
          />
        )}
        {activeTab === 'chat' && (
          <ChatTab applicationId={selectedAppId} client={client} csName={selectedApp?.cs_name ?? '担当者'} />
        )}
      </div>
    </div>
  )
}
