// src/app/api/songs/batch-upload/route.ts

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

interface UploadResult {
  total: number
  success: number
  skipped: number
  failed: number
  details: {
    success: Array<{ row: number; title: string; song_id: string }>
    skipped: Array<{ row: number; title: string; reason: string }>
    failed: Array<{ row: number; song_id: string; error: string }>
  }
}

export async function POST(request: Request) {
  try {
    // 1. 验证用户身份
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    
    // 2. 解析请求体
    const { songs } = await request.json()
    
    if (!Array.isArray(songs) || songs.length === 0) {
      return NextResponse.json(
        { error: '无效的数据格式' },
        { status: 400 }
      )
    }
    
    // 3. 限制数量
    if (songs.length > 500) {
      return NextResponse.json(
        { error: '单次最多上传 500 首歌曲' },
        { status: 400 }
      )
    }
    
    // 4. 使用 admin 客户端
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // 5. 初始化结果
    const result: UploadResult = {
      total: songs.length,
      success: 0,
      skipped: 0,
      failed: 0,
      details: {
        success: [],
        skipped: [],
        failed: [],
      },
    }
    
    // 6. 逐个处理歌曲
    for (let i = 0; i < songs.length; i++) {
      const songData = songs[i]
      const rowNum = i + 2 // Excel/CSV 中的行号（从2开始，因为第1行是表头）
      
      try {
        // 验证必填字段
        if (!songData.song_id || !songData.rank) {
          result.failed++
          result.details.failed.push({
            row: rowNum,
            song_id: songData.song_id || '未知',
            error: '缺少必填字段（歌曲ID或追踪频率）',
          })
          continue
        }
        
        // 检查歌曲是否已存在
        const { data: existingSong } = await supabaseAdmin
          .from('songs')
          .select('id, title')
          .eq('song_id', songData.song_id)
          .maybeSingle()
        
        let songUuid: string
        let songTitle: string
        
        if (existingSong) {
          // 歌曲已存在
          songUuid = existingSong.id
          songTitle = existingSong.title
          
          // 检查用户是否已追踪
          const { data: relation } = await supabaseAdmin
            .from('user_song_relations')
            .select('id, supervisor')
            .eq('user_id', user.id)
            .eq('song_id', songUuid)
            .maybeSingle()
          
          if (relation) {
            // 用户已追踪，更新信息
            // 更新歌曲扩展字段（合并数组）
            await updateSongExtendedFields(supabaseAdmin, songUuid, songData)
            
            // 更新负责人（如果提供）
            if (songData.supervisor && songData.supervisor.trim()) {
              await supabaseAdmin
                .from('user_song_relations')
                .update({ supervisor: songData.supervisor.trim() })
                .eq('id', relation.id)
            }
            
            result.skipped++
            result.details.skipped.push({
              row: rowNum,
              title: songTitle,
              reason: '已追踪，已更新扩展信息',
            })
          } else {
            // 用户未追踪，添加关联
            await updateSongExtendedFields(supabaseAdmin, songUuid, songData)
            
            const relationData: any = {
              user_id: user.id,
              song_id: songUuid,
            }
            
            if (songData.supervisor && songData.supervisor.trim()) {
              relationData.supervisor = songData.supervisor.trim()
            }
            
            await supabaseAdmin
              .from('user_song_relations')
              .insert(relationData)
            
            result.success++
            result.details.success.push({
              row: rowNum,
              title: songTitle,
              song_id: songData.song_id,
            })
          }
        } else {
          // 创建新歌曲
          if (!songData.title || !songData.artist) {
            result.failed++
            result.details.failed.push({
              row: rowNum,
              song_id: songData.song_id,
              error: '新歌曲必须提供歌名和歌手',
            })
            continue
          }
          
          const insertData: any = {
            song_id: songData.song_id,
            title: songData.title,
            artist: songData.artist,
            album: songData.album || '',
            rank: songData.rank.toUpperCase(),
          }
          
          // 添加扩展字段
        //   const arrayFields = [
        //     'singers', 'lyricists', 'composers', 'producers',
        //     'arrangers', 'mixing_engineers', 'recording_engineers', 'genres'
        //   ]
        const arrayFields = [
            'lyricists', 'composers', 'producers',
            'mixing_engineers', 'recording_engineers', 'genres'
          ]
          
          arrayFields.forEach(field => {
            if (songData[field] && songData[field].length > 0) {
              insertData[field] = songData[field]
            }
          })
          
          if (songData.album_id) insertData.album_id = songData.album_id
          
          const { data: newSong, error: insertError } = await supabaseAdmin
            .from('songs')
            .insert(insertData)
            .select('id')
            .single()
          
          if (insertError) throw insertError
          
          songUuid = newSong.id
          songTitle = songData.title
          
          // 创建用户关联
          const relationData: any = {
            user_id: user.id,
            song_id: songUuid,
          }
          
          if (songData.supervisor && songData.supervisor.trim()) {
            relationData.supervisor = songData.supervisor.trim()
          }
          
          await supabaseAdmin
            .from('user_song_relations')
            .insert(relationData)
          
          result.success++
          result.details.success.push({
            row: rowNum,
            title: songTitle,
            song_id: songData.song_id,
          })
        }
        
      } catch (error: any) {
        result.failed++
        result.details.failed.push({
          row: rowNum,
          song_id: songData.song_id || '未知',
          error: error.message || '处理失败',
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      result,
    })
    
  } catch (error: any) {
    console.error('批量上传失败:', error)
    return NextResponse.json(
      { error: error.message || '上传失败' },
      { status: 500 }
    )
  }
}

// 更新歌曲扩展字段（合并数组）
async function updateSongExtendedFields(
  supabaseAdmin: any,
  songId: string,
  newData: any
) {
  const arrayFields = [
    'singers', 'lyricists', 'composers', 'producers',
    'arrangers', 'mixing_engineers', 'recording_engineers', 'genres'
  ]
  
  // 获取现有数据
  const { data: currentSong } = await supabaseAdmin
    .from('songs')
    .select(arrayFields.join(','))
    .eq('id', songId)
    .single()
  
  if (!currentSong) return
  
  const updateData: any = {}
  
  // 合并数组字段
  arrayFields.forEach(field => {
    if (newData[field] && newData[field].length > 0) {
      const currentValues = currentSong[field] || []
      const newValues = newData[field]
      const merged = [...new Set([...currentValues, ...newValues])]
      updateData[field] = merged
    }
  })
  
  // 更新专辑ID（如果提供）
  if (newData.album_id && newData.album_id.trim()) {
    updateData.album_id = newData.album_id.trim()
  }
  
  // 如果有更新内容，执行更新
  if (Object.keys(updateData).length > 0) {
    await supabaseAdmin
      .from('songs')
      .update(updateData)
      .eq('id', songId)
  }
}