'use client'

import { useState, useEffect, useCallback } from 'react'

const C = {
  bg: '#f5f4f0', surface: '#ffffff', surfaceAlt: '#faf9f6',
  border: '#e5e2da', borderMid: '#d0cdc4',
  ink: '#1a1814', inkMid: '#5a5650', inkFaint: '#9b9890',
  accent: '#c45c1a', accentBg: '#fdf0e8', accentBorder: '#f0c8a4',
  green: '#2d7a47', greenBg: '#edf7f1', greenBorder: '#a8d9b8',
  blue: '#1a5fa8', blueBg: '#eaf2fc', blueBorder: '#a4c8f0',
  red: '#b83232', redBg: '#fdf0f0', redBorder: '#f0b8b8',
  purple: '#6b35a8', purpleBg: '#f3edfb', purpleBorder: '#c9aae8',
  yellow: '#7a5c00', yellowBg: '#fdf8e8', yellowBorder: '#e8d490',
} as const

// ---- 型定義 ----
interface SubsidyRound {
  id: string; year: number; round_name: string
  application_start: string | null; application_end: string | null
  grant_decision_date: string | null; implementation_deadline: string | null
  performance_report_deadline: string | null; is_current: boolean
}

interface ClientApp {
  id: string; client_id: string; subsidy_type: string; subsidy_frame: string | null
  status: string; amount: string | null; deadline: string | null
  score: number | null; tool_name: string | null; tool_category: string | null
  quote_amount: number | null; subsidy_amount: number | null
  gbiz_id_status: string; security_action_done: boolean; miradeji_done: boolean
  application_round: string | null; grant_decision_at: string | null
  notes: string | null; created_at: string
  clients?: { id: string; name: string; email: string; contact_name: string | null; gbiz_id: string | null; corporate_number: string | null; phone: string | null; employee_count: number | null }
  checklist?: ChecklistItem[]
}

interface ChecklistItem {
  id: string; application_id: string; step_key: string; step_label: string
  step_order: number; completed: boolean; completed_at: string | null; note: string | null
}

// ---- 申請枠定義 ----
const SUBSIDY_FRAMES = [
  { key: '通常枠', label: '通常枠', amount: '5万〜450万円', rate: '1/2〜4/5', desc: 'ソフトウェア導入による業務プロセス改善', color: C.blue },
  { key: 'インボイス枠', label: 'インボイス枠', amount: '〜350万円', rate: '2/3〜3/4', desc: '会計・受発注・決済ソフト + ハードウェア', color: C.green },
  { key: 'セキュリティ枠', label: 'セキュリティ対策推進枠', amount: '5万〜150万円', rate: '1/2〜2/3', desc: 'サイバーセキュリティお助け隊登録サービス', color: C.purple },
  { key: '複数社連携枠', label: '複数社連携IT導入枠', amount: '要件により変動', rate: '要件により変動', desc: '複数企業による共同申請', color: C.accent },
] as const

// ---- 申請前チェックリストテンプレート ----
const CHECKLIST_TEMPLATE = [
  { key: 'gbizid', label: 'gBizIDプライム取得（約2週間）', order: 1 },
  { key: 'security_action', label: 'SECURITY ACTION 自己宣言（IPA）', order: 2 },
  { key: 'miradeji', label: 'みらデジ経営チェック完了', order: 3 },
  { key: 'tool_select', label: 'ITツール選定・見積作成', order: 4 },
  { key: 'business_plan', label: '事業計画・KPI策定', order: 5 },
  { key: 'docs_corporate', label: '履歴事項全部証明書（3ヶ月以内）', order: 6 },
  { key: 'docs_tax', label: '納税証明書（直近年度）', order: 7 },
  { key: 'mypage_invite', label: '申請マイページ招待送信', order: 8 },
  { key: 'applicant_input', label: '申請者情報入力完了', order: 9 },
  { key: 'vendor_input', label: 'ベンダー側情報入力完了', order: 10 },
  { key: 'sworn_submit', label: '宣誓・申請提出', order: 11 },
]

// ---- ヘルパー ----
function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
}

