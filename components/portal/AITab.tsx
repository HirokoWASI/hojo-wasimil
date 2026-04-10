import type { ScreeningLog } from '@/types/database'

const C = {
  surface: '#ffffff',
  border: '#e5e2da',
  ink: '#1a1814',
  inkMid: '#5a5650',
  inkFaint: '#9b9890',
  accent: '#c45c1a',
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

interface Props {
  screeningLog: ScreeningLog | null
  onChatClick: () => void
}

export function AITab({ screeningLog, onChatClick }: Props) {
  const ai = screeningLog?.result as any | null

  if (!ai) {
    return (
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '40px 32px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🤖</div>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>AI診断がまだ実施されていません</div>
        <div style={{ fontSize: 13, color: C.inkFaint, lineHeight: 1.7 }}>
          担当者がAI適格性診断を実施すると、ここに結果が表示されます。
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* スコアカード */}
      <div style={{ background: C.surface, borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: `1px solid ${C.border}` }}>
        <div style={{ padding: '24px 28px', background: C.greenBg, borderBottom: `1px solid ${C.greenBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, color: C.inkFaint, marginBottom: 6 }}>AI適格性スコア</div>
            <div style={{ fontSize: 52, fontWeight: 900, color: C.green, fontFamily: 'monospace', lineHeight: 1 }}>
              {ai.score}<span style={{ fontSize: 20 }}>/100</span>
            </div>
            <div style={{ marginTop: 10, height: 8, background: C.border, borderRadius: 4, overflow: 'hidden', width: 200 }}>
              <div style={{ width: `${ai.score}%`, height: '100%', background: C.green, borderRadius: 4 }} />
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 32, marginBottom: 6 }}>{ai.eligible ? '✅' : '⚠️'}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: ai.eligible ? C.green : C.yellow }}>
              {ai.eligible ? '申請推奨' : '要確認'}
            </div>
            {ai.recommendedAmount && (
              <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 4 }}>推奨補助金額: {ai.recommendedAmount}</div>
            )}
          </div>
        </div>

        {/* 理由リスト */}
        <div style={{ padding: '20px 28px' }}>
          {(ai.reasons ?? []).map((r: string, i: number) => (
            <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13, color: C.inkMid, padding: '8px 0', borderBottom: i < (ai.reasons?.length ?? 0) - 1 ? `1px solid ${C.border}` : 'none' }}>
              <span style={{ color: C.green, fontWeight: 700, flexShrink: 0 }}>✓</span>{r}
            </div>
          ))}
        </div>
      </div>

      {/* リスク */}
      {(ai.risks ?? []).length > 0 && (
        <div style={{ background: C.yellowBg, border: `1px solid ${C.yellowBorder}`, borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.yellow, marginBottom: 10 }}>⚠ 注意が必要な点</div>
          {(ai.risks ?? []).map((r: string, i: number) => (
            <div key={i} style={{ fontSize: 13, color: C.inkMid }}>{r}</div>
          ))}
        </div>
      )}

      {/* 次のアクション */}
      {ai.nextAction && (
        <div style={{ background: C.greenBg, border: `1px solid ${C.greenBorder}`, borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.green, marginBottom: 6 }}>🚀 次のステップ</div>
          <div style={{ fontSize: 13, color: C.ink, marginBottom: 12 }}>{ai.nextAction}</div>
          <button
            onClick={onChatClick}
            style={{ background: C.green, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            💬 担当者に相談する
          </button>
        </div>
      )}

      {/* 補助金情報 */}
      {(ai.maxAmount || ai.subsidyRate || ai.frame) && (
        <div style={{ display: 'grid', gridTemplateColumns: ai.maxAmount && ai.subsidyRate ? '1fr 1fr' : '1fr', gap: 12 }}>
          {ai.maxAmount && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 20px' }}>
              <div style={{ fontSize: 10, color: C.inkFaint, marginBottom: 4 }}>最大補助額</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.accent }}>{ai.maxAmount}</div>
            </div>
          )}
          {ai.subsidyRate && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 20px' }}>
              <div style={{ fontSize: 10, color: C.inkFaint, marginBottom: 4 }}>補助率</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.blue }}>{ai.subsidyRate}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
