// src/app/api/songs/my-songs/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
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

    // 查询用户关注的歌曲
    const { data: relations, error: relationsError } = await supabase
      .from('user_song_relations')
      .select(`
        id,
        created_at,
        song_id,
        songs (
          id,
          song_id,
          title,
          artist,
          album,
          cover_url,
          rank,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (relationsError) {
      console.error('Error fetching user songs:', relationsError)
      return NextResponse.json(
        { error: '获取歌曲列表失败' },
        { status: 500 }
      )
    }

    // 提取歌曲数据
    const songs = relations
      .map(r => r.songs)
      .filter(Boolean)

    // 获取每首歌的最新统计数据
    const songsWithStats = await Promise.all(
      songs.map(async (song: any) => {
        const { data: latestStats } = await supabase
          .from('song_stats')
          .select('likes, favorites, comments, shares, fetched_at')
          .eq('song_id', song.id)
          .order('fetched_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        return {
          ...song,
          latest_stats: latestStats || {
            likes: 0,
            favorites: 0,
            comments: 0,
            shares: 0,
            fetched_at: null,
          }
        }
      })
    )

    return NextResponse.json({
      songs: songsWithStats,
      total: songsWithStats.length,
    })

  } catch (error) {
    console.error('Error in my-songs API:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}