function daysUntil(d: string | null) {
  if (!d) return null
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
}

function statusColor(status: string) {
  switch (status) {
    case '適格審査中': return { bg: C.yellowBg, fg: C.yellow, border: C.yellowBorder }
    case '書類準備中': return { bg: C.blueBg, fg: C.blue, border: C.blueBorder }
    case '申請中': return { bg: C.purpleBg, fg: C.purple, border: C.purpleBorder }
    case '採択待ち': return { bg: C.accentBg, fg: C.accent, border: C.accentBorder }
    case '採択済': return { bg: C.greenBg, fg: C.green, border: C.greenBorder }
    case '不採択': return { bg: C.redBg, fg: C.red, border: C.redBorder }
    default: return { bg: C.bg, fg: C.inkMid, border: C.border }
  }
}

// ---- Sales Deal 型 ----
interface SalesDeal {
  id: string; facility_name: string; stage: string
  expected_mrr: number | null; initial_fee: number | null
  room_count: number | null; notes: string | null
  company_name: string; already_synced: boolean
}

// ==== メインコンポーネント ====
export default function SubsidyLookupClient() {
  const [tab, setTab] = useState<'overview' | 'clients' | 'flow'>('overview')
  const [rounds, setRounds] = useState<SubsidyRound[]>([])
  const [apps, setApps] = useState<ClientApp[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedApp, setSelectedApp] = useState<ClientApp | null>(null)
  const [showRegister, setShowRegister] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [roundsRes, appsRes] = await Promise.all([
        fetch('/api/subsidy-rounds'),
        fetch('/api/subsidy-apps'),
      ])
      if (roundsRes.ok) setRounds(await roundsRes.json())
      if (appsRes.ok) setApps(await appsRes.json())
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const currentRound = rounds.find(r => r.is_current)
  const daysLeft = currentRound ? daysUntil(currentRound.application_end) : null

  return (
    <div style={{ maxWidth: 1060 }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>デジタル化・AI導入補助金 2026</h2>
          <span style={{ background: C.greenBg, color: C.green, fontSize: 10, padding: '3px 10px', borderRadius: 8, border: `1px solid ${C.greenBorder}`, fontWeight: 700 }}>IT導入支援事業者: AZOO</span>
        </div>
        <p style={{ margin: 0, color: C.inkFaint, fontSize: 13 }}>ホテル顧客のIT導入補助金申請をベンダーとして管理</p>
      </div>

      {/* ステータスバー */}
      {currentRound && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: C.inkFaint, marginBottom: 4 }}>現在の公募回</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.accent }}>{currentRound.round_name}</div>
          </div>
          <div style={{ background: daysLeft !== null && daysLeft <= 14 ? C.redBg : C.surface, border: `1px solid ${daysLeft !== null && daysLeft <= 14 ? C.redBorder : C.border}`, borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: C.inkFaint, marginBottom: 4 }}>申請締切</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: daysLeft !== null && daysLeft <= 14 ? C.red : C.ink }}>
              {fmtDate(currentRound.application_end)}
              {daysLeft !== null && <span style={{ fontSize: 11, fontWeight: 600, marginLeft: 6 }}>（残{daysLeft}日）</span>}
            </div>
          </div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: C.inkFaint, marginBottom: 4 }}>申請中の顧客</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.blue }}>{apps.filter(a => !['採択済', '不採択'].includes(a.status)).length}件</div>
          </div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: C.inkFaint, marginBottom: 4 }}>採択済</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.green }}>{apps.filter(a => a.status === '採択済').length}件</div>
          </div>
        </div>
      )}

      {/* タブ */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: C.bg, borderRadius: 10, padding: 4, width: 'fit-content', border: `1px solid ${C.border}` }}>
        {([
          { id: 'overview' as const, label: '📋 公募要領・スケジュール' },
          { id: 'clients' as const, label: `🏨 顧客別申請管理（${apps.length}）` },
          { id: 'flow' as const, label: '📖 申請フローガイド' },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ background: tab === t.id ? C.surface : 'transparent', color: tab === t.id ? C.ink : C.inkMid, border: tab === t.id ? `1px solid ${C.border}` : '1px solid transparent', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: tab === t.id ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', boxShadow: tab === t.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: C.inkFaint }}>読み込み中...</div>}

      {/* ===== 公募要領・スケジュールタブ ===== */}
      {!loading && tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 申請枠一覧 */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', background: C.surfaceAlt, borderBottom: `1px solid ${C.border}`, fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
              申請枠一覧
              <a href="https://it-shien.smrj.go.jp/applicant/subsidy/" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: C.blue, textDecoration: 'none', marginLeft: 'auto', background: C.blueBg, padding: '3px 10px', borderRadius: 6, border: `1px solid ${C.blueBorder}` }}>公式サイト ↗</a>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, padding: 16 }}>
              {SUBSIDY_FRAMES.map(f => (
                <div key={f.key} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px', borderLeft: `4px solid ${f.color}` }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.ink, marginBottom: 6 }}>{f.label}</div>
                  <div style={{ fontSize: 12, color: C.inkMid, marginBottom: 10, lineHeight: 1.5 }}>{f.desc}</div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ background: C.bg, borderRadius: 6, padding: '4px 10px', fontSize: 11 }}>
                      <span style={{ color: C.inkFaint }}>補助額 </span><span style={{ fontWeight: 700, color: f.color }}>{f.amount}</span>
                    </div>
                    <div style={{ background: C.bg, borderRadius: 6, padding: '4px 10px', fontSize: 11 }}>
                      <span style={{ color: C.inkFaint }}>補助率 </span><span style={{ fontWeight: 700, color: f.color }}>{f.rate}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* スケジュール */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', background: C.surfaceAlt, borderBottom: `1px solid ${C.border}`, fontSize: 14, fontWeight: 800 }}>
              2026年度 公募スケジュール
            </div>
            <div style={{ padding: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                    {['公募回', '受付開始', '締切', '交付決定', ''].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, color: C.inkFaint, fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rounds.map(r => (
                    <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}`, background: r.is_current ? C.accentBg : 'transparent' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 700 }}>
                        {r.round_name}
                        {r.is_current && <span style={{ background: C.accent, color: '#fff', fontSize: 9, padding: '2px 6px', borderRadius: 4, marginLeft: 8, fontWeight: 700 }}>NOW</span>}
                      </td>
                      <td style={{ padding: '10px 12px' }}>{fmtDate(r.application_start)}</td>
                      <td style={{ padding: '10px 12px', fontWeight: r.is_current ? 700 : 400, color: r.is_current ? C.red : C.ink }}>{fmtDate(r.application_end)}</td>
                      <td style={{ padding: '10px 12px' }}>{fmtDate(r.grant_decision_date)}</td>
                      <td style={{ padding: '10px 12px' }}>
                        {r.is_current && daysLeft !== null && (
                          <span style={{ background: daysLeft <= 14 ? C.red : C.accent, color: '#fff', fontSize: 10, padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>残{daysLeft}日</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* AZOO as ベンダー */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', background: C.surfaceAlt, borderBottom: `1px solid ${C.border}`, fontSize: 14, fontWeight: 800 }}>
              AZOOの登録ツール
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ border: `1px solid ${C.greenBorder}`, background: C.greenBg, borderRadius: 10, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 48, height: 48, background: C.green, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#fff', fontWeight: 900 }}>W</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: C.ink }}>WASIMIL</div>
                  <div style={{ fontSize: 12, color: C.inkMid, marginTop: 2 }}>宿泊業向けPMS・DXプラットフォーム — 通常枠対応</div>
                  <div style={{ fontSize: 11, color: C.green, fontWeight: 600, marginTop: 4 }}>IT導入支援事業者登録済み（AZOO株式会社）</div>
                </div>
              </div>
            </div>
          </div>

          {/* 必要書類 */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', background: C.surfaceAlt, borderBottom: `1px solid ${C.border}`, fontSize: 14, fontWeight: 800 }}>
              顧客に必要な書類（法人の場合）
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { doc: '履歴事項全部証明書', note: '発行から3ヶ月以内', icon: '📄' },
                { doc: '法人税の納税証明書（その1 or その2）', note: '直近事業年度分', icon: '📄' },
                { doc: 'gBizIDプライムアカウント', note: '取得に約2週間', icon: '🔑' },
                { doc: '事業計画書（KPI含む）', note: 'ベンダーと共同作成', icon: '📊' },
                { doc: '見積書', note: 'AZOOが発行', icon: '💴' },
              ].map(d => (
                <div key={d.doc} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: C.bg, borderRadius: 8, border: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 16 }}>{d.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{d.doc}</div>
                    <div style={{ fontSize: 11, color: C.inkFaint }}>{d.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== 顧客別申請管理タブ ===== */}
      {!loading && tab === 'clients' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* 登録ボタン */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowRegister(true)} style={{ background: C.accent, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
              ＋ 顧客を登録
            </button>
          </div>

          {apps.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, background: C.surface, borderRadius: 14, border: `1px dashed ${C.borderMid}`, color: C.inkFaint }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🏨</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.inkMid, marginBottom: 6 }}>申請中の顧客がありません</div>
              <div style={{ fontSize: 12 }}>上の「顧客を登録」ボタンから新規登録、またはSales Pipelineから同期できます</div>
            </div>
          ) : apps.map(app => {
            const sc = statusColor(app.status)
            const checklist = app.checklist ?? []
            const done = checklist.filter(c => c.completed).length
            const total = checklist.length || CHECKLIST_TEMPLATE.length
            const progress = total > 0 ? Math.round((done / total) * 100) : 0
            return (
              <button key={app.id} onClick={() => setSelectedApp(app)} style={{ width: '100%', textAlign: 'left', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 20px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: C.ink }}>{app.clients?.name ?? '—'}</span>
                      <span style={{ background: sc.bg, color: sc.fg, fontSize: 10, padding: '2px 10px', borderRadius: 8, border: `1px solid ${sc.border}`, fontWeight: 700 }}>{app.status}</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.inkMid }}>
                      {app.subsidy_frame ?? '通常枠'} / {app.tool_name ?? 'WASIMIL'}
                      {app.application_round && <span style={{ marginLeft: 8, color: C.inkFaint }}>({app.application_round})</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {app.quote_amount && <div style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>見積 ¥{app.quote_amount.toLocaleString()}</div>}
                    {app.subsidy_amount && <div style={{ fontSize: 11, color: C.green }}>補助額 ¥{app.subsidy_amount.toLocaleString()}</div>}
                  </div>
                </div>
                {/* 準備状況 */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                  <PrepBadge label="gBizID" done={app.gbiz_id_status === '取得済'} partial={app.gbiz_id_status === '申請中'} />
                  <PrepBadge label="SECURITY ACTION" done={app.security_action_done} />
                  <PrepBadge label="みらデジ" done={app.miradeji_done} />
                </div>
                {/* プログレスバー */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, height: 6, background: C.bg, borderRadius: 3, overflow: 'hidden', border: `1px solid ${C.border}` }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: progress === 100 ? C.green : C.accent, borderRadius: 3, transition: 'width 0.3s' }} />
                  </div>
                  <span style={{ fontSize: 11, color: C.inkFaint, fontWeight: 600, whiteSpace: 'nowrap' as const }}>{done}/{total} 完了</span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* ===== 申請フローガイドタブ ===== */}
      {!loading && tab === 'flow' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { step: 1, title: '事前準備（顧客側）', who: '顧客', items: ['gBizIDプライムアカウント取得（約2週間かかるため早めに案内）', 'SECURITY ACTION 自己宣言（IPAサイトで実施）', 'みらデジ経営チェック完了'], color: C.blue },
            { step: 2, title: 'ツール選定・見積', who: 'AZOO', items: ['WASIMILの導入範囲を顧客と協議', '見積書作成（対象経費を明確に区分）', '導入スケジュール策定'], color: C.accent },
            { step: 3, title: '申請書作成', who: '共同作業', items: ['申請マイページの招待を顧客に送信', '顧客: 企業情報・代表者情報を入力', 'AZOO: ITツール情報・事業計画KPIを入力', '事業計画の数値目標（労働生産性向上率等）を設定'], color: C.purple },
            { step: 4, title: '申請提出', who: '顧客', items: ['入力内容の最終確認', '宣誓チェック（虚偽申請でないことの誓約）', '電子申請で提出'], color: C.green },
            { step: 5, title: '交付決定〜導入', who: 'AZOO', items: ['交付決定通知の確認', '※交付決定後に契約・発注（決定前の発注は対象外！）', 'WASIMIL導入・初期設定・スタッフ研修', '導入完了の証跡（スクリーンショット等）を保存'], color: C.accent },
            { step: 6, title: '実績報告・補助金受領', who: '共同作業', items: ['契約書・発注書・納品書の収集', '支払い証憑（銀行振込明細等）の準備', '事業実績報告書を提出', '補助金交付・入金確認'], color: C.blue },
            { step: 7, title: '効果報告（1〜3年間）', who: '共同作業', items: ['毎年の事業実施効果報告を提出', '労働生産性の向上度合いを数値で報告', '事業計画KPIの達成状況を報告'], color: C.green },
          ].map(s => (
            <div key={s.step} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden', borderLeft: `4px solid ${s.color}` }}>
              <div style={{ padding: '14px 20px', background: C.surfaceAlt, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 28, height: 28, background: s.color, color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>{s.step}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>{s.title}</span>
                <span style={{ fontSize: 10, background: s.color + '18', color: s.color, padding: '2px 10px', borderRadius: 8, fontWeight: 700, marginLeft: 'auto' }}>{s.who}</span>
              </div>
              <ul style={{ margin: 0, padding: '14px 20px 14px 44px', listStyle: 'disc' }}>
                {s.items.map((item, i) => (
                  <li key={i} style={{ fontSize: 13, color: item.startsWith('※') ? C.red : C.inkMid, lineHeight: 1.8, fontWeight: item.startsWith('※') ? 700 : 400 }}>{item}</li>
                ))}
              </ul>
            </div>
          ))}

          {/* 重要な注意事項 */}
          <div style={{ background: C.redBg, border: `1px solid ${C.redBorder}`, borderRadius: 14, padding: '16px 20px' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.red, marginBottom: 8 }}>重要な注意事項</div>
            <ul style={{ margin: 0, padding: '0 0 0 20px', fontSize: 13, color: C.red, lineHeight: 1.8 }}>
              <li><strong>交付決定前の発注・契約は補助対象外</strong>になります</li>
              <li>申請者本人が宣誓・提出する必要があります（ベンダーが代行不可）</li>
              <li>補助金受領後もKPI未達の場合、返還を求められる可能性があります</li>
              <li>虚偽申請は刑事罰の対象となります</li>
            </ul>
          </div>
        </div>
      )}

      {/* ===== 顧客詳細モーダル ===== */}
      {selectedApp && (
        <ClientDetailModal
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
          onUpdate={() => { loadData(); setSelectedApp(null) }}
        />
      )}

      {/* ===== 顧客登録モーダル ===== */}
      {showRegister && (
        <RegisterClientModal
          onClose={() => setShowRegister(false)}
          onRegistered={() => { setShowRegister(false); loadData(); setTab('clients') }}
        />
      )}
    </div>
  )
}

// ---- サブコンポーネント ----
function PrepBadge({ label, done, partial }: { label: string; done: boolean; partial?: boolean }) {
  const bg = done ? C.greenBg : partial ? C.yellowBg : C.bg
  const fg = done ? C.green : partial ? C.yellow : C.inkFaint
  const bd = done ? C.greenBorder : partial ? C.yellowBorder : C.border
  const icon = done ? '✓' : partial ? '◐' : '○'
  return (
    <span style={{ background: bg, color: fg, fontSize: 11, padding: '3px 10px', borderRadius: 6, border: `1px solid ${bd}`, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: 10 }}>{icon}</span>{label}
    </span>
  )
}

function ClientDetailModal({ app, onClose, onUpdate }: { app: ClientApp; onClose: () => void; onUpdate: () => void }) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>(app.checklist ?? [])
  const [saving, setSaving] = useState(false)
  const sc = statusColor(app.status)

  // チェックリストがない場合は初期化
  useEffect(() => {
    if (checklist.length === 0) {
      initChecklist()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function initChecklist() {
    const res = await fetch('/api/subsidy-checklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId: app.id, items: CHECKLIST_TEMPLATE }),
    })
    if (res.ok) {
      const data = await res.json()
      setChecklist(data)
    }
  }

  async function toggleItem(itemId: string, completed: boolean) {
    setSaving(true)
    await fetch('/api/subsidy-checklist', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: itemId, completed }),
    })
    setChecklist(prev => prev.map(c => c.id === itemId ? { ...c, completed, completed_at: completed ? new Date().toISOString() : null } : c))
    setSaving(false)
  }

  const done = checklist.filter(c => c.completed).length

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: 16, width: '100%', maxWidth: 680, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        {/* ヘッダー */}
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'sticky', top: 0, background: C.surface, zIndex: 1 }}>
          <div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 18, fontWeight: 800 }}>{app.clients?.name}</span>
              <span style={{ background: sc.bg, color: sc.fg, fontSize: 11, padding: '2px 10px', borderRadius: 8, border: `1px solid ${sc.border}`, fontWeight: 700 }}>{app.status}</span>
            </div>
            <div style={{ fontSize: 12, color: C.inkMid }}>{app.subsidy_frame ?? '通常枠'} / {app.tool_name ?? 'WASIMIL'}</div>
          </div>
          <button onClick={onClose} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: C.inkMid, flexShrink: 0 }}>✕</button>
        </div>

        <div style={{ padding: 24 }}>
          {/* 顧客情報 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
            {[
              { label: '担当者', value: app.clients?.contact_name },
              { label: 'メール', value: app.clients?.email },
              { label: '電話', value: app.clients?.phone },
              { label: 'gBizID', value: app.clients?.gbiz_id ?? '未登録' },
              { label: '法人番号', value: app.clients?.corporate_number ?? '未登録' },
              { label: '従業員数', value: app.clients?.employee_count ? `${app.clients.employee_count}名` : '—' },
            ].map(f => (
              <div key={f.label} style={{ background: C.bg, borderRadius: 8, padding: '8px 12px', border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 10, color: C.inkFaint, marginBottom: 2 }}>{f.label}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>{f.value ?? '—'}</div>
              </div>
            ))}
          </div>

          {/* 金額情報 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
            <div style={{ background: C.accentBg, border: `1px solid ${C.accentBorder}`, borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ fontSize: 10, color: C.inkFaint, marginBottom: 4 }}>見積金額</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.accent }}>{app.quote_amount ? `¥${app.quote_amount.toLocaleString()}` : '未設定'}</div>
            </div>
            <div style={{ background: C.greenBg, border: `1px solid ${C.greenBorder}`, borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ fontSize: 10, color: C.inkFaint, marginBottom: 4 }}>補助金額</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.green }}>{app.subsidy_amount ? `¥${app.subsidy_amount.toLocaleString()}` : '未確定'}</div>
            </div>
          </div>

          {/* 事前準備 */}
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8 }}>事前準備</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <PrepBadge label="gBizID" done={app.gbiz_id_status === '取得済'} partial={app.gbiz_id_status === '申請中'} />
            <PrepBadge label="SECURITY ACTION" done={app.security_action_done} />
            <PrepBadge label="みらデジ" done={app.miradeji_done} />
          </div>

          {/* チェックリスト */}
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>申請チェックリスト</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: done === checklist.length && checklist.length > 0 ? C.green : C.inkFaint }}>{done}/{checklist.length} 完了</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {checklist.sort((a, b) => a.step_order - b.step_order).map(item => (
              <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: item.completed ? C.greenBg : C.bg, borderRadius: 8, border: `1px solid ${item.completed ? C.greenBorder : C.border}`, cursor: 'pointer', transition: 'all 0.15s' }}>
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={e => toggleItem(item.id, e.target.checked)}
                  disabled={saving}
                  style={{ width: 16, height: 16, accentColor: C.green, cursor: 'pointer' }}
                />
                <span style={{ fontSize: 13, color: item.completed ? C.green : C.ink, textDecoration: item.completed ? 'line-through' : 'none', fontWeight: item.completed ? 400 : 500 }}>
                  {item.step_label}
                </span>
                {item.completed_at && (
                  <span style={{ fontSize: 10, color: C.inkFaint, marginLeft: 'auto' }}>{fmtDate(item.completed_at)}</span>
                )}
              </label>
            ))}
          </div>

          {app.notes && (
            <div style={{ marginTop: 16, background: C.yellowBg, border: `1px solid ${C.yellowBorder}`, borderRadius: 8, padding: '10px 14px', fontSize: 12, color: C.yellow }}>
              <strong>メモ:</strong> {app.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---- 顧客登録モーダル ----
function RegisterClientModal({ onClose, onRegistered }: { onClose: () => void; onRegistered: () => void }) {
  const [mode, setMode] = useState<'manual' | 'sales'>('sales')
  const [saving, setSaving] = useState(false)

  // 手動登録フォーム
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [contactName, setContactName] = useState('')
  const [facilityName, setFacilityName] = useState('')
  const [roomCount, setRoomCount] = useState('')
  const [phone, setPhone] = useState('')

  // Sales 同期
  const [deals, setDeals] = useState<SalesDeal[]>([])
  const [dealsLoading, setDealsLoading] = useState(false)
  const [dealsError, setDealsError] = useState<string | null>(null)
  const [syncingId, setSyncingId] = useState<string | null>(null)

  useEffect(() => {
    if (mode === 'sales') loadDeals()
  }, [mode])

  async function loadDeals() {
    setDealsLoading(true)
    setDealsError(null)
    try {
      const res = await fetch('/api/subsidy-clients?mode=sales-deals')
      if (!res.ok) {
        const json = await res.json()
        setDealsError(json.error ?? 'エラー')
        return
      }
      setDeals(await res.json())
    } catch { setDealsError('通信エラー') }
    finally { setDealsLoading(false) }
  }

  async function handleManualSubmit() {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/subsidy-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, contactName, facilityName, roomCount: roomCount ? parseInt(roomCount) : null, phone }),
      })
      if (res.ok) onRegistered()
    } finally { setSaving(false) }
  }

  async function handleSyncDeal(dealId: string) {
    setSyncingId(dealId)
    try {
      const res = await fetch('/api/subsidy-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'sync-from-sales', dealId }),
      })
      if (res.ok) {
        onRegistered()
      } else {
        const json = await res.json()
        alert(json.error ?? 'エラー')
      }
    } finally { setSyncingId(null) }
  }

  const inputStyle = { background: C.bg, border: `1px solid ${C.borderMid}`, borderRadius: 8, padding: '9px 14px', color: C.ink, fontSize: 13, fontFamily: 'inherit', outline: 'none', width: '100%' } as const

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: 16, width: '100%', maxWidth: 640, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        {/* ヘッダー */}
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: C.surface, zIndex: 1 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>顧客を登録</h3>
          <button onClick={onClose} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: C.inkMid, flexShrink: 0 }}>✕</button>
        </div>

        <div style={{ padding: 24 }}>
          {/* モード切替 */}
          <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: C.bg, borderRadius: 10, padding: 4, border: `1px solid ${C.border}` }}>
            {([
              { id: 'sales' as const, label: '🔄 Sales Pipelineから同期' },
              { id: 'manual' as const, label: '✏️ 手動登録' },
            ]).map(t => (
              <button key={t.id} onClick={() => setMode(t.id)} style={{ flex: 1, background: mode === t.id ? C.surface : 'transparent', color: mode === t.id ? C.ink : C.inkMid, border: mode === t.id ? `1px solid ${C.border}` : '1px solid transparent', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontWeight: mode === t.id ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', boxShadow: mode === t.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Sales 同期モード */}
          {mode === 'sales' && (
            <div>
              <div style={{ fontSize: 12, color: C.inkMid, marginBottom: 12, lineHeight: 1.6 }}>
                Sales Pipelineの案件（SQL確度A/B・成約）から選択して、補助金申請管理に同期します。
              </div>

              {dealsLoading && <div style={{ textAlign: 'center', padding: 24, color: C.inkFaint, fontSize: 13 }}>Sales Pipeline を読み込み中...</div>}

              {dealsError && (
                <div style={{ background: C.yellowBg, border: `1px solid ${C.yellowBorder}`, borderRadius: 10, padding: '12px 16px', fontSize: 12, color: C.yellow, marginBottom: 12 }}>
                  ⚠️ {dealsError}
                  <div style={{ fontSize: 11, marginTop: 4, color: C.inkFaint }}>Vercel環境変数に SALES_SUPABASE_URL と SALES_SUPABASE_SERVICE_KEY を設定してください</div>
                </div>
              )}

              {!dealsLoading && !dealsError && deals.length === 0 && (
                <div style={{ textAlign: 'center', padding: 24, color: C.inkFaint, fontSize: 13 }}>同期可能な案件がありません</div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {deals.map(deal => (
                  <div key={deal.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: deal.already_synced ? C.greenBg : C.bg, borderRadius: 10, border: `1px solid ${deal.already_synced ? C.greenBorder : C.border}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{deal.facility_name || deal.company_name || '未設定'}</span>
                        <span style={{ fontSize: 10, padding: '1px 8px', borderRadius: 6, background: deal.stage === '成約' ? C.greenBg : C.blueBg, color: deal.stage === '成約' ? C.green : C.blue, border: `1px solid ${deal.stage === '成約' ? C.greenBorder : C.blueBorder}` }}>{deal.stage}</span>
                      </div>
                      <div style={{ fontSize: 11, color: C.inkFaint, display: 'flex', gap: 10 }}>
                        {deal.company_name && <span>{deal.company_name}</span>}
                        {deal.room_count && <span>{deal.room_count}室</span>}
                        {deal.expected_mrr && <span>MRR ¥{Number(deal.expected_mrr).toLocaleString()}</span>}
                      </div>
                    </div>
                    {deal.already_synced ? (
                      <span style={{ fontSize: 11, color: C.green, fontWeight: 700, whiteSpace: 'nowrap' as const }}>✓ 同期済</span>
                    ) : (
                      <button
                        onClick={() => handleSyncDeal(deal.id)}
                        disabled={syncingId === deal.id}
                        style={{ background: C.accent, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: syncingId === deal.id ? 'not-allowed' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' as const, opacity: syncingId === deal.id ? 0.6 : 1 }}
                      >
                        {syncingId === deal.id ? '同期中...' : '→ 同期'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 手動登録モード */}
          {mode === 'manual' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: C.inkFaint, fontWeight: 600, marginBottom: 4, display: 'block' }}>施設名・会社名 *</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="例: 箱根温泉 紫雲荘" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: C.inkFaint, fontWeight: 600, marginBottom: 4, display: 'block' }}>施設名（別名）</label>
                  <input value={facilityName} onChange={e => setFacilityName(e.target.value)} placeholder="例: 紫雲荘 本館" style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: C.inkFaint, fontWeight: 600, marginBottom: 4, display: 'block' }}>担当者名</label>
                  <input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="例: 山田太郎" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: C.inkFaint, fontWeight: 600, marginBottom: 4, display: 'block' }}>メールアドレス</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="例: info@example.com" style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: C.inkFaint, fontWeight: 600, marginBottom: 4, display: 'block' }}>電話番号</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="例: 03-1234-5678" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: C.inkFaint, fontWeight: 600, marginBottom: 4, display: 'block' }}>客室数</label>
                  <input type="number" value={roomCount} onChange={e => setRoomCount(e.target.value)} placeholder="例: 25" style={inputStyle} />
                </div>
              </div>
              <button
                onClick={handleManualSubmit}
                disabled={!name.trim() || saving}
                style={{ marginTop: 8, background: name.trim() && !saving ? C.accent : C.border, color: name.trim() && !saving ? '#fff' : C.inkFaint, border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: name.trim() && !saving ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
              >
                {saving ? '登録中...' : '登録して申請管理を開始'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
