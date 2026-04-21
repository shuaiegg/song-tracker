// src/app/api/songs/my-songs/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  const offset = (page - 1) * limit

  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    // 查询1（歌曲列表）和查询2/3（汇总统计）并发执行
    // 歌曲列表不再嵌套 song_stats，避免扫描大量历史记录
    const [
      { data: relations, error: relationsError, count },
      { data: totalLikesData },
      { data: weekAgoData },
    ] = await Promise.all([
      supabase
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
            created_at
          )
        `, { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1),
      supabase.rpc('get_current_total_likes'),
      supabase.rpc('get_total_likes_7days_ago'),
    ])

    if (relationsError) {
      console.error('Error fetching user songs:', relationsError)
      return NextResponse.json({ error: '获取歌曲列表失败' }, { status: 500 })
    }

    // 查询2：单独获取这10首歌的最新 stats（只看最近2天，数据量极小）
    const songIds = relations?.map(r => r.song_id) ?? []
    const defaultStats = { likes: 0, favorites: 0, comments: 0, shares: 0, fetched_at: null }

    let statsMap = new Map<string, typeof defaultStats>()
    if (songIds.length > 0) {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      const { data: recentStats } = await supabase
        .from('song_stats')
        .select('song_id, likes, favorites, comments, shares, fetched_at')
        .in('song_id', songIds)
        .gte('fetched_at', twoDaysAgo)
        .order('fetched_at', { ascending: false })

      recentStats?.forEach(s => {
        if (!statsMap.has(s.song_id)) statsMap.set(s.song_id, s)
      })
    }

    const songsWithStats = relations
      ?.map(r => r.songs)
      .filter(Boolean)
      .map((song: any) => ({
        ...song,
        latest_stats: statsMap.get(song.id) ?? defaultStats,
      })) ?? []

    const totalLikes = totalLikesData ?? 0
    const totalLikes7DaysAgo = (weekAgoData as number | null) ?? 0
    const sevenDayIncrement = totalLikes7DaysAgo > 0 ? totalLikes - totalLikes7DaysAgo : null

    return NextResponse.json({
      songs: songsWithStats,
      total: count,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
      summary: {
        totalLikes,
        sevenDayIncrement,
        totalSongs: count,
      },
    })

  } catch (error) {
    console.error('Error in my-songs API:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
