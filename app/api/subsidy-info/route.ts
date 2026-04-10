import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// 補助金種別名で収集済みデータをマッチング
export async function GET(req: NextRequest) {
  const subsidyType = req.nextUrl.searchParams.get('type') ?? ''
  const supabase = createServiceClient()

  // 部分一致で検索
  const keywords = subsidyType.replace(/補助金/g, '').split(/[・\s]+/).filter(s => s.length > 1)

  let match = null
  for (const kw of keywords) {
    const { data } = await supabase
      .from('collected_subsidies')
      .select('*')
      .ilike('name', `%${kw}%`)
      .limit(1)
      .single()
    if (data) { match = data; break }
  }

  // フォールバック: 全件から最も近いものを取得
  if (!match) {
    const { data } = await supabase
      .from('collected_subsidies')
      .select('*')
      .ilike('name', `%${subsidyType.slice(0, 6)}%`)
      .limit(1)
      .single()
    match = data
  }

  return NextResponse.json(match)
}
