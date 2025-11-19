// supabase/functions/fetch-rank-a/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DouyinApiResponse {
  seo_track?: {
    name?: string
    track?: {
      artists?: Array<{ name: string }>
      album?: { name: string }
      stats?: {
        count_collected?: number
        count_comment?: number
        count_shared?: number
      }
    }
    cover?: string
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 创建 Supabase 客户端
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Fetching Rank A songs...')

    // 获取所有 Rank A 的歌曲
    const { data: songs, error: songsError } = await supabaseClient
      .from('songs')
      .select('id, song_id, title')
      .eq('rank', 'C')

    if (songsError) {
      throw new Error(`Error fetching songs: ${songsError.message}`)
    }

    console.log(`Found ${songs?.length || 0} Rank C songs`)

    const results = {
      total: songs?.length || 0,
      success: 0,
      failed: 0,
      errors: [] as string[],
    }

    // 遍历每首歌曲并抓取数据
    for (const song of songs || []) {
      try {
        console.log(`Fetching data for: ${song.title} (${song.song_id})`)

        // 调用抖音 API
        const apiUrl = `https://beta-luna.douyin.com/luna/h5/seo_track?track_id=${song.song_id}`
        const response = await fetch(apiUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`)
        }

        const data: DouyinApiResponse = await response.json()
        const seoTrack = data.seo_track

        if (!seoTrack) {
          throw new Error('No seo_track data')
        }

        // 提取统计数据
        const stats = seoTrack.track?.stats || {}
        const likes = parseInt(String(stats.count_collected || 0))
        const comments = parseInt(String(stats.count_comment || 0))
        const shares = parseInt(String(stats.count_shared || 0))

        // 保存到 song_stats 表
        const { error: insertError } = await supabaseClient
          .from('song_stats')
          .insert({
            song_id: song.id,
            likes,
            favorites: 0, // 目前没有对应字段
            comments,
            shares,
          })

        if (insertError) {
          throw new Error(`Insert error: ${insertError.message}`)
        }

        console.log(`✓ Successfully saved stats for ${song.title}`)
        results.success++

        // 记录成功日志
        await supabaseClient
          .from('fetch_logs')
          .insert({
            song_id: song.id,
            status: 'success',
            error_message: null,
          })

        // 添加延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        console.error(`✗ Failed to fetch ${song.title}:`, error)
        results.failed++
        results.errors.push(`${song.title}: ${error.message}`)

        // 记录失败日志
        await supabaseClient
          .from('fetch_logs')
          .insert({
            song_id: song.id,
            status: 'error',
            error_message: error.message,
          })
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Fetch Rank A completed',
        results,
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