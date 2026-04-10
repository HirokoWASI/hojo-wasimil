'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Application, Document, ScreeningLog } from '@/types/database'

const C = {
  bg: '#f5f4f0', surface: '#ffffff', surfaceAlt: '#faf9f6',
  border: '#e5e2da', borderMid: '#d0cdc4',
  ink: '#1a1814', inkMid: '#5a5650', inkFaint: '#9b9890',
  accent: '#c45c1a', accentBg: '#fdf0e8', accentBorder: '#f0c8a4',
  green: '#2d7a47', greenBg: '#edf7f1', greenBorder: '#a8d9b8',
  blue: '#1a5fa8', blueBg: '#eaf2fc', blueBorder: '#a4c8f0',
  red: '#b83232', redBg: '#fdf0f0', redBorder: '#f0b8b8',
  yellow: '#7a5c00', yellowBg: '#fdf8e8', yellowBorder: '#e8d490',
} as const

const STATUS_TO_STEP: Record<string, number> = {
  '適格審査中': 0, '書類準備中': 1, '申請中': 2, '採択待ち': 3, '採択済': 5, '不採択': 2,
}

interface Props {
  application: Application
  documents: Document[]
  screeningLog: ScreeningLog | null
  onChatClick: () => void
  onRefresh: () => void
}

