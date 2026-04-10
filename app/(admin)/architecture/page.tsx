const C = {
  surface: '#ffffff',
  surfaceAlt: '#faf9f6',
  bg: '#f5f4f0',
  border: '#e5e2da',
  ink: '#1a1814',
  inkMid: '#5a5650',
  inkFaint: '#9b9890',
  accent: '#c45c1a',
  green: '#2d7a47',
  greenBg: '#edf7f1',
  greenBorder: '#a8d9b8',
  blue: '#1a5fa8',
} as const

const stacks = [
  {
    name: 'Next.js (Vercel)',
    role: 'フロントエンド + API Routes',
    color: C.ink,
    items: ['管理画面 / 顧客ポータル UI', 'API Route: メール送信（Resend）', 'API Route: Claude API 呼び出し', 'Vercel Cron: 期限アラート定期実行'],
  },
  {
    name: 'Supabase',
    role: 'DB + Storage + Edge Functions',
    color: C.green,
    items: ['PostgreSQL: 案件・書類・メール履歴', 'Supabase Storage: 書類ファイル保存', 'Database Webhook → Edge Function', 'Edge Function: 差し戻し時の自動メール'],
  },
  {
    name: 'Resend',
    role: 'メール送信 API',
    color: C.blue,
    items: ['Vercel API Route から直接呼び出し', '差し戻し / 承認 / 期限アラート', 'React Email でHTMLテンプレート', '送信ログを Supabase に記録'],
  },
  {
    name: 'Claude API',
    role: 'AI エンジン',
    color: C.accent,
    items: ['適格性スクリーニング', '書類ドラフト生成', '要項PDF解析', 'Vercel API Route 経由で安全に呼び出し'],
  },
]

const flows = [
  { trigger: '顧客がポータルで書類をアップロード', steps: ['Supabase Storage 保存', 'DB更新', 'Webhook発火', 'Edge Function', 'Resend APIでCS通知'] },
  { trigger: 'CSが差し戻しボタンを押す', steps: ['API Route → DB更新', 'Webhook発火', 'Edge Function', 'Resend APIで顧客にメール'] },
  { trigger: 'Vercel Cron（毎日 09:00）', steps: ['期限14日以内の案件クエリ', '未提出書類を抽出', 'Resend APIでアラートメール', 'email_logsに記録'] },
]

const schema = [
  { table: 'applications', cols: ['id', 'client_id', 'subsidy_type', 'status', 'amount', 'deadline', 'cs_name', 'created_at'] },
  { table: 'documents',    cols: ['id', 'application_id', 'name', 'required', 'status', 'file_url', 'note', 'submitted_at'] },
  { table: 'email_logs',   cols: ['id', 'application_id', 'type', 'subject', 'to_email', 'sent_at', 'via'] },
  { table: 'clients',      cols: ['id', 'name', 'email', 'portal_token', 'created_at'] },
]

export default function ArchitecturePage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1100 }}>
      <div>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800 }}>システム設計</h2>
        <p style={{ margin: 0, color: C.inkFaint, fontSize: 13 }}>技術スタックと自動化フロー</p>
      </div>

      <div style={{ background: C.greenBg, border: `1px solid ${C.greenBorder}`, borderRadius: 12, padding: '16px 20px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.green, marginBottom: 6 }}>Make.com フリー構成</div>
        <div style={{ fontSize: 12, color: C.inkMid }}>
          すべての自動化を Vercel Cron + Supabase Edge Functions + Resend API で実装。外部 iPaaS 不要・コードで一元管理。
        </div>
      </div>

      {/* スタック */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
        {stacks.map(s => (
          <div key={s.name} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.name}</div>
            <div style={{ fontSize: 11, color: C.inkFaint, marginBottom: 12 }}>{s.role}</div>
            {s.items.map((it, i) => (
              <div key={i} style={{ fontSize: 12, color: C.inkMid, padding: '3px 0', display: 'flex', gap: 8 }}>
                <span style={{ color: s.color, flexShrink: 0 }}>-</span>{it}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* フロー */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, background: C.surfaceAlt, fontSize: 11, color: C.inkFaint, fontWeight: 700, textTransform: 'uppercase' as const }}>
          自動化フロー
        </div>
        {flows.map((f, fi) => (
          <div key={fi} style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ minWidth: 220, fontSize: 12, fontWeight: 700, color: C.ink }}>{f.trigger}</div>
            <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap' as const, gap: 4, alignItems: 'center' }}>
              {f.steps.map((s, si) => (
                <div key={si} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 11, color: C.inkMid, background: C.bg, border: `1px solid ${C.border}`, padding: '3px 10px', borderRadius: 6 }}>{s}</span>
                  {si < f.steps.length - 1 && <span style={{ fontSize: 12, color: C.inkFaint }}>›</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* スキーマ */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Supabase DB スキーマ</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
          {schema.map(t => (
            <div key={t.table} style={{ background: C.surfaceAlt, borderRadius: 8, padding: '14px 18px', border: `1px solid ${C.border}` }}>
              <div style={{ fontFamily: 'monospace', fontSize: 13, color: C.accent, fontWeight: 700, marginBottom: 8 }}>{t.table}</div>
              {t.cols.map(col => (
                <div key={col} style={{ fontFamily: 'monospace', fontSize: 11, color: C.inkMid, padding: '2px 0' }}>- {col}</div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* コスト */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>月額コスト目安</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
          <thead>
            <tr style={{ background: C.bg }}>
              {['サービス', 'プラン', '月額', '備考'].map(h => (
                <th key={h} style={{ padding: '8px 14px', textAlign: 'left' as const, fontSize: 11, color: C.inkFaint, fontWeight: 600, textTransform: 'uppercase' as const }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ['Vercel',     'Pro',     '$20',      'Cron Jobs・Edge Functions含む'],
              ['Supabase',   'Pro',     '$25',      'Storage 100GB・Edge Functions含む'],
              ['Resend',     'Starter', '$0〜$20',   '月3,000通まで無料'],
              ['Claude API', '従量',    '$5〜20',    '使用量による'],
              ['Make.com',   '—',       '$0',        '不使用'],
            ].map(([svc, plan, cost, note]) => (
              <tr key={svc} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: svc === 'Make.com' ? C.inkFaint : C.ink }}>{svc}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: C.inkFaint }}>{plan}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, fontFamily: 'monospace', fontWeight: 700, color: svc === 'Make.com' ? C.inkFaint : C.green }}>{cost}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: C.inkFaint }}>{note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
