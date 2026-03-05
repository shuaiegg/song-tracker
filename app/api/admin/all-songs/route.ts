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

    // 批量获取用户数和最新统计（避免 N+1 查询）
    const songIds = songs.map(s => s.id)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const [{ data: allRelations }, { data: allStats }] = await Promise.all([
      supabaseAdmin.from('user_song_relations').select('song_id, rank').in('song_id', songIds),
      supabaseAdmin
        .from('song_stats')
        .select('song_id, likes, favorites, comments, shares, fetched_at')
        .in('song_id', songIds)
        .gte('fetched_at', yesterday)
        .order('fetched_at', { ascending: false }),
    ])

    // 每首歌的用户数 & rank（取第一个关联的 rank）
    const userCountMap = new Map<string, number>()
    const rankMap = new Map<string, string>()
    for (const rel of allRelations || []) {
      userCountMap.set(rel.song_id, (userCountMap.get(rel.song_id) || 0) + 1)
      if (!rankMap.has(rel.song_id)) rankMap.set(rel.song_id, rel.rank)
    }

    // 每首歌最新一条统计（allStats 已按 fetched_at desc 排序，取首次出现）
    type StatRow = NonNullable<typeof allStats>[number]
    const latestStatsMap = new Map<string, StatRow>()
    for (const stat of allStats || []) {
      if (!latestStatsMap.has(stat.song_id)) latestStatsMap.set(stat.song_id, stat)
    }

    const songsWithStats = songs.map(song => ({
      ...song,
      rank: rankMap.get(song.id) ?? null,
      user_count: userCountMap.get(song.id) || 0,
      latest_stats: latestStatsMap.get(song.id) ?? null,
    }))

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