// supabase/functions/daily-rollup/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting daily rollup...')

    // 获取所有歌曲
    const { data: songs, error: songsError } = await supabaseClient
      .from('songs')
      .select('id, title')

    if (songsError) {
      throw new Error(`Error fetching songs: ${songsError.message}`)
    }

    console.log(`Found ${songs?.length || 0} songs`)

    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const results = {
      total: songs?.length || 0,
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
    }

    for (const song of songs || []) {
      try {
        // 检查今天是否已经计算过
        const { data: existingDaily } = await supabaseClient
          .from('daily_stats')
          .select('id')
          .eq('song_id', song.id)
          .eq('date', today)
          .maybeSingle()

        if (existingDaily) {
          console.log(`Already calculated for ${song.title} today, skipping...`)
          results.skipped++
          continue
        }

        // 获取今天最后一条数据
        const { data: todayStats } = await supabaseClient
          .from('song_stats')
          .select('likes, favorites, comments, shares')
          .eq('song_id', song.id)
          .gte('fetched_at', `${today}T00:00:00`)
          .lte('fetched_at', `${today}T23:59:59`)
          .order('fetched_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        // 获取昨天最后一条数据
        const { data: yesterdayStats } = await supabaseClient
          .from('song_stats')
          .select('likes, favorites, comments, shares')
          .eq('song_id', song.id)
          .gte('fetched_at', `${yesterday}T00:00:00`)
          .lte('fetched_at', `${yesterday}T23:59:59`)
          .order('fetched_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!todayStats) {
          console.log(`No data for ${song.title} today, skipping...`)
          results.skipped++
          continue
        }

        // 计算增量
        const likesIncrease = todayStats.likes - (yesterdayStats?.likes || 0)
        const favoritesIncrease = todayStats.favorites - (yesterdayStats?.favorites || 0)
        const commentsIncrease = todayStats.comments - (yesterdayStats?.comments || 0)
        const sharesIncrease = todayStats.shares - (yesterdayStats?.shares || 0)

        // 计算变化率
        const changeRate = yesterdayStats?.likes 
          ? ((likesIncrease / yesterdayStats.likes) * 100)
          : 0

        // 插入每日统计
        const { error: insertError } = await supabaseClient
          .from('daily_stats')
          .insert({
            song_id: song.id,
            date: today,
            likes: likesIncrease,
            favorites: favoritesIncrease,
            comments: commentsIncrease,
            shares: sharesIncrease,
            change_rate: changeRate,
          })

        if (insertError) {
          throw new Error(`Insert error: ${insertError.message}`)
        }

        console.log(`✓ Calculated daily stats for ${song.title}`)
        results.success++

      } catch (error) {
        console.error(`✗ Failed for ${song.title}:`, error)
        results.failed++
        results.errors.push(`${song.title}: ${error.message}`)
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Daily rollup completed',
        results,
        date: today,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})