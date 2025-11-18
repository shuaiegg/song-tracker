// src/app/api/songs/untrack/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function DELETE(request: Request) {
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

    // 解析请求体
    const body = await request.json()
    const { song_id } = body

    if (!song_id) {
      return NextResponse.json(
        { error: '缺少歌曲 ID' },
        { status: 400 }
      )
    }

    console.log('Untracking song:', { song_id, user_id: user.id })

    // 使用 admin 客户端删除关联
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

    // 删除用户与歌曲的关联
    const { error: deleteError } = await supabaseAdmin
      .from('user_song_relations')
      .delete()
      .eq('user_id', user.id)
      .eq('song_id', song_id)

    if (deleteError) {
      console.error('Error deleting relation:', deleteError)
      return NextResponse.json(
        { error: '取消追踪失败: ' + deleteError.message },
        { status: 500 }
      )
    }

    // 检查是否还有其他用户在追踪这首歌
    const { data: otherRelations, error: checkError } = await supabaseAdmin
      .from('user_song_relations')
      .select('id')
      .eq('song_id', song_id)
      .limit(1)

    if (checkError) {
      console.error('Error checking other relations:', checkError)
    }

    // 如果没有其他用户追踪，可以选择删除歌曲数据（可选）
    // 这里我们保留歌曲数据，以便其他用户可能再次添加
    if (!otherRelations || otherRelations.length === 0) {
      console.log('No other users tracking this song, but keeping song data')
    }

    console.log('Song untracked successfully')

    return NextResponse.json({
      success: true,
      message: '取消追踪成功',
    })

  } catch (error) {
    console.error('Error in untrack song API:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}