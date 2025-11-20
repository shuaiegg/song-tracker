// src/app/api/admin/all-songs/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
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
      .select('*')
      .order('created_at', { ascending: false })

    if (songsError) {
      throw new Error(`获取歌曲失败: ${songsError.message}`)
    }

    // 获取每首歌的追踪用户数和最新统计
    const songsWithStats = await Promise.all(
      songs.map(async (song) => {
        // 追踪用户数
        const { count: userCount } = await supabaseAdmin
          .from('user_song_relations')
          .select('*', { count: 'exact', head: true })
          .eq('song_id', song.id)

        // 最新统计
        const { data: latestStats } = await supabaseAdmin
          .from('song_stats')
          .select('likes, favorites, comments, shares, fetched_at')
          .eq('song_id', song.id)
          .order('fetched_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        return {
          ...song,
          user_count: userCount || 0,
          latest_stats: latestStats,
        }
      })
    )

    return NextResponse.json({
      songs: songsWithStats,
      total: songs.length,
    })

  } catch (error: any) {
    console.error('Get all songs error:', error)
    return NextResponse.json(
      { error: error.message || '获取歌曲失败' },
      { status: 500 }
    )
  }
}