'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Document } from '@/types/database'

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

const DOC_STATUS_CFG: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  '未提出':   { color: C.inkFaint, bg: C.bg,       border: C.border,       icon: '○' },
  '提出済':   { color: C.blue,     bg: C.blueBg,   border: C.blueBorder,   icon: '◑' },
  '確認中':   { color: C.yellow,   bg: C.yellowBg, border: C.yellowBorder, icon: '◐' },
  '承認済':   { color: C.green,    bg: C.greenBg,  border: C.greenBorder,  icon: '●' },
  '差し戻し': { color: C.red,      bg: C.redBg,    border: C.redBorder,    icon: '✕' },
}

function DocBadge({ status }: { status: string }) {
  const cfg = DOC_STATUS_CFG[status] ?? { color: C.inkFaint, bg: C.bg, border: C.border, icon: '○' }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {cfg.icon} {status}
    </span>
  )
}

interface Props {
  documents: Document[]
  applicationId: string
  onRefresh: () => void
  csName: string
  csEmail: string
}

export function DocsTab({ documents, applicationId, onRefresh, csName, csEmail }: Props) {
  const [uploading, setUploading] = useState<string | null>(null)
  const [openUploadId, setOpenUploadId] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const reqDocs = documents.filter(d => d.required)
  const approvedDocs = documents.filter(d => d.status === '承認済')
  const pct = reqDocs.length > 0 ? Math.round(approvedDocs.length / reqDocs.length * 100) : 0

  async function handleUpload(docId: string) {
    if (!uploadedFile) return
    setUploading(docId)
    try {
      const ext = uploadedFile.name.split('.').pop()
      const path = `${applicationId}/${docId}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(path, uploadedFile, { upsert: true })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(path)

      const { error: updateError } = await supabase
        .from('documents')
        .update({
          status: '提出済',
          file_url: urlData.publicUrl,
          file_name: uploadedFile.name,
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', docId)

      if (updateError) throw updateError
      setOpenUploadId(null)
      setUploadedFile(null)
      onRefresh()
    } catch {
      alert('アップロードに失敗しました')
    } finally {
      setUploading(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 進捗カード */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>書類提出進捗</span>
        <span style={{ fontSize: 18, fontWeight: 800, color: pct === 100 ? C.green : C.accent }}>{pct}% ({approvedDocs.length}/{reqDocs.length})</span>
      </div>

      <div style={{ background: C.accentBg, border: `1px solid ${C.accentBorder}`, borderRadius: 12, padding: '16px 20px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 4 }}>📋 書類のご提出をお願いします</div>
        <div style={{ fontSize: 12, color: C.inkMid }}>
          申請に必要な書類をご確認いただき、各書類をアップロードしてください。ご不明な点は担当の {csName}（{csEmail}）までご連絡ください。
        </div>
      </div>

      {documents.map((doc) => {
        const isOpen = openUploadId === doc.id
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
                {doc.submitted_at && (
                  <div style={{ fontSize: 12, color: C.inkFaint }}>提出日: {new Date(doc.submitted_at).toLocaleDateString('ja-JP')}</div>
                )}
                {doc.status === '差し戻し' && doc.note && (
                  <div style={{ marginTop: 8, background: C.redBg, border: `1px solid ${C.redBorder}`, borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ fontSize: 11, color: C.red, fontWeight: 700, marginBottom: 4 }}>↩ 修正依頼</div>
                    <div style={{ fontSize: 12, color: C.inkMid }}>{doc.note}</div>
                  </div>
                )}
                {doc.status === '承認済' && (
                  <div style={{ fontSize: 12, color: C.green, marginTop: 4 }}>✅ 受理・承認済みです。ありがとうございます。</div>
                )}
                {doc.status === '確認中' && (
                  <div style={{ fontSize: 12, color: C.yellow, marginTop: 4 }}>⏳ 担当者が内容を確認中です。</div>
                )}
                {doc.file_name && doc.status !== '未提出' && (
                  <div style={{ fontSize: 11, color: C.inkFaint, marginTop: 4 }}>📎 {doc.file_name}</div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                <DocBadge status={doc.status} />
                {(doc.status === '未提出' || doc.status === '差し戻し') && (
                  <button
                    onClick={() => {
                      if (isOpen) { setOpenUploadId(null); setUploadedFile(null) }
                      else { setOpenUploadId(doc.id); setUploadedFile(null) }
                    }}
                    style={{ background: C.accent, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    {doc.status === '差し戻し' ? '↩ 再提出' : '⬆ 提出する'}
                  </button>
                )}
                {doc.file_url && doc.status !== '未提出' && (
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: C.blue, textDecoration: 'underline' }}>確認</a>
                )}
              </div>
            </div>

            {isOpen && (
              <div style={{ marginTop: 16, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>ファイルをアップロード</div>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setUploadedFile(f) }}
                  onClick={() => fileRef.current?.click()}
                  style={{ border: `2px dashed ${uploadedFile ? C.greenBorder : C.borderMid}`, borderRadius: 10, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', background: uploadedFile ? C.greenBg : C.surfaceAlt, transition: 'all 0.2s' }}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    style={{ display: 'none' }}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                    onChange={(e) => { if (e.target.files?.[0]) setUploadedFile(e.target.files[0]) }}
                  />
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
                    onClick={() => handleUpload(doc.id)}
                    disabled={!uploadedFile || uploading === doc.id}
                    style={{ flex: 1, background: uploadedFile && uploading !== doc.id ? C.accent : C.border, color: uploadedFile && uploading !== doc.id ? '#fff' : C.inkFaint, border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, fontSize: 13, cursor: uploadedFile && uploading !== doc.id ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
                  >
                    {uploading === doc.id ? 'アップロード中...' : '提出する'}
                  </button>
                  <button
                    onClick={() => { setOpenUploadId(null); setUploadedFile(null) }}
                    style={{ background: C.surface, color: C.inkMid, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 16px', fontSize: 12, cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {documents.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px', color: C.inkFaint, fontSize: 13 }}>
          書類リストはまだ設定されていません
        </div>
      )}

      <div style={{ background: C.blueBg, border: `1px solid ${C.blueBorder}`, borderRadius: 12, padding: '16px 20px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.blue, marginBottom: 6 }}>お問い合わせ</div>
        <div style={{ fontSize: 12, color: C.inkMid }}>担当: {csName} / {csEmail}</div>
      </div>
    </div>
  )
}
