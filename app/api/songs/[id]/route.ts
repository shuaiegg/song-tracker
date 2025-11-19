// src/app/api/songs/[id]/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    // 获取当前用户
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    // 获取歌曲基本信息
    const { data: song, error: songError } = await supabase
      .from('songs')
      .select('*')
      .eq('id', id)
      .single()

    if (songError || !song) {
      return NextResponse.json({ error: '歌曲不存在' }, { status: 404 })
    }

    // 验证用户权限
    const { data: relation } = await supabase
      .from('user_song_relations')
      .select('id')
      .eq('user_id', user.id)
      .eq('song_id', id)
      .maybeSingle()

    const { data: adminData } = await supabase
      .from('admins')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!relation && !adminData) {
      return NextResponse.json({ error: '无权限访问' }, { status: 403 })
    }

    // 获取历史统计数据（最近30天）
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: stats, error: statsError } = await supabase
      .from('song_stats')
      .select('*')
      .eq('song_id', id)
      .gte('fetched_at', thirtyDaysAgo.toISOString())
      .order('fetched_at', { ascending: true })

    if (statsError) {
      console.error('Stats error:', statsError)
    }

    // 获取每日汇总数据
    const { data: dailyStats, error: dailyError } = await supabase
      .from('daily_stats')
      .select('*')
      .eq('song_id', id)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: true })

    if (dailyError) {
      console.error('Daily stats error:', dailyError)
    }

    return NextResponse.json({
      song,
      stats: stats || [],
      dailyStats: dailyStats || [],
    })

  } catch (error) {
    console.error('Error in song detail API:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}