// src/app/api/admin/trigger-fetch/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
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
      .single()

    if (!adminData) {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    const body = await request.json()
    const { rank } = body

    if (!['A', 'B', 'C'].includes(rank)) {
      return NextResponse.json({ error: '无效的 Rank' }, { status: 400 })
    }

    // 调用 Supabase Edge Function
    const functionName = `fetch-rank-${rank.toLowerCase()}`
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    const response = await fetch(
      `${supabaseUrl}/functions/v1/${functionName}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
      }
    )

    const data = await response.json()

    return NextResponse.json({
      success: true,
      data,
    })

  } catch (error) {
    console.error('Trigger fetch error:', error)
    return NextResponse.json(
      { error: '触发失败' },
      { status: 500 }
    )
  }
}