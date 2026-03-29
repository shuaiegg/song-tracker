import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export interface WeeklyTrendItem {
  week_start: string
  total_likes: number
  new_likes: number
  change_pct: string | null
}

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    type WeeklyIncrement = { week_start: string; weekly_new_likes: number }

    // 并发获取当前总点赞 + 每周增量
    const [{ data: currentTotal }, { data: weeklyIncrements, error: incrementsError }] =
      await Promise.all([
        supabase.rpc('get_current_total_likes'),
        supabase.rpc('get_weekly_likes_increments') as unknown as Promise<{ data: WeeklyIncrement[] | null; error: unknown }>,
      ])

    if (incrementsError) {
      console.error('Error fetching weekly increments:', incrementsError)
      return NextResponse.json({ error: '获取周趋势数据失败' }, { status: 500 })
    }

    console.log('weekly increments count:', weeklyIncrements?.length, 'current total:', currentTotal)

    if (!weeklyIncrements || weeklyIncrements.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const total: number = currentTotal ?? 0

    // 过滤脏数据：仅当 total > 0 时才过滤异常增量（增量 > 总量说明是累计值误写入）
    // total 为 0 或 null 时跳过过滤，避免误删所有数据
    const cleanedIncrements = total > 0
      ? weeklyIncrements.filter(week => Number(week.weekly_new_likes) <= total)
      : weeklyIncrements

    // 从当前总量往回反推每周末的历史总量
    let runningTotal: number = total
    const reversed = [...cleanedIncrements].reverse()

    const result: WeeklyTrendItem[] = reversed.map(week => {
      const total_at_week_end = runningTotal
      runningTotal = Math.max(0, runningTotal - Number(week.weekly_new_likes))
      return {
        week_start: week.week_start,
        total_likes: total_at_week_end,
        new_likes: Number(week.weekly_new_likes),
        change_pct: null,
      }
    }).reverse()

    // 计算周环比
    result.forEach((week, i) => {
      const prev = result[i - 1]
      if (prev && prev.total_likes > 0) {
        const pct = ((week.total_likes - prev.total_likes) / prev.total_likes) * 100
        week.change_pct = (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%'
      }
    })

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('Error in weekly-trend API:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
