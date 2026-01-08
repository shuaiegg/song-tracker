// src/app/api/songs/my-songs/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10') // 默认改为10，大幅减少数据量
  const offset = (page - 1) * limit

  try {
    const supabase = await createClient()

    // 获取当前用户
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      )
    }

    // 🚀 优化：使用单次查询获取歌曲和最新统计数据，避免 N+1 问题
    const { data: relations, error: relationsError, count } = await supabase
      .from('user_song_relations')
      .select(`
        id,
        created_at,
        song_id,
        songs!inner (
          id,
          song_id,
          title,
          artist,
          album,
          cover_url,
          rank,
          created_at,
          song_stats (
            likes,
            favorites,
            comments,
            shares,
            fetched_at
          )
        )
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .order('fetched_at', { referencedTable: 'songs.song_stats', ascending: false })
      .range(offset, offset + limit - 1)

    if (relationsError) {
      console.error('Error fetching user songs:', relationsError)
      return NextResponse.json(
        { error: '获取歌曲列表失败' },
        { status: 500 }
      )
    }

    // 提取歌曲数据并取每首歌的第一条统计记录（最新的）
    const songsWithStats = relations
      .map(r => r.songs)
      .filter(Boolean)
      .map((song: any) => ({
        ...song,
        latest_stats: song.song_stats?.[0] || {
          likes: 0,
          favorites: 0,
          comments: 0,
          shares: 0,
          fetched_at: null,
        },
        song_stats: undefined, // 移除原始数组，避免传输过多数据
      }))

    // 🚀 获取所有歌曲的总点赞数统计（不限于前 10 首）
    const { data: allStats } = await supabase
      .from('user_song_relations')
      .select(`
        songs!inner (
          id,
          song_stats!inner (
            likes
          )
        )
      `)
      .eq('user_id', user.id)
      .order('fetched_at', { referencedTable: 'songs.song_stats', ascending: false })

    // 计算总点赞数：取每首歌的最新统计记录的点赞数
    const songStatsMap = new Map<string, number>()
    allStats?.forEach((rel: any) => {
      const songId = rel.songs.id
      const likes = rel.songs.song_stats?.[0]?.likes || 0
      // 只保留每首歌的第一条记录（最新的）
      if (!songStatsMap.has(songId)) {
        songStatsMap.set(songId, likes)
      }
    })

    const totalLikes = Array.from(songStatsMap.values()).reduce((sum, likes) => sum + likes, 0)

    return NextResponse.json({
      songs: songsWithStats,
      total: count,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
      summary: {
        totalLikes,
        totalSongs: count,
      },
    })

  } catch (error) {
    console.error('Error in my-songs API:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}