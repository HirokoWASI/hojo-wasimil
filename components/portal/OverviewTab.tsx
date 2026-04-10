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
  red: '#b83232',
  redBg: '#fdf0f0',
  redBorder: '#f0b8b8',
} as const

interface Props {
  application: Application
  onChatClick: () => void
}

export function OverviewTab({ application, onChatClick }: Props) {
  const daysLeft = application.deadline
    ? Math.ceil((new Date(application.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {daysLeft != null && daysLeft < 14 && (
        <div style={{ background: C.redBg, border: `1px solid ${C.redBorder}`, borderRadius: 12, padding: '14px 20px', display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.red }}>
            申請期限まで残り{daysLeft}日です。書類の準備を急いでください。
          </div>
        </div>
      )}

      {/* 補助金カード */}
      <div style={{ background: C.surface, borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: `1px solid ${C.border}` }}>
        <div style={{ background: 'linear-gradient(135deg, #c45c1a, #e8772a)', padding: '24px 28px', color: '#fff' }}>
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>中小企業庁</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{application.subsidy_type}</div>
          {application.subsidy_frame && (
            <div style={{ fontSize: 14, opacity: 0.9 }}>{application.subsidy_frame}</div>
          )}
        </div>
        <div style={{ padding: '20px 28px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {[
            ['最大補助額', application.amount ?? '—', C.accent],
            ['補助率', (application.ai_result as any)?.subsidyRate ?? '—', C.blue],
            ['申請期限', application.deadline ? `${new Date(application.deadline).toLocaleDateString('ja-JP')}${daysLeft != null ? `（残${daysLeft}日）` : ''}` : '—', daysLeft != null && daysLeft < 14 ? C.red : C.ink],
          ].map(([label, value, color]) => (
            <div key={label as string}>
              <div style={{ fontSize: 11, color: C.inkFaint, textTransform: 'uppercase' as const, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: color as string }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 担当者カード */}
      {application.cs_name && (
        <div style={{ background: C.blueBg, border: `1px solid ${C.blueBorder}`, borderRadius: 12, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, color: C.inkFaint, marginBottom: 4 }}>補助金申請サポート担当</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.blue }}>
              {application.cs_name}{application.cs_email ? `（${application.cs_email}）` : ''}
            </div>
          </div>
          <button
            onClick={onChatClick}
            style={{ background: C.blue, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            💬 チャットで質問する
          </button>
        </div>
      )}
    </div>
  )
}
