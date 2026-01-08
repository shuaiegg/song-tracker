// import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// const corsHeaders = {
//   'Access-Control-Allow-Origin': '*',
//   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
// }

// serve(async (req) => {
//   if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

//   const supabase = createClient(
//     Deno.env.get('SUPABASE_URL')!,
//     Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
//   )

//   try {
//     // 1. 获取最久没更新的 20 首歌曲
//     // 使用 order by last_fetched_at nulls first 确保从未抓取过的排在最前
//     const { data: songs, error: fetchError } = await supabase
//       .from('songs')
//       .select('id, song_id, title')
//       .order('last_fetched_at', { ascending: true })
//       .limit(20)

//     if (fetchError) throw fetchError
//     if (!songs || songs.length === 0) {
//       return new Response(JSON.stringify({ message: "No songs to process" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
//     }

//     const statsBuffer = []
//     const songUpdates = []
//     const logEntries = []

//     // 2. 遍历并抓取数据
//     for (const song of songs) {
//       try {
//         const apiUrl = `https://beta-luna.douyin.com/luna/h5/seo_track?track_id=${song.song_id}`
//         const response = await fetch(apiUrl, {
//           headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
//           signal: AbortSignal.timeout(10000) // 10秒超时
//         })

//         if (!response.ok) throw new Error(`HTTP ${response.status}`)
//         const resData = await response.json()
//         const stats = resData.seo_track?.track?.stats

//         if (stats) {
//           const likes = Number(stats.count_collected || 0)
//           const comments = Number(stats.count_comment || 0)
//           const shares = Number(stats.count_shared || 0)

//           // 存入统计表缓冲
//           statsBuffer.push({
//             song_id: song.id,
//             likes,
//             comments,
//             shares,
//           })

//           // 存入歌曲更新缓冲 (更新时间戳和当前点赞数)
//           songUpdates.push({
//             id: song.id,
//             last_fetched_at: new Date().toISOString(),
//             digg_count: likes 
//           })

//           logEntries.push({ song_id: song.id, status: 'success' })
//         }
//       } catch (err) {
//         console.error(`Error fetching ${song.title}:`, err.message)
//         logEntries.push({ song_id: song.id, status: 'error', error_message: err.message })
//         // 即便失败，也更新时间戳，否则失败的歌会一直卡在队首
//         songUpdates.push({ id: song.id, last_fetched_at: new Date().toISOString() })
//       }
      
//       // 间隔 300ms 避免过快
//       await new Promise(r => setTimeout(r, 1000))
//     }

//     // 3. 批量写入数据库 (3个操作合为3个请求，而不是 20*3 个)
//     if (statsBuffer.length > 0) {
//       await supabase.from('song_stats').insert(statsBuffer)
//     }
//     if (songUpdates.length > 0) {
//       await supabase.from('songs').upsert(songUpdates)
//     }
//     if (logEntries.length > 0) {
//       await supabase.from('fetch_logs').insert(logEntries)
//     }

//     return new Response(JSON.stringify({ processed: songs.length }), {
//       headers: { ...corsHeaders, 'Content-Type': 'application/json' }
//     })

//   } catch (error) {
//     return new Response(JSON.stringify({ error: error.message }), {
//       status: 500,
//       headers: { ...corsHeaders, 'Content-Type': 'application/json' }
//     })
//   }
// })
