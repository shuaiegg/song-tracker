// src/app/api/songs/add/route.ts
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    // 使用普通客户端验证用户身份
    const supabase = await createServerClient()
    
    // 获取当前用户
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      )
    }

    // 解析请求体
    const body = await request.json()
    const { song_id, title, artist, album, cover_url, rank, likes, favorites, comments, shares } = body

    // 验证必填字段
    if (!song_id || !title || !artist) {
      return NextResponse.json(
        { error: '缺少必填字段' },
        { status: 400 }
      )
    }

    console.log('Adding song:', { song_id, title, artist, user_id: user.id })

    // 使用 service_role 客户端进行数据库操作（绕过 RLS）
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // 1. 检查歌曲是否已存在
    const { data: existingSong, error: checkError } = await supabaseAdmin
      .from('songs')
      .select('id')
      .eq('song_id', song_id)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking existing song:', checkError)
      return NextResponse.json(
        { error: '数据库查询失败' },
        { status: 500 }
      )
    }

    let songUuid: string

    if (existingSong) {
      // 歌曲已存在
      songUuid = existingSong.id
      console.log('Song already exists:', songUuid)

      // 检查用户是否已关注该歌曲
      const { data: existingRelation, error: relationCheckError } = await supabaseAdmin
        .from('user_song_relations')
        .select('id')
        .eq('user_id', user.id)
        .eq('song_id', songUuid)
        .maybeSingle()

      if (relationCheckError) {
        console.error('Error checking relation:', relationCheckError)
        return NextResponse.json(
          { error: '检查关注状态失败' },
          { status: 500 }
        )
      }

      if (existingRelation) {
        return NextResponse.json(
          { error: '您已经添加过这首歌曲了' },
          { status: 409 }
        )
      }

    } else {
      // 创建新歌曲
      const { data: newSong, error: insertError } = await supabaseAdmin
        .from('songs')
        .insert({
          song_id,
          title,
          artist,
          album: album || '未知专辑',
          cover_url: cover_url || null,
          rank: rank || 'C',
        })
        .select('id')
        .single()

      if (insertError) {
        console.error('Error inserting song:', insertError)
        return NextResponse.json(
          { error: '保存歌曲失败: ' + insertError.message },
          { status: 500 }
        )
      }

      songUuid = newSong.id
      console.log('New song created:', songUuid)

      // 保存初始统计数据
      const { error: statsError } = await supabaseAdmin
        .from('song_stats')
        .insert({
          song_id: songUuid,
          likes: likes || 0,
          favorites: favorites || 0,
          comments: comments || 0,
          shares: shares || 0,
        })

      if (statsError) {
        console.error('Error inserting stats:', statsError)
        // 不阻断流程，只记录错误
      } else {
        console.log('Initial stats saved')
      }
    }

    // 2. 创建用户关联
    const { error: relationError } = await supabaseAdmin
      .from('user_song_relations')
      .insert({
        user_id: user.id,
        song_id: songUuid,
      })

    if (relationError) {
      console.error('Error creating relation:', relationError)
      return NextResponse.json(
        { error: '创建关注关系失败: ' + relationError.message },
        { status: 500 }
      )
    }

    console.log('User relation created successfully')

    return NextResponse.json({
      success: true,
      song_id: songUuid,
      message: '添加成功',
    })

  } catch (error) {
    console.error('Error in add song API:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}