import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const supabase = createServiceClient()
  const body = await req.json()
  const { clientName, employees, revenue, hasHistory, currentSystem, note, applicationId, capitalAmount, industry, roomCount, wageRaisePlan, gbizIdStatus, securityActionDone, miradejiDone } = body

  if (!clientName) {
    return NextResponse.json({ error: 'clientName は必須です' }, { status: 400 })
  }

  // 公募要領データを取得
  let guidelinesContext = ''
  if (applicationId) {
    const { data: app } = await supabase
      .from('applications')
      .select('subsidy_type, subsidy_frame, program_id, subsidy_programs(name, guidelines_json)')
      .eq('id', applicationId)
      .single()

    if (app?.subsidy_programs) {
      const prog = app.subsidy_programs as unknown as { name: string; guidelines_json: any }
      if (prog.guidelines_json) {
        const g = prog.guidelines_json
        guidelinesContext = `
【公募要領に基づく審査基準（${prog.name}）】

■ 対象事業者の要件（業種別の資本金・従業員数上限）:
${Object.entries(g.eligibility ?? {}).map(([k, v]: [string, any]) => `  - ${k}: 資本金${v.capital}、従業員${v.employees}`).join('\n')}
  ※宿泊業: 資本金5000万円以下、従業員200人以下

■ 申請枠と補助額:
${(g.frames ?? []).map((f: any) => `  - ${f.name}: ${f.amount_min ? `${(f.amount_min/10000).toFixed(0)}万円〜` : ''}${f.amount_max ? `${(f.amount_max/10000).toFixed(0)}万円` : ''} / 補助率${f.rate}${f.rate_raised ? `（賃上げ時: ${f.rate_raised}）` : ''}${f.note ? ` [${f.note}]` : ''}${f.processes ? ` [${f.processes}]` : ''}`).join('\n')}

■ 対象経費: ${(g.eligible_expenses ?? []).join('、')}

■ 申請前の必須要件:
${(g.prerequisites ?? []).map((p: string) => `  - ${p}`).join('\n')}

■ 不採択となる条件:
${(g.disqualification ?? []).map((d: string) => `  - ${d}`).join('\n')}

■ 加点項目:
${(g.scoring_bonus ?? []).map((s: string) => `  - ${s}`).join('\n')}
`
      }
    }
  }

  const systemPrompt = `あなたはデジタル化・AI導入補助金（旧IT導入補助金）の専門家アドバイザーです。
AZOO株式会社はIT導入支援事業者として登録済みであり、提供するPMS「WASIMIL」は補助金対象ツールとして認定されています。
顧客（主にホテル・旅館等の宿泊業）の補助金適格性を、公募要領の具体的な基準に基づいて診断してください。

${guidelinesContext}

以下の点を特に評価してください:
1. 資本金・従業員数が業種別の上限以内か
2. 最適な申請枠（通常枠A/B、インボイス枠、セキュリティ枠）の推奨
3. gBizID・SECURITY ACTION等の事前要件の充足状況
4. 加点項目の該当可能性
5. 不採択リスクの有無

必ず以下のJSON形式のみで回答してください。JSON以外のテキストは出力しないでください。

{
  "score": <0-100の整数>,
  "eligible": <true/false>,
  "frame": "<推奨申請枠（通常枠A類型/通常枠B類型/インボイス枠等）>",
  "maxAmount": "<推奨枠の最大補助額>",
  "subsidyRate": "<基本補助率（賃上げ適用時も併記）>",
  "reasons": ["<適格と判断した具体的理由1>", "<理由2>", "<理由3>"],
  "requiredDocs": ["<必要書類1>", "<必要書類2>"],
  "risks": ["<不採択リスクや注意点>"],
  "nextAction": "<今すぐ取るべき具体的アクション>",
  "bonusPoints": ["<該当する可能性のある加点項目>"]
}`

  const userMessage = `以下の顧客情報を基にデジタル化・AI導入補助金2026の適格性を診断してください。

顧客名: ${clientName}
業種: ${industry ?? '宿泊業'}（※旅館業の場合: 資本金5,000万円以下 or 従業員200人以下が条件）
従業員数（常勤）: ${employees || '不明'}名
資本金: ${capitalAmount || '不明'}
年商: ${revenue ? `${revenue}万円` : '不明'}
客室数: ${roomCount || '不明'}
補助金申請歴: ${hasHistory ?? 'なし'}
現在のシステム: ${currentSystem || '特になし'}
導入予定ツール: WASIMIL（PMS・予約エンジン・DXプラットフォーム — 4プロセス以上対応）
賃上げ計画: ${wageRaisePlan ?? '未定'}
gBizIDプライム: ${gbizIdStatus ?? '不明'}
SECURITY ACTION: ${securityActionDone ? '完了' : '未実施'}
みらデジ経営チェック: ${miradejiDone ? '完了' : '未実施'}
備考: ${note ?? 'なし'}`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1500,
      messages: [{ role: 'user', content: userMessage }],
      system: systemPrompt,
    })

    const content = message.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response type')

    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('JSON not found in response')
    const result = JSON.parse(jsonMatch[0])

    // screening_logs に保存
    const { data: log } = await supabase
      .from('screening_logs')
      .insert({
        application_id: applicationId ?? null,
        client_name: clientName,
        score: result.score,
        eligible: result.eligible,
        frame: result.frame,
        result,
      })
      .select()
      .single()

    // 案件がある場合はスコアと ai_result を更新
    if (applicationId) {
      await supabase
        .from('applications')
        .update({
          score: result.score,
          subsidy_frame: result.frame,
          ai_result: result,
        })
        .eq('id', applicationId)
    }

    return NextResponse.json({ result, logId: log?.id })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '診断エラー'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
