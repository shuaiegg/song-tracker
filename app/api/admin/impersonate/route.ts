import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify caller is authenticated and is an admin
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

    const { targetUserId } = await request.json()
    if (!targetUserId) {
      return NextResponse.json({ error: '缺少目标用户ID' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Get target user info
    const { data: targetUserData, error: targetUserError } = await supabaseAdmin.auth.admin.getUserById(targetUserId)
    if (targetUserError || !targetUserData.user) {
      return NextResponse.json({ error: '目标用户不存在' }, { status: 404 })
    }
    const targetUser = targetUserData.user

    // Prevent impersonating another admin
    const { data: targetAdminData } = await supabaseAdmin
      .from('admins')
      .select('role')
      .eq('user_id', targetUserId)
      .maybeSingle()

    if (targetAdminData) {
      return NextResponse.json({ error: '不能模拟管理员账号' }, { status: 403 })
    }

    // Store admin's refresh_token before switching
    const { data: { session: adminSession } } = await supabase.auth.getSession()
    if (!adminSession?.refresh_token) {
      return NextResponse.json({ error: '无法获取当前会话' }, { status: 500 })
    }

    // Generate magic link for target user
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: targetUser.email!,
    })

    if (linkError || !linkData.properties?.hashed_token) {
      return NextResponse.json({ error: '生成登陆链接失败' }, { status: 500 })
    }

    const cookieStore = await cookies()

    // Save admin refresh token in HTTP-only cookie
    cookieStore.set('imp_admin_rt', adminSession.refresh_token, {
      httpOnly: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 2, // 2 hours
    })

    // Save impersonation info for banner persistence
    cookieStore.set('is_impersonating', JSON.stringify({ userId: targetUser.id, email: targetUser.email }), {
      httpOnly: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 2,
    })

    return NextResponse.json({
      hashedToken: linkData.properties.hashed_token,
      targetUser: { id: targetUser.id, email: targetUser.email },
    })
  } catch (error: any) {
    console.error('Impersonate error:', error)
    return NextResponse.json({ error: error.message || '操作失败' }, { status: 500 })
  }
}
