// src/app/api/songs/update-rank/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request) {
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
    const { song_id, rank } = body

    if (!song_id || !rank) {
      return NextResponse.json(
        { error: '缺少必填参数' },
        { status: 400 }
      )
    }

    if (!['A', 'B', 'C'].includes(rank)) {
      return NextResponse.json(
        { error: '无效的 Rank 值' },
        { status: 400 }
      )
    }

    console.log('Updating rank:', { song_id, rank, user_id: user.id })

    // 验证用户是否有权限修改（必须是追踪该歌曲的用户或管理员）
    const { data: relation } = await supabase
      .from('user_song_relations')
      .select('id')
      .eq('user_id', user.id)
      .eq('song_id', song_id)
      .maybeSingle()

    if (!relation) {
      // 检查是否是管理员
      const { data: adminData } = await supabase
        .from('admins')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!adminData) {
        return NextResponse.json(
          { error: '无权限修改此歌曲' },
          { status: 403 }
        )
      }
    }

    // 使用 admin 客户端更新
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

    const { error: updateError } = await supabaseAdmin
      .from('songs')
      .update({ rank })
      .eq('id', song_id)

    if (updateError) {
      console.error('Error updating rank:', updateError)
      return NextResponse.json(
        { error: '更新失败: ' + updateError.message },
        { status: 500 }
      )
    }

    console.log('Rank updated successfully')

    return NextResponse.json({
      success: true,
      message: '更新成功',
    })

  } catch (error) {
    console.error('Error in update rank API:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}