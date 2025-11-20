// src/app/api/admin/users/route.ts
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

    // 获取所有用户
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers()

    if (usersError) {
      throw new Error(`获取用户失败: ${usersError.message}`)
    }

    // 获取每个用户的歌曲数量
    const usersWithStats = await Promise.all(
      users.users.map(async (u) => {
        const { count } = await supabaseAdmin
          .from('user_song_relations')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', u.id)

        const { data: adminInfo } = await supabaseAdmin
          .from('admins')
          .select('role')
          .eq('user_id', u.id)
          .maybeSingle()

        return {
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          song_count: count || 0,
          is_admin: !!adminInfo,
          admin_role: adminInfo?.role || null,
        }
      })
    )

    return NextResponse.json({
      users: usersWithStats,
      total: users.users.length,
    })

  } catch (error: any) {
    console.error('Get users error:', error)
    return NextResponse.json(
      { error: error.message || '获取用户失败' },
      { status: 500 }
    )
  }
}