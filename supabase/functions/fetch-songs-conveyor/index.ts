// import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// const corsHeaders = {
//   'Access-Control-Allow-Origin': '*',
//   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
// }

// serve(async (req) => {
//   if (req.method === 'OPTIONS') {
//     return new Response('ok', { headers: corsHeaders })
//   }

//   const supabase = createClient(
//     Deno.env.get('SUPABASE_URL')!,
//     Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
//   )

//   try {
//     console.log('Starting fetch job...')

//     // 1. 获取待抓取歌曲
//     const { data: songs, error: fetchError } = await supabase
//       .from('songs')
//       .select('id, song_id, title, artist')
//       .order('last_fetched_at', { ascending: true, nullsFirst: true })
//       .limit(30)

//     if (fetchError) {
//       console.error('Fetch songs error:', fetchError)
//       throw fetchError
//     }

//     if (!songs || songs.length === 0) {
//       console.log('No songs to process')
//       return new Response(
//         JSON.stringify({ message: "No songs to process", processed: 0 }), 
//         { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
//       )
//     }

//     console.log(`Processing ${songs.length} songs...`)

//     const statsBuffer: any[] = []
//     const successfulSongIds: string[] = []  // ✨ 只存储 ID
//     const failedSongIds: string[] = []      // ✨ 只存储 ID
//     const logEntries: any[] = []
//     const now = new Date().toISOString()

//     // 2. 遍历并抓取数据
//     for (const song of songs) {
//       try {
//         const apiUrl = `https://beta-luna.douyin.com/luna/h5/seo_track?track_id=${song.song_id}`
//         const response = await fetch(apiUrl, {
//           headers: { 
//             'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
//             'Accept': 'application/json'
//           },
//           signal: AbortSignal.timeout(10000)
//         })

//         if (!response.ok) {
//           throw new Error(`HTTP ${response.status}`)
//         }

//         const resData = await response.json()
//         const stats = resData.seo_track?.track?.stats

//         if (!stats) {
//           throw new Error('No stats data in response')
//         }

//         const likes = Number(stats.count_collected || 0)
//         const comments = Number(stats.count_comment || 0)
//         const shares = Number(stats.count_shared || 0)

//         // ✨ 添加统计数据
//         statsBuffer.push({
//           song_id: song.id,
//           likes,
//           favorites: 0,
//           comments,
//           shares,
//         })

//         // ✨ 记录成功的歌曲 ID
//         successfulSongIds.push(song.id)

//         logEntries.push({ 
//           song_id: song.id, 
//           status: 'success',
//           created_at: now
//         })

//         console.log(`✓ ${song.title}: ${likes} likes`)

//       } catch (err: any) {
//         console.error(`✗ ${song.title}:`, err.message)
        
//         // ✨ 记录失败的歌曲 ID
//         failedSongIds.push(song.id)
        
//         logEntries.push({ 
//           song_id: song.id, 
//           status: 'error', 
//           error_message: err.message.substring(0, 500), // ✨ 限制错误信息长度
//           created_at: now
//         })
//       }
      
//       // 间隔 1 秒
//       await new Promise(r => setTimeout(r, 1000))
//     }

//     // 3. 批量写入数据库
//     let statsInserted = 0
//     let successUpdated = 0
//     let failedUpdated = 0
//     let logsInserted = 0

//     // ✨ 3.1 插入统计数据（只有成功的）
//     if (statsBuffer.length > 0) {
//       const { data, error: statsError } = await supabase
//         .from('song_stats')
//         .insert(statsBuffer)
//         .select('id')
      
//       if (statsError) {
//         console.error('❌ Insert stats error:', statsError.message)
//         // 不抛出错误，继续执行
//       } else {
//         statsInserted = data?.length || 0
//         console.log(`✓ Inserted ${statsInserted} stats records`)
//       }
//     }

//     // ✨ 3.2 更新成功歌曲的时间戳（批量更新）
//     if (successfulSongIds.length > 0) {
//       const { error: updateError } = await supabase
//         .from('songs')
//         .update({ last_fetched_at: now })
//         .in('id', successfulSongIds)
      
//       if (updateError) {
//         console.error('❌ Update successful songs error:', updateError.message)
//       } else {
//         successUpdated = successfulSongIds.length
//         console.log(`✓ Updated ${successUpdated} successful songs`)
//       }
//     }

//     // ✨ 3.3 更新失败歌曲的时间戳（避免一直卡在队首）
//     if (failedSongIds.length > 0) {
//       const { error: updateError } = await supabase
//         .from('songs')
//         .update({ last_fetched_at: now })
//         .in('id', failedSongIds)
      
//       if (updateError) {
//         console.error('❌ Update failed songs error:', updateError.message)
//       } else {
//         failedUpdated = failedSongIds.length
//         console.log(`✓ Updated ${failedUpdated} failed songs (避免卡队首)`)
//       }
//     }

//     // ✨ 3.4 插入日志（可选，即使失败也不影响主流程）
//     if (logEntries.length > 0) {
//       const { data, error: logsError } = await supabase
//         .from('fetch_logs')
//         .insert(logEntries)
//         .select('id')
      
//       if (logsError) {
//         console.error('❌ Insert logs error:', logsError.message)
//         // 日志失败不影响主流程
//       } else {
//         logsInserted = data?.length || 0
//         console.log(`✓ Inserted ${logsInserted} log entries`)
//       }
//     }

//     // 4. 构建结果
//     const result = {
//       success: true,
//       processed: songs.length,
//       successful: successfulSongIds.length,
//       failed: failedSongIds.length,
//       stats_inserted: statsInserted,
//       success_updated: successUpdated,
//       failed_updated: failedUpdated,
//       logs_inserted: logsInserted,
//       timestamp: now
//     }

//     console.log('✅ Job completed:', JSON.stringify(result, null, 2))

//     return new Response(JSON.stringify(result), {
//       headers: { ...corsHeaders, 'Content-Type': 'application/json' }
//     })

//   } catch (error: any) {
//     console.error('❌ Fatal error:', error.message)
//     return new Response(
//       JSON.stringify({ 
//         success: false,
//         error: error.message,
//         stack: error.stack?.substring(0, 500), // ✨ 添加堆栈信息（调试用）
//         timestamp: new Date().toISOString()
//       }), 
//       {
//         status: 500,
//         headers: { ...corsHeaders, 'Content-Type': 'application/json' }
//       }
//     )
//   }
// })