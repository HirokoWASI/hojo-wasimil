import type { Application } from '@/types/database'

const C = {
  surface: '#ffffff',
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
  blue: '#1a5fa8',
  blueBg: '#eaf2fc',
  blueBorder: '#a4c8f0',
} as const

const FLOW_STEPS = [
  { label: '適格性確認',          detail: 'AI診断による適格性チェック' },
  { label: '必要書類の準備',       detail: '必要書類の準備・アップロード' },
  { label: '申請書の提出',         detail: '申請書類一式の提出' },
  { label: '審査・採択通知',       detail: '審査機関による審査' },
  { label: '事業実施',            detail: 'システム導入・事業実施' },
  { label: '実績報告・補助金受給', detail: '実績報告書の提出・補助金受給' },
]

const STATUS_TO_STEP: Record<string, number> = {
  '適格審査中': 0,
  '書類準備中': 1,
  '申請中':     2,
  '採択待ち':   3,
  '採択済':     4,
  '不採択':     2,
}

interface Props {
  application: Application
  onDocsClick: () => void
  onChatClick: () => void
}

export function FlowTab({ application, onDocsClick, onChatClick }: Props) {
  const currentStep = STATUS_TO_STEP[application.status] ?? 0
  const totalSteps = FLOW_STEPS.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ヘッダー */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>申請手続きの進捗</span>
        <span style={{ fontSize: 13, color: C.accent, fontWeight: 700 }}>Step {currentStep + 1} / {totalSteps}</span>
      </div>

      {/* ステップ一覧 */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {FLOW_STEPS.map((step, i) => {
          const isDone = i < currentStep
          const isActive = i === currentStep
          return (
            <div key={i} style={{ display: 'flex', gap: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 48, flexShrink: 0 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, background: isDone ? C.green : isActive ? C.accent : C.border, color: isDone || isActive ? '#fff' : C.inkFaint }}>
                  {isDone ? '✓' : i + 1}
                </div>
                {i < FLOW_STEPS.length - 1 && (
                  <div style={{ width: 2, flex: 1, minHeight: 16, background: isDone ? C.green : C.border, margin: '4px 0' }} />
                )}
              </div>
              <div style={{ flex: 1, paddingBottom: 14, paddingLeft: 12 }}>
                <div style={{ background: C.surface, border: `1px solid ${isActive ? C.accentBorder : C.border}`, borderRadius: 12, padding: '13px 18px', boxShadow: isActive ? `0 0 0 3px ${C.accentBg}` : '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: isDone ? C.green : isActive ? C.accent : C.inkFaint }}>
                          {step.label}
                        </span>
                        {isActive && (
                          <span style={{ fontSize: 10, background: C.accentBg, color: C.accent, border: `1px solid ${C.accentBorder}`, padding: '1px 8px', borderRadius: 10, fontWeight: 700 }}>進行中</span>
                        )}
                        {isDone && (
                          <span style={{ fontSize: 10, background: C.greenBg, color: C.green, border: `1px solid ${C.greenBorder}`, padding: '1px 8px', borderRadius: 10, fontWeight: 700 }}>完了</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: C.inkFaint }}>{step.detail}</div>
                    </div>
                  </div>
                  {isActive && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button onClick={onDocsClick} style={{ background: C.accent, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                        書類を確認・提出する
                      </button>
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
    </div>
  )
}