export function FlowTab({ application, documents, screeningLog, onChatClick, onRefresh }: Props) {
  const currentStep = STATUS_TO_STEP[application.status] ?? 0
  const ai = screeningLog?.result as any
  const supabase = createClient()

  // 書類アップロード
  const [openUploadId, setOpenUploadId] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const customerDocs = documents.filter(d => d.name !== '見積書（AZOO発行）' && d.name !== 'gBizIDプライム確認')
  const azooDoc = documents.find(d => d.name === '見積書（AZOO発行）')
  const gbizDoc = documents.find(d => d.name === 'gBizIDプライム確認')

  async function handleUpload(docId: string) {
    if (!uploadedFile) return
    setUploading(docId)
    try {
      const ext = uploadedFile.name.split('.').pop()
      const path = `${application.id}/${docId}.${ext}`
      await supabase.storage.from('documents').upload(path, uploadedFile, { upsert: true })
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path)
      await supabase.from('documents').update({ status: '提出済', file_url: urlData.publicUrl, file_name: uploadedFile.name, submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', docId)
      setOpenUploadId(null); setUploadedFile(null); onRefresh()
    } catch { alert('アップロードに失敗しました') }
    finally { setUploading(null) }
  }

  const steps = [
    { label: '適格性確認', detail: 'AI診断による適格性チェック' },
    { label: '必要書類の準備', detail: '申請に必要な書類を準備' },
    { label: '申請書の提出', detail: '申請マイページから申請提出' },
    { label: '審査・採択通知', detail: '事務局による審査' },
    { label: '事業実施', detail: 'WASIMIL導入・運用開始' },
    { label: '実績報告・補助金受給', detail: '実績報告書提出・補助金入金' },
  ]

  function StepBadge({ isDone, isActive }: { isDone: boolean; isActive: boolean }) {
    if (isDone) return <span style={{ fontSize: 10, background: C.greenBg, color: C.green, border: `1px solid ${C.greenBorder}`, padding: '1px 8px', borderRadius: 10, fontWeight: 700 }}>完了</span>
    if (isActive) return <span style={{ fontSize: 10, background: C.accentBg, color: C.accent, border: `1px solid ${C.accentBorder}`, padding: '1px 8px', borderRadius: 10, fontWeight: 700 }}>進行中</span>
    return null
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* 進捗ヘッダー */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 20px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>申請手続きの進捗</span>
        <span style={{ fontSize: 13, color: C.accent, fontWeight: 700 }}>Step {currentStep + 1} / {steps.length}</span>
      </div>

      {steps.map((step, i) => {
        const isDone = i < currentStep
        const isActive = i === currentStep
        return (
          <div key={i} style={{ display: 'flex', gap: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 48, flexShrink: 0 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, background: isDone ? C.green : isActive ? C.accent : C.border, color: isDone || isActive ? '#fff' : C.inkFaint }}>
                {isDone ? '✓' : i + 1}
              </div>
              {i < steps.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 16, background: isDone ? C.green : C.border, margin: '4px 0' }} />}
            </div>
            <div style={{ flex: 1, paddingBottom: 14, paddingLeft: 12 }}>
              <div style={{ background: C.surface, border: `1px solid ${isActive ? C.accentBorder : C.border}`, borderRadius: 12, padding: '13px 18px', boxShadow: isActive ? `0 0 0 3px ${C.accentBg}` : 'none' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: isDone ? C.green : isActive ? C.accent : C.inkFaint }}>{step.label}</span>
                  <StepBadge isDone={isDone} isActive={isActive} />
                </div>
                <div style={{ fontSize: 12, color: C.inkFaint }}>{step.detail}</div>

                {/* ===== Step 1: AI診断結果をインライン表示 ===== */}
                {i === 0 && ai && (
                  <div style={{ marginTop: 12, background: ai.score >= 70 ? C.greenBg : C.yellowBg, border: `1px solid ${ai.score >= 70 ? C.greenBorder : C.yellowBorder}`, borderRadius: 10, padding: '12px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: ai.score >= 70 ? C.green : C.yellow }}>
                        {ai.eligible ? '✅ 申請推奨' : '⚠️ 要確認'} — スコア {ai.score}/100
                      </span>
                      <span style={{ fontSize: 11, color: C.inkFaint }}>{ai.frame}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 6, fontSize: 12 }}>
                      <span style={{ color: C.accent, fontWeight: 600 }}>補助額: {ai.maxAmount}</span>
                      <span style={{ color: C.blue, fontWeight: 600 }}>補助率: {ai.subsidyRate}</span>
                    </div>
                    {ai.reasons?.length > 0 && (
                      <div style={{ fontSize: 11, color: C.inkMid }}>
                        {ai.reasons.slice(0, 3).map((r: string, j: number) => <div key={j}><span style={{ color: C.green }}>✓</span> {r}</div>)}
                      </div>
                    )}
                    {ai.nextAction && (
                      <div style={{ marginTop: 6, fontSize: 11, color: C.accent, fontWeight: 600 }}>次のアクション: {ai.nextAction}</div>
                    )}
                  </div>
                )}
                {i === 0 && !ai && isActive && (
                  <div style={{ marginTop: 8, fontSize: 12, color: C.inkFaint }}>担当者がAI診断を実施します。結果はここに表示されます。</div>
                )}

                {/* ===== Step 2: 書類準備をインライン表示 ===== */}
                {i === 1 && (isActive || isDone) && (
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* gBizID確認 */}
                    {gbizDoc && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: gbizDoc.status === '承認済' ? C.greenBg : C.bg, border: `1px solid ${gbizDoc.status === '承認済' ? C.greenBorder : C.border}`, borderRadius: 8, padding: '10px 14px' }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>gBizIDプライム</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: gbizDoc.status === '承認済' ? C.green : C.red }}>
                          {gbizDoc.status === '承認済' ? '✓ 取得済' : '未取得（約2週間必要）'}
                        </span>
                      </div>
                    )}

                    {/* 見積書（AZOO発行） */}
                    {azooDoc && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: azooDoc.status === '承認済' ? C.greenBg : C.blueBg, border: `1px solid ${azooDoc.status === '承認済' ? C.greenBorder : C.blueBorder}`, borderRadius: 8, padding: '10px 14px' }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>見積書（AZOO発行）</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: azooDoc.status === '承認済' ? C.green : C.blue }}>
                          {azooDoc.status === '承認済' ? '✓ 発行済' : '担当者が作成中'}
                        </span>
                      </div>
                    )}

                    {/* 顧客が準備する書類 */}
                    {customerDocs.map(doc => {
                      const isOpen = openUploadId === doc.id
                      const statusCfg = { '未提出': { color: C.inkFaint, label: '未準備' }, '提出済': { color: C.blue, label: '確認中' }, '確認中': { color: C.yellow, label: '確認中' }, '承認済': { color: C.green, label: '✓ 準備完了' }, '差し戻し': { color: C.red, label: '要修正' } }[doc.status] ?? { color: C.inkFaint, label: doc.status }

                      return (
                        <div key={doc.id} style={{ background: C.surface, border: `1px solid ${doc.status === '差し戻し' ? C.redBorder : C.border}`, borderRadius: 8, padding: '10px 14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 600 }}>{doc.name}</span>
                              {doc.required && <span style={{ fontSize: 9, color: C.red, background: C.redBg, padding: '1px 5px', borderRadius: 6, fontWeight: 700 }}>必須</span>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: statusCfg.color }}>{statusCfg.label}</span>
                              {(doc.status === '未提出' || doc.status === '差し戻し') && (
                                <button onClick={() => { if (isOpen) { setOpenUploadId(null); setUploadedFile(null) } else { setOpenUploadId(doc.id); setUploadedFile(null) } }} style={{ background: C.accent, color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                                  ↑ 提出する
                                </button>
                              )}
                            </div>
                          </div>
                          {doc.status === '差し戻し' && doc.note && (
                            <div style={{ marginTop: 6, fontSize: 11, color: C.red, background: C.redBg, borderRadius: 6, padding: '6px 10px' }}>修正依頼: {doc.note}</div>
                          )}
                          {isOpen && (
                            <div style={{ marginTop: 10, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
                              <div
                                onDragOver={e => e.preventDefault()}
                                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setUploadedFile(f) }}
                                onClick={() => fileRef.current?.click()}
                                style={{ border: `2px dashed ${uploadedFile ? C.greenBorder : C.borderMid}`, borderRadius: 8, padding: '16px', textAlign: 'center', cursor: 'pointer', background: uploadedFile ? C.greenBg : C.surfaceAlt, fontSize: 12 }}
                              >
                                <input ref={fileRef} type="file" style={{ display: 'none' }} accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" onChange={e => { if (e.target.files?.[0]) setUploadedFile(e.target.files[0]) }} />
                                {uploadedFile ? <span style={{ color: C.green, fontWeight: 700 }}>📎 {uploadedFile.name}</span> : 'ファイルを選択またはドロップ'}
                              </div>
                              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                <button onClick={() => handleUpload(doc.id)} disabled={!uploadedFile || uploading === doc.id} style={{ flex: 1, background: uploadedFile ? C.accent : C.border, color: uploadedFile ? '#fff' : C.inkFaint, border: 'none', borderRadius: 6, padding: '8px', fontSize: 12, fontWeight: 700, cursor: uploadedFile ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                                  {uploading === doc.id ? 'アップロード中...' : '提出する'}
                                </button>
                                <button onClick={() => { setOpenUploadId(null); setUploadedFile(null) }} style={{ background: C.bg, color: C.inkMid, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>取消</button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* アクティブステップのボタン */}
                {isActive && i !== 0 && i !== 1 && (
                  <div style={{ marginTop: 10 }}>
                    <button onClick={onChatClick} style={{ background: C.blueBg, color: C.blue, border: `1px solid ${C.blueBorder}`, borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      💬 担当者に相談
                    </button>
                  </div>
                )}
                {isActive && (i === 0 || i === 1) && (
                  <div style={{ marginTop: 10 }}>
                    <button onClick={onChatClick} style={{ background: C.blueBg, color: C.blue, border: `1px solid ${C.blueBorder}`, borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      💬 担当者に相談
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
