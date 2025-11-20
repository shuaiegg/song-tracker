// src/app/api/admin/trigger-daily-rollup/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // 验证管理员权限
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { data: adminData } = await supabase
      .from('admins')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!adminData) {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    // 允许指定日期（用于测试）
    const body = await request.json().catch(() => ({}))
    const targetDate = body.date || new Date().toISOString().split('T')[0]
    
    console.log('Triggering daily rollup for date:', targetDate)

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // 获取所有歌曲
    const { data: songs, error: songsError } = await supabaseAdmin
      .from('songs')
      .select('id, title')

    if (songsError) {
      throw new Error(`获取歌曲失败: ${songsError.message}`)
    }

    const previousDate = new Date(new Date(targetDate).getTime() - 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0]

    const results = {
      total: songs?.length || 0,
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
      details: [] as any[],
    }

    for (const song of songs || []) {
      try {
        // 删除今天的旧记录（如果存在）
        await supabaseAdmin
          .from('daily_stats')
          .delete()
          .eq('song_id', song.id)
          .eq('date', targetDate)

        // 获取目标日期的最新数据
        const { data: targetDayStats } = await supabaseAdmin
          .from('song_stats')
          .select('likes, favorites, comments, shares, fetched_at')
          .eq('song_id', song.id)
          .gte('fetched_at', `${targetDate}T00:00:00Z`)
          .lte('fetched_at', `${targetDate}T23:59:59Z`)
          .order('fetched_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        // 获取前一天的最新数据
        const { data: previousDayStats } = await supabaseAdmin
          .from('song_stats')
          .select('likes, favorites, comments, shares, fetched_at')
          .eq('song_id', song.id)
          .gte('fetched_at', `${previousDate}T00:00:00Z`)
          .lte('fetched_at', `${previousDate}T23:59:59Z`)
          .order('fetched_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        console.log(`${song.title}:`, {
          targetDay: targetDayStats ? 'found' : 'none',
          previousDay: previousDayStats ? 'found' : 'none'
        })

        if (!targetDayStats) {
          console.log(`No data for ${song.title} on ${targetDate}`)
          results.skipped++
          results.details.push({
            song: song.title,
            status: 'skipped',
            reason: `没有 ${targetDate} 的数据`
          })
          continue
        }

        // 计算增量
        const likesIncrease = targetDayStats.likes - (previousDayStats?.likes || 0)
        const favoritesIncrease = targetDayStats.favorites - (previousDayStats?.favorites || 0)
        const commentsIncrease = targetDayStats.comments - (previousDayStats?.comments || 0)
        const sharesIncrease = targetDayStats.shares - (previousDayStats?.shares || 0)

        // 计算变化率
        const changeRate = previousDayStats?.likes 
          ? ((likesIncrease / previousDayStats.likes) * 100)
          : 0

        // 插入每日统计
        const { error: insertError } = await supabaseAdmin
          .from('daily_stats')
          .insert({
            song_id: song.id,
            date: targetDate,
            likes: likesIncrease,
            favorites: favoritesIncrease,
            comments: commentsIncrease,
            shares: sharesIncrease,
            change_rate: changeRate,
          })

        if (insertError) {
          throw new Error(`插入失败: ${insertError.message}`)
        }

        console.log(`✓ ${song.title} - 增量: ${likesIncrease} 点赞`)
        results.success++
        results.details.push({
          song: song.title,
          status: 'success',
          increment: {
            likes: likesIncrease,
            comments: commentsIncrease,
            shares: sharesIncrease,
          }
        })

      } catch (error: any) {
        console.error(`✗ ${song.title} - 失败:`, error.message)
        results.failed++
        results.errors.push(`${song.title}: ${error.message}`)
        results.details.push({
          song: song.title,
          status: 'error',
          error: error.message
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        message: '每日汇总完成',
        results,
        date: targetDate,
        previousDate,
        timestamp: new Date().toISOString(),
      }
    })

  } catch (error: any) {
    console.error('Daily rollup error:', error)
    return NextResponse.json(
      { error: error.message || '触发失败' },
      { status: 500 }
    )
  }
}