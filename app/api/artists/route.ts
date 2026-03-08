import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    // 获取用户所有歌曲的 artist + 最新 likes
    const { data: relations, error } = await supabase
      .from('user_song_relations')
      .select(`
        songs!inner (
          id,
          artist,
          song_stats ( likes, fetched_at )
        )
      `)
      .eq('user_id', user.id)
      .order('fetched_at', { referencedTable: 'songs.song_stats', ascending: false })
      .limit(1, { referencedTable: 'songs.song_stats' })
      .limit(30000)

    if (error) throw error

    // 获取一周前各首歌的 likes
    const { data: weekAgoData } = await supabase
      .rpc('get_week_ago_likes')
      .limit(30000)

    const weekAgoMap: Record<string, number> = {}
    if (weekAgoData) {
      for (const row of weekAgoData) {
        weekAgoMap[row.song_id] = row.likes
      }
    }

    // 按 artist 分组聚合
    const artistMap: Record<string, {
      artist: string
      songCount: number
      totalLikes: number
      weekAgoTotalLikes: number
      hasWeekAgoData: boolean
    }> = {}

    for (const rel of (relations || [])) {
      const song = (rel as any).songs
      if (!song?.artist) continue
      const artist = song.artist.trim()
      const likes = song.song_stats?.[0]?.likes ?? 0
      const weekAgoLikes = weekAgoMap[song.id] ?? null

      if (!artistMap[artist]) {
        artistMap[artist] = {
          artist,
          songCount: 0,
          totalLikes: 0,
          weekAgoTotalLikes: 0,
          hasWeekAgoData: false,
        }
      }
      artistMap[artist].songCount++
      artistMap[artist].totalLikes += likes
      if (weekAgoLikes !== null) {
        artistMap[artist].weekAgoTotalLikes += weekAgoLikes
        artistMap[artist].hasWeekAgoData = true
      }
    }

    const artists = Object.values(artistMap).map(a => ({
      artist: a.artist,
      songCount: a.songCount,
      totalLikes: a.totalLikes,
      weekAgoTotalLikes: a.hasWeekAgoData ? a.weekAgoTotalLikes : null,
    }))

    artists.sort((a, b) => b.totalLikes - a.totalLikes)

    return NextResponse.json({ artists, total: artists.length })
  } catch (error: any) {
    console.error('获取歌手列表失败:', error)
    return NextResponse.json({ error: error.message || '获取失败' }, { status: 500 })
  }
}
