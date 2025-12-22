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
    const { 
      song_id, 
      title, 
      artist, 
      album, 
      cover_url, 
      rank, 
      likes, 
      favorites, 
      comments, 
      shares ,
    // ✨ 新增字段
      singers,
      lyricists,
      composers,
      producers,
      arrangers,
      mixing_engineers,
      recording_engineers,
      album_id,
      genres,

      // ✨ 负责人（用户级别）
      supervisor,
    } = body

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

      // add song's extended fields if provided
      const updateData: any = {};

      //only updated the unnull fields(merge not overwrite)
      // if(singers && singers.length > 0) {
      //   //get current singers
      //   const { data: currentSong } = await supabaseAdmin
      //     .from('songs')
      //     .select('singers')
      //     .eq('id', songUuid)
      //     .single()

      //   const currentSingers = currentSong?.singers || [];
      //   const mergedSingers = [...new Set([...currentSingers, ...singers])]
      //   updateData.singers = mergedSingers;
      // }

      //repeat for other array fields
      const arrayFields = [
        'lyricists', 'composers', 'producers', 'arrangers',
        'mixing_engineers', 'recording_engineers', 'genres'
      ]

      for (const field of arrayFields) {
        if(body[field] && body[field].length > 0) {
          const { data: currentSong } = await supabaseAdmin
            .from('songs')
            .select(field)
            .eq('id', songUuid)
            .single()

          // const currentValues = currentSong?.[field] || []
          const currentValues = (currentSong as Record<string, any>)?.[field] || [];
          const mergedValues = [...new Set([...currentValues, ...body[field]])]
          updateData[field] = mergedValues;
        }
      }

    //update album_id if provided
    if(album_id && album_id.trim()) {
      updateData.album_id = album_id.trim();
    }

    //if got updated, then update
    if (Object.keys(updateData).length > 0) {
      await supabaseAdmin
        .from('songs')
        .update(updateData)
        .eq('id', songUuid)
    }

    } else {
      // 创建新歌曲
      
      const insertData: any = {
        song_id,
        title,
        artist,
        album: album || '未知专辑',
        cover_url: cover_url || null,
        rank: rank || 'C',
      }

      // ✨ 添加扩展字段（清理空数组）
      if (singers && singers.length > 0) insertData.singers = singers
      if (lyricists && lyricists.length > 0) insertData.lyricists = lyricists
      if (composers && composers.length > 0) insertData.composers = composers
      if (producers && producers.length > 0) insertData.producers = producers
      if (arrangers && arrangers.length > 0) insertData.arrangers = arrangers
      if (mixing_engineers && mixing_engineers.length > 0) insertData.mixing_engineers = mixing_engineers
      if (recording_engineers && recording_engineers.length > 0) insertData.recording_engineers = recording_engineers
      if (album_id && album_id.trim()) insertData.album_id = album_id.trim()
      if (genres && genres.length > 0) insertData.genres = genres

      const { data: newSong, error: insertError } = await supabaseAdmin
        .from('songs')
        .insert(insertData)
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
    const relationData: any ={
      user_id: user.id,
      song_id: songUuid,
    }

    // ✨ 添加负责人字段
    if (supervisor && supervisor.trim()) {
      relationData.supervisor = supervisor.trim()
    }

    const { error: relationError } = await supabaseAdmin
      .from('user_song_relations')
      .insert(relationData)

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