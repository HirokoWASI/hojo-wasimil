import type { Application } from '@/types/database'

const C = {
  surface: '#ffffff', surfaceAlt: '#faf9f6',
  border: '#e5e2da', bg: '#f5f4f0',
  ink: '#1a1814', inkMid: '#5a5650', inkFaint: '#9b9890',
  accent: '#c45c1a', accentBg: '#fdf0e8', accentBorder: '#f0c8a4',
  green: '#2d7a47', greenBg: '#edf7f1', greenBorder: '#a8d9b8',
  blue: '#1a5fa8', blueBg: '#eaf2fc', blueBorder: '#a4c8f0',
  red: '#b83232', redBg: '#fdf0f0', redBorder: '#f0b8b8',
} as const

interface SubsidyInfo {
  name: string; organizer: string | null; summary: string | null
  subsidy_amount: string | null; subsidy_rate: string | null; application_end: string | null
  target_business: string | null; requirements: string[]; eligible_expenses: string[]
}

interface Props {
  application: Application
  onChatClick: () => void
  subsidyInfo: SubsidyInfo | null
}

export function OverviewTab({ application, onChatClick, subsidyInfo }: Props) {
  const daysLeft = application.deadline
    ? Math.ceil((new Date(application.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null

  const amount = subsidyInfo?.subsidy_amount ?? application.amount ?? '—'
  const rate = subsidyInfo?.subsidy_rate ?? (application.ai_result as any)?.subsidyRate ?? '—'
  const organizer = subsidyInfo?.organizer ?? '中小企業庁'

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
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>{organizer}</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{subsidyInfo?.name ?? application.subsidy_type}</div>
          {application.subsidy_frame && (
            <div style={{ fontSize: 14, opacity: 0.9 }}>{application.subsidy_frame}</div>
          )}
        </div>
        <div style={{ padding: '20px 28px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {[
            ['最大補助額', amount, C.accent],
            ['補助率', rate, C.blue],
            ['申請期限', application.deadline ? `${new Date(application.deadline).toLocaleDateString('ja-JP')}${daysLeft != null ? `（残${daysLeft}日）` : ''}` : (subsidyInfo?.application_end ?? '—'), daysLeft != null && daysLeft < 14 ? C.red : C.ink],
          ].map(([label, value, color]) => (
            <div key={label as string}>
              <div style={{ fontSize: 11, color: C.inkFaint, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: color as string }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 補助金概要 */}
      {subsidyInfo?.summary && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 24px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>補助金の概要</div>
          <div style={{ fontSize: 13, color: C.inkMid, lineHeight: 1.7 }}>{subsidyInfo.summary}</div>
        </div>
      )}

      {/* 対象経費・要件 */}
      {subsidyInfo && (subsidyInfo.eligible_expenses?.length > 0 || subsidyInfo.requirements?.length > 0 || subsidyInfo.target_business) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {subsidyInfo.target_business && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 18px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, marginBottom: 6 }}>対象事業者</div>
              <div style={{ fontSize: 12, color: C.inkMid, lineHeight: 1.6 }}>{subsidyInfo.target_business}</div>
            </div>
          )}
          {subsidyInfo.eligible_expenses?.length > 0 && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 18px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, marginBottom: 6 }}>対象経費</div>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
                {subsidyInfo.eligible_expenses.map((e, i) => (
                  <span key={i} style={{ background: C.greenBg, color: C.green, fontSize: 11, padding: '2px 8px', borderRadius: 6, border: `1px solid ${C.greenBorder}` }}>{e}</span>
                ))}
              </div>
            </div>
          )}
          {subsidyInfo.requirements?.length > 0 && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 18px', gridColumn: subsidyInfo.target_business && subsidyInfo.eligible_expenses?.length > 0 ? '1 / -1' : undefined }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, marginBottom: 6 }}>申請要件</div>
              <ul style={{ margin: 0, padding: '0 0 0 16px' }}>
                {subsidyInfo.requirements.map((r, i) => (
                  <li key={i} style={{ fontSize: 12, color: C.inkMid, lineHeight: 1.7 }}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

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